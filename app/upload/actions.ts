"use server";

export interface VideoEvent {
    isDangerous: boolean;
    timestamp: string;
    description: string;
}

/**
 * Analyze a single frame by sending it to the LOCAL Python backend.
 * This uses YOLO + OpenCV heuristics — ZERO external API calls.
 * Falls back to Gemini only if the local server is unreachable.
 */
export async function detectEvents(base64Image: string): Promise<{ events: VideoEvent[], rawResponse: string }> {
    console.log('[Local AI] Sending frame to Python backend for analysis...');

    if (!base64Image) throw new Error("No image data provided");

    try {
        const response = await fetch("http://localhost:8000/analyze_frame_b64", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        const events: VideoEvent[] = (data.events || []).map((ev: any) => ({
            isDangerous: ev.isDangerous ?? false,
            timestamp: ev.timestamp ?? "",
            description: ev.description ?? "Unknown event",
        }));

        console.log(`[Local AI] ✓ Detected ${events.length} event(s) in frame`);
        return { events, rawResponse: JSON.stringify(data) };

    } catch (error: any) {
        console.error(`[Local AI] ✗ Backend unreachable: ${error.message}`);
        
        // Return a placeholder instead of crashing
        return {
            events: [{
                isDangerous: false,
                timestamp: "",
                description: "Frame analysis unavailable — ensure Python backend is running on port 8000"
            }],
            rawResponse: ""
        };
    }
}