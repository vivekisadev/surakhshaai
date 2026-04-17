import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const getGeminiClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Google API key not found in environment variables')
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function POST(request: Request) {
  let genAI
  try {
    genAI = getGeminiClient()
  } catch (error) {
    console.error('Gemini client initialization error:', error)
    return NextResponse.json(
      { error: 'Google API key not properly configured' },
      { status: 500 }
    )
  }
  try {
    const { messages, events } = await request.json()

    const contextMessage = events.length > 0
      ? `Here are the recent events that have occurred during the video stream:\n${events.map((event: any) => 
          `- At ${event.timestamp}: ${event.description}${event.isDangerous ? ' (⚠️ Dangerous)' : ''}`
        ).join('\n')}\n\nPlease help the user with any questions about these events or provide general assistance.`
      : 'No events have been detected yet. I can still help you with any questions about the video stream or general assistance.'

    console.log('Sending request to Gemini...')
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are a helpful assistant monitoring a real-time video stream. You have access to detected events and can provide guidance, especially during dangerous situations. Be concise but informative, and show appropriate concern for dangerous events while remaining calm and helpful."
    })
    
    // Process messages. The last message is the user prompt.
    // The previous messages are history.
    let userMessage = messages[messages.length - 1].content;
    const fullPrompt = `${contextMessage}\n\nUser Question:\n${userMessage}`;

    const history = messages.slice(0, messages.length - 1).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
        history: history,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150
        }
    });

    const result = await chat.sendMessage(fullPrompt);
    const content = result.response.text();

    if (!content) {
      throw new Error('Invalid response from Gemini')
    }

    console.log('Successfully received response from Gemini')
    return NextResponse.json({ 
      content: content,
      role: 'assistant'
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: `Failed to get chat response: ${errorMessage}` },
      { status: 500 }
    )
  }
}
