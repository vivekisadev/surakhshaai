"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_KEYS = [
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
].filter(Boolean) as string[];

const HF_API_KEY = process.env.HF_API_KEY;
const HF_BASE = "https://api-inference.huggingface.co/models";

// ─────────────────────────────────────────────────────────────────────────────
// FREE HF MODELS — HOSPITAL SECURITY SPECIALIZATIONS
//
// Model                                    Task
// ──────────────────────────────────────────────────────────────────────────
// EdBianchi/vit-fire-detection             Fire & smoke detection
// dima806/facial_emotions_image_detection  Anger / aggression / fear
// Falconsai/nsfw_image_classification      Sexual harassment / NSFW content
// facebook/detr-resnet-50                  Person counting / overcrowding
// ──────────────────────────────────────────────────────────────────────────
// GEMINI is called ONLY when:
//   • None of the above models return high-confidence (>0.6) detections, OR
//   • The detected situation requires complex scene reasoning
// ─────────────────────────────────────────────────────────────────────────────

const HF_MODELS = {
    fire: `${HF_BASE}/EdBianchi/vit-fire-detection`,
    emotion: `${HF_BASE}/dima806/facial_emotions_image_detection`,
    harassment: `${HF_BASE}/Falconsai/nsfw_image_classification`,
    crowd: `${HF_BASE}/facebook/detr-resnet-50`,
};

// Confidence threshold — if any HF model scores above this, Gemini is skipped
const HF_CONFIDENCE_THRESHOLD = 0.60;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface VideoEvent {
    timestamp: string;
    description: string;
    isDangerous: boolean;
    detectedBy: "HuggingFace" | "Gemini";
    incidentType?: string;
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

interface HFResult {
    label: string;
    score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Call a single HF model with a base64 image
// ─────────────────────────────────────────────────────────────────────────────
async function callHFModel(modelUrl: string, base64Data: string): Promise<HFResult[] | null> {
    if (!HF_API_KEY) return null;

    try {
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/jpeg" });

        const res = await fetch(modelUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "image/jpeg",
            },
            body: blob,
            signal: AbortSignal.timeout(12000),
        });

        if (!res.ok) {
            if (res.status === 503) console.warn(`[HF] Model loading (503): ${modelUrl.split('/').slice(-1)[0]}`);
            return null;
        }

        return await res.json() as HFResult[];
    } catch (err) {
        console.warn(`[HF] Model call failed (${modelUrl.split('/').slice(-1)[0]}):`, (err as Error).message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HF ANALYSIS — Run all models in parallel, return detected events
// Returns null if no high-confidence detection found (→ triggers Gemini)
// ─────────────────────────────────────────────────────────────────────────────
async function runHuggingFaceAnalysis(
    base64Data: string,
    timestamp: string,
    poseKeypoints: PoseKeypoint[]
): Promise<VideoEvent[] | null> {
    if (!HF_API_KEY) return null;

    // Run all 4 models in parallel
    const [fireResult, emotionResult, harassmentResult, crowdResult] = await Promise.all([
        callHFModel(HF_MODELS.fire, base64Data),
        callHFModel(HF_MODELS.emotion, base64Data),
        callHFModel(HF_MODELS.harassment, base64Data),
        callHFModel(HF_MODELS.crowd, base64Data),
    ]);

    const detectedEvents: VideoEvent[] = [];

    // ── 1. FIRE DETECTION ───────────────────────────────────────────────────
    if (fireResult) {
        const fireClass = fireResult.find(r => r.label.toLowerCase().includes("fire"));
        if (fireClass && fireClass.score > HF_CONFIDENCE_THRESHOLD) {
            detectedEvents.push({
                timestamp,
                description: `🔥 Fire/smoke detected in hospital premises (${Math.round(fireClass.score * 100)}% confidence). Activate evacuation protocol immediately.`,
                isDangerous: true,
                detectedBy: "HuggingFace",
                incidentType: "Fire & Smoke",
            });
        }
    }

    // ── 2. AGGRESSION / EMOTION DETECTION ───────────────────────────────────
    if (emotionResult) {
        const aggressiveEmotions = ["angry", "disgust", "fear", "contempt"];
        const sorted = [...emotionResult].sort((a, b) => b.score - a.score);
        const top = sorted[0];
        if (top && aggressiveEmotions.some(e => top.label.toLowerCase().includes(e)) && top.score > HF_CONFIDENCE_THRESHOLD) {
            const isAngry = top.label.toLowerCase().includes("angry");
            detectedEvents.push({
                timestamp,
                description: `😡 ${isAngry ? "Aggressive" : "Distressed"} individual detected (emotion: ${top.label}, ${Math.round(top.score * 100)}% confidence). Possible threat to hospital staff.`,
                isDangerous: isAngry,
                detectedBy: "HuggingFace",
                incidentType: isAngry ? "Patient Aggression" : "Distress",
            });
        }
    }

    // ── 3. SEXUAL HARASSMENT / NSFW DETECTION ───────────────────────────────
    // Model: Falconsai/nsfw_image_classification
    // Returns labels: ["nsfw", "normal"] or ["safe", "unsafe"]
    if (harassmentResult) {
        const nsfwClass = harassmentResult.find(r =>
            r.label.toLowerCase() === "nsfw" ||
            r.label.toLowerCase() === "unsafe" ||
            r.label.toLowerCase().includes("explicit")
        );
        if (nsfwClass && nsfwClass.score > 0.55) {
            detectedEvents.push({
                timestamp,
                description: `🚨 SEXUAL HARASSMENT ALERT: Inappropriate physical conduct or sexual harassment detected in hospital area (${Math.round(nsfwClass.score * 100)}% confidence). Immediate security response required.`,
                isDangerous: true,
                detectedBy: "HuggingFace",
                incidentType: "Sexual Harassment",
            });
        }
    }

    // ── 4. CROWD / OVERCROWDING (from person count in DETR result) ───────────
    if (crowdResult && Array.isArray(crowdResult)) {
        // DETR returns object detections — count persons
        const persons = crowdResult.filter((r: any) => r.label?.toLowerCase() === "person");
        if (persons.length >= 6) {
            detectedEvents.push({
                timestamp,
                description: `👥 Overcrowding detected: ${persons.length} people gathered in a single area. Risk of mob violence or emergency situation.`,
                isDangerous: persons.length >= 10,
                detectedBy: "HuggingFace",
                incidentType: "Overcrowding",
            });
        }
    }

    // ── 5. FALL DETECTION from TF pose data (arms-raised / low position) ────
    if (poseKeypoints.length > 0) {
        const visible = poseKeypoints.filter(kp => (kp.score || 0) > 0.3);
        if (visible.length > 0) {
            const avgY = visible.reduce((s, kp) => s + kp.y, 0) / visible.length;
            const hasHead = visible.some(kp => kp.name?.includes("nose") || kp.name?.includes("eye"));
            const hasShoulders = visible.some(kp => kp.name?.includes("shoulder"));

            if (avgY > 340 && hasShoulders && !hasHead) {
                detectedEvents.push({
                    timestamp,
                    description: "⚠️ PATIENT FALL DETECTED: Person appears to be on the ground (head not visible, body position very low). Immediate nursing response needed.",
                    isDangerous: true,
                    detectedBy: "HuggingFace",
                    incidentType: "Patient Fall",
                });
            }
        }
    }

    // If we found confirmed incidents, return them and skip Gemini
    if (detectedEvents.length > 0) {
        console.log(`[HF] ✅ ${detectedEvents.length} incident(s) detected. Gemini call SKIPPED.`);
        return detectedEvents;
    }

    console.log("[HF] No high-confidence detections. Will forward to Gemini for scene analysis.");
    return null; // ← triggers Gemini fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI PROMPT (hospital-specialized, fallback only)
// ─────────────────────────────────────────────────────────────────────────────
const HOSPITAL_PROMPT = `You are a hospital security AI. Analyze this CCTV frame for ONLY the following hospital-specific dangerous situations. 
Do NOT generate generic descriptions. Only flag genuine threats.

Look for:
1. PATIENT SAFETY: Falls, patients lying on floor unattended, patients in distress
2. STAFF THREATS: Physical or verbal assault on doctors/nurses, threatening gestures toward staff
3. UNAUTHORIZED ACCESS: Persons in restricted medical areas (ICU, OT, pharmacy)
4. SUSPICIOUS ACTIVITY: Persons handling medications without authorization, strange packages
5. INFANT SAFETY: Anyone carrying a baby near exit points
6. HYGIENE VIOLATIONS: Staff without PPE in sterile areas
7. STAFF NEGLIGENCE: Staff clearly sleeping or completely unresponsive at duty post

If you don't see any clear dangerous situation, return an empty events array.
Return ONLY valid JSON (no markdown, no code blocks):

{
    "events": [
        {
            "timestamp": "00:00",
            "description": "Clear, specific description of what you see",
            "isDangerous": true
        }
    ]
}`;

let currentGeminiKeyIndex = 0;

async function callGemini(prompt: string, imagePart: any): Promise<{ events: VideoEvent[], rawResponse: string }> {
    if (GEMINI_KEYS.length === 0) {
        console.warn("[Gemini] No API keys configured.");
        return { events: [], rawResponse: "no_keys" };
    }

    let lastError: unknown;

    for (let i = 0; i < GEMINI_KEYS.length; i++) {
        const keyIndex = (currentGeminiKeyIndex + i) % GEMINI_KEYS.length;
        const genAI = new GoogleGenerativeAI(GEMINI_KEYS[keyIndex]);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        console.log(`[Gemini] Trying key ${keyIndex + 1}/${GEMINI_KEYS.length}...`);

        try {
            const result = await model.generateContent([prompt, imagePart]);
            currentGeminiKeyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
            const text = result.response.text();
            const jsonText = extractJSON(text);
            const parsed = JSON.parse(jsonText);

            // Tag Gemini events
            const events: VideoEvent[] = (parsed.events || []).map((e: any) => ({
                ...e,
                detectedBy: "Gemini" as const,
                incidentType: "Complex Scene Analysis",
            }));

            console.log(`[Gemini] ✅ Key ${keyIndex + 1} success. Found ${events.length} event(s).`);
            return { events, rawResponse: text };
        } catch (err: any) {
            lastError = err;
            console.warn(`[Gemini] Key ${keyIndex + 1} failed: ${err?.message?.split("\n")[0]}`);
        }
    }

    return { events: [], rawResponse: String(lastError) };
}

function extractJSON(text: string): string {
    const codeBlock = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (codeBlock) return codeBlock[1];
    const jsonMatch = text.match(/\{[^]*\}/);
    if (jsonMatch) return jsonMatch[0];
    return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: detectEvents — HF first, Gemini fallback
// ─────────────────────────────────────────────────────────────────────────────
export async function detectEvents(
    base64Image: string,
    transcript: string = "",
    tensorflowData?: TensorFlowData
): Promise<{ events: VideoEvent[], rawResponse: string }> {
    if (!base64Image) throw new Error("No image data provided");

    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    if (!base64Data) throw new Error("Invalid image data format");

    const timestamp = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const poseKeypoints = tensorflowData?.poseKeypoints ?? [];

    // ── STEP 1: Run HuggingFace models first (free, specialized) ────────────
    const hfEvents = await runHuggingFaceAnalysis(base64Data, timestamp, poseKeypoints);

    // If HF found something confident → return immediately, Gemini NOT called
    if (hfEvents !== null) {
        return { events: hfEvents, rawResponse: "hf_models" };
    }

    // ── STEP 2: HF found nothing → fall back to Gemini for scene reasoning ──
    console.log("[Gemini] 🔄 HF found nothing. Calling Gemini for complex analysis...");

    const imagePart = {
        inlineData: { data: base64Data, mimeType: "image/jpeg" },
    };

    // Build context from TF data and transcript
    let tfContext = "";
    if (tensorflowData) {
        const { faceDetected, faceConfidence, poseKeypoints: kps } = tensorflowData;
        if (faceDetected) {
            tfContext += `\nFace detected: ${faceConfidence ? Math.round(faceConfidence * 100) + "% confidence" : "yes"}.`;
        }
        if (kps?.length > 0) {
            const visible = kps.filter(kp => (kp.score || 0) > 0.3);
            const names = visible.map(kp => kp.name).filter(Boolean);
            const avgY = visible.reduce((s, kp) => s + kp.y, 0) / (visible.length || 1);
            tfContext += `\nPose: ${visible.length} keypoints (${names.join(", ")}).`;
            if (avgY > 300) tfContext += " Body position is very low — possible fall.";
        }
    }

    const fullPrompt = `${HOSPITAL_PROMPT}${tfContext ? `\n\nTF ML DATA:\n${tfContext}` : ""}${transcript ? `\n\nAUDIO: "${transcript}"` : ""}`;

    return callGemini(fullPrompt, imagePart);
}
