"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// API key pool - automatically rotates through all available keys
const API_KEYS = [
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
    process.env.GEMINI_API_KEY_11,
    process.env.GEMINI_API_KEY_12,
    process.env.GEMINI_API_KEY_13,
    process.env.GEMINI_API_KEY_14,
    process.env.GEMINI_API_KEY_15,
].filter(Boolean) as string[];

if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys found. Set GOOGLE_API_KEY in your .env.local');
}

console.log(`[Key Pool] Loaded ${API_KEYS.length} API key(s) for rotation.`);

export interface VideoEvent {
    isDangerous: boolean;
    timestamp: string;
    description: string;
}

const PROMPT = `Analyze this frame and determine if any of these specific dangerous situations are occurring:

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

Return a JSON object in this exact format:

{
    "events": [
        {
            "timestamp": "mm:ss",
            "description": "Brief description of what's happening in this frame",
            "isDangerous": true/false
        }
    ]
}`;

function extractJSON(text: string): string {
    const codeBlockMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (codeBlockMatch) return codeBlockMatch[1];
    const jsonMatch = text.match(/\{[^]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return text;
}

// Keep track of the active key globally so we don't restart from key 0 every frame
let currentKeyIndex = 0;

export async function detectEvents(base64Image: string): Promise<{ events: VideoEvent[], rawResponse: string }> {
    console.log('Starting frame analysis...');

    if (!base64Image) throw new Error("No image data provided");

    let base64Data = base64Image;
    if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
    }
    if (!base64Data) throw new Error("Invalid image data format");

    const imagePart = {
        inlineData: { data: base64Data, mimeType: 'image/jpeg' },
    };

    let lastError: unknown;

    // Try each key in order starting from our current active key
    for (let attempts = 0; attempts < API_KEYS.length; attempts++) {
        // Pick the current key, then IMMEDIATELY advance the pointer for the NEXT request or loop iteration
        const activeIndex = currentKeyIndex;
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

        const genAI = new GoogleGenerativeAI(API_KEYS[activeIndex]);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log(`[Key Rotation] Trying key ${activeIndex + 1}/${API_KEYS.length}...`);

        try {
            const result = await model.generateContent([PROMPT, imagePart]);
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

    // All keys hit rate limit - wait 15s then try key 1 one final time
    console.warn('[Key Pool] All keys exhausted. Waiting 15s for quota reset...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    try {
        const genAI = new GoogleGenerativeAI(API_KEYS[0]);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([PROMPT, imagePart]);
        const text = result.response.text();
        const parsed = JSON.parse(extractJSON(text));
        return { events: parsed.events || [], rawResponse: text };
    } catch {
        console.error('[Key Pool] Final retry also failed. Skipping this frame.');
        throw lastError;
    }
}