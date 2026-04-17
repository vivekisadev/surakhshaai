"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEYS = [
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
].filter(Boolean) as string[];

if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys found. Set GOOGLE_API_KEY in your .env.local');
}

export interface VideoEvent {
    timestamp: string;
    description: string;
    isDangerous: boolean;
}

export interface PoseKeypoint {
    x: number;
    y: number;
    score?: number;
    name?: string;
}

export interface TensorFlowData {
    poseKeypoints: PoseKeypoint[];
    faceDetected: boolean;
    faceConfidence?: number;
}

const BASE_PROMPT = `Analyze this frame and determine if any of these specific dangerous situations are occurring:

1. Medical Emergencies:
- Person unconscious or lying motionless
- Person clutching chest/showing signs of heart problems
- Seizures or convulsions
- Difficulty breathing or choking

2. Falls and Injuries:
- Person falling or about to fall
- Person on the ground after a fall
- Signs of injury or bleeding
- Limping or showing signs of physical trauma

3. Distress Signals:
- Person calling for help or showing distress
- Panic attacks or severe anxiety symptoms
- Signs of fainting or dizziness
- Headache or unease
- Signs of unconsciousness

4. Violence or Threats:
- Physical altercations
- Threatening behavior
- Weapons visible

5. Suspicious Activities:
- Shoplifting
- Vandalism
- Trespassing
`;

function extractJSON(text: string): string {
    const codeBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (codeBlockMatch) return codeBlockMatch[1];
    const jsonMatch = text.match(/\{[^]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return text;
}

// Keep track of the active key globally so we don't restart from key 0 every frame
let currentKeyIndex = 0;

export async function detectEvents(
    base64Image: string, 
    transcript: string = '',
    tensorflowData?: TensorFlowData
): Promise<{ events: VideoEvent[], rawResponse: string }> {
    console.log('Starting frame analysis with Gemini Vision...');
    
    if (!base64Image) {
        throw new Error("No image data provided");
    }

    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    if (!base64Data) throw new Error("Invalid image data format");

    const imagePart = {
        inlineData: { data: base64Data, mimeType: 'image/jpeg' },
    };

    let tensorflowContext = '';
    if (tensorflowData) {
        const { poseKeypoints, faceDetected, faceConfidence } = tensorflowData;
        
        if (faceDetected) {
            tensorflowContext += `\nFace Detection: A face was detected with ${faceConfidence ? Math.round(faceConfidence * 100) + '% confidence' : 'high confidence'}.`;
        } else {
            tensorflowContext += `\nFace Detection: No face is clearly visible (person may be turned away, fallen, or obscured).`;
        }
        
        if (poseKeypoints && poseKeypoints.length > 0) {
            const visibleKeypoints = poseKeypoints.filter(kp => (kp.score || 0) > 0.3);
            const keypointNames = visibleKeypoints.map(kp => kp.name).filter(Boolean);
            tensorflowContext += `\nPose Detection: ${visibleKeypoints.length} body keypoints detected (${keypointNames.join(', ')}).`;
            
            const avgY = visibleKeypoints.reduce((sum, kp) => sum + kp.y, 0) / visibleKeypoints.length;
            if (avgY > 300) { 
                tensorflowContext += ` The person's body position appears LOW in the frame, which may indicate lying down, fallen, or slumped position.`;
            }
            
            const hasHead = keypointNames.some(n => n?.includes('nose') || n?.includes('eye') || n?.includes('ear'));
            const hasShoulders = keypointNames.some(n => n?.includes('shoulder'));
            if (!hasHead && hasShoulders) {
                tensorflowContext += ` Head/face keypoints are NOT visible but body is detected - person may be face-down or head is obscured.`;
            }
        }
    }

    const prompt = `${BASE_PROMPT}${tensorflowContext ? `\nTENSORFLOW ML DETECTION DATA (use this to enhance your analysis):\n${tensorflowContext}\n` : ''}${transcript ? `\nAUDIO TRANSCRIPT from the scene: "${transcript}"\n` : ''}\nReturn ONLY a JSON object in this exact format (no markdown, no code blocks):\n\n{\n    "events": [\n        {\n            "timestamp": "00:00",\n            "description": "Brief description of what's happening in this frame",\n            "isDangerous": true/false\n        }\n    ]\n}`;

    let lastError: unknown;

    // Try each key in order starting from our current active key
    for (let attempts = 0; attempts < API_KEYS.length; attempts++) {
        // Pick the current key, then IMMEDIATELY advance the pointer for the NEXT request or loop iteration
        const activeIndex = currentKeyIndex;
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        
        const genAI = new GoogleGenerativeAI(API_KEYS[activeIndex]);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log(`[Key Rotation] Trying key ${activeIndex + 1}/${API_KEYS.length}...`);

        try {
            const result = await model.generateContent([prompt, imagePart]);
            const text = result.response.text();
            console.log(`[Key ${activeIndex + 1}] ✓ Success (Load balancing: next frame will use key ${currentKeyIndex + 1})`);

            const parsed = JSON.parse(extractJSON(text));
            return { events: parsed.events || [], rawResponse: text };

        } catch (error: any) {
            lastError = error;
            
            // Whether it's a 429 Rate Limit, a 503 Server Overload, or an Invalid API Key
            // we will simply log it and instantly try the next key in the pool!
            console.warn(`[Key ${activeIndex + 1}] ✗ API call failed (${error?.message?.split('\n')[0] || 'Unknown error'}). Switching to next key instantly...`);
            continue; 
        }
    }

    console.warn('[Key Pool] All keys exhausted. Waiting 15s for quota reset...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    try {
        const genAI = new GoogleGenerativeAI(API_KEYS[0]);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const parsed = JSON.parse(extractJSON(text));
        return { events: parsed.events || [], rawResponse: text };
    } catch {
        console.error('[Key Pool] Final retry also failed. Skipping this frame.');
        return { events: [], rawResponse: String(lastError) };
    }
}
