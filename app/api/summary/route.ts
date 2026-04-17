import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Key rotation pool – same pattern used in realtimeStreamPage/actions.ts
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

let currentKeyIndex = 0;

export async function POST(request: Request) {
  if (API_KEYS.length === 0) {
    return NextResponse.json(
      { error: 'No Gemini API keys configured. Set GOOGLE_API_KEY in your .env.local' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const keyMoments = body?.keyMoments

    // Validate input
    if (!keyMoments || !Array.isArray(keyMoments) || keyMoments.length === 0) {
      return NextResponse.json(
        { error: 'No key moments provided for summary generation.' },
        { status: 400 }
      )
    }

    // Format the key moments into a readable string
    const momentsText = keyMoments.map((moment: any) => 
      `Video: ${moment.videoName}\nTimestamp: ${moment.timestamp}\nDescription: ${moment.description}\nDangerous: ${moment.isDangerous ? 'Yes' : 'No'}\n`
    ).join('\n')

    const prompt = `Here are the key moments from video analysis sessions. Please provide a concise summary of the important events and any safety concerns:\n\n${momentsText}\n\nPlease format your response in this way:\n1. Overall Summary (2-3 sentences)\n2. Key Safety Concerns (if any)\n3. Notable Patterns (if any)`;

    let lastError: unknown;

    // Try each key in rotation (same pattern as realtimeStreamPage)
    for (let attempts = 0; attempts < API_KEYS.length; attempts++) {
      const activeIndex = currentKeyIndex;
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

      const genAI = new GoogleGenerativeAI(API_KEYS[activeIndex]);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are an expert at analyzing video safety data. Provide concise, insightful summaries of video analysis data, focusing on safety patterns and potential concerns."
      });

      console.log(`[Summary API - Key Rotation] Trying key ${activeIndex + 1}/${API_KEYS.length}...`);

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        });

        const text = result.response.text();
        console.log(`[Summary API - Key ${activeIndex + 1}] ✓ Success`);

        return NextResponse.json({ 
          summary: text || 'Unable to generate summary.' 
        })
      } catch (error: any) {
        lastError = error;
        console.warn(`[Summary API - Key ${activeIndex + 1}] ✗ Failed (${error?.message?.split('\n')[0] || 'Unknown error'}). Trying next key...`);
        continue;
      }
    }

    // All keys exhausted – one final retry after a short wait
    console.warn('[Summary API] All keys exhausted. Waiting 10s for quota reset...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      const genAI = new GoogleGenerativeAI(API_KEYS[0]);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are an expert at analyzing video safety data. Provide concise, insightful summaries of video analysis data, focusing on safety patterns and potential concerns."
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      });
      const text = result.response.text();
      return NextResponse.json({ summary: text || 'Unable to generate summary.' })
    } catch {
      console.error('[Summary API] Final retry also failed.');
      return NextResponse.json(
        { error: 'All API keys are currently rate-limited. Please try again in a few minutes.' },
        { status: 429 }
      )
    }

  } catch (error: any) {
    console.error('Error generating summary:', error)
    const errorMessage = error.message || 'Failed to generate summary'
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
