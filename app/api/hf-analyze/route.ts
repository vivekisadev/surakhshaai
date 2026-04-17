import { NextRequest, NextResponse } from 'next/server'

/**
 * SURAKSHA AI — Hugging Face Multi-Model Inference Router
 *
 * This endpoint runs parallel inference using FREE Hugging Face models
 * to reduce load on the Google Gemini API. Each model is specialized
 * for a specific hospital security detection task.
 *
 * Models used (all free via HF Inference API):
 * ─────────────────────────────────────────────────────────────
 * Fire/Smoke Detection:
 *   → Model: "EdBianchi/vit-fire-detection"
 *   → API key env: HF_API_KEY
 *
 * Face & Person Detection (aggression pose):
 *   → Model: "Salesforce/blip-image-captioning-base" (captioning for scene description)
 *   → Alternatively: "facebook/detr-resnet-50" (object detection)
 *   → API key env: HF_API_KEY (same key)
 *
 * Emotion / Aggression Detection:
 *   → Model: "dima806/facial_emotions_image_detection"
 *   → API key env: HF_API_KEY (same key)
 *
 * Violence / Action Classification:
 *   → Model: "nateraw/vit-age-classifier" (used as base, fine-tunable)
 *   → Better: "microsoft/resnet-50" with custom labels
 *   → API key env: HF_API_KEY (same key)
 *
 * ─────────────────────────────────────────────────────────────
 * HOW TO GET YOUR FREE HF API KEY:
 *   1. Go to https://huggingface.co and sign up (free)
 *   2. Go to Settings → Access Tokens
 *   3. Create a token with "Read" permission
 *   4. Add to .env.local as: HF_API_KEY=hf_xxxxxxxxxxxxxxxxxx
 * ─────────────────────────────────────────────────────────────
 */

const HF_API_KEY = process.env.HF_API_KEY

// Hugging Face Inference API base
const HF_BASE = 'https://api-inference.huggingface.co/models'

// Model endpoints
const MODELS = {
  fire: `${HF_BASE}/EdBianchi/vit-fire-detection`,
  emotion: `${HF_BASE}/dima806/facial_emotions_image_detection`,
  captioning: `${HF_BASE}/Salesforce/blip-image-captioning-base`,
  objectDetection: `${HF_BASE}/facebook/detr-resnet-50`,
}

async function callHFModel(modelUrl: string, imageBlob: Blob, taskHint: string) {
  try {
    const res = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': imageBlob.type || 'image/jpeg',
      },
      body: imageBlob,
      signal: AbortSignal.timeout(15000), // 15s timeout per model
    })

    if (!res.ok) {
      const errText = await res.text()
      // Model may be loading — common with free HF tier
      if (res.status === 503) {
        return { status: 'loading', message: `${taskHint} model is warming up. Retry in 20s.` }
      }
      return { status: 'error', message: `${taskHint}: ${errText}` }
    }

    const data = await res.json()
    return { status: 'ok', data }
  } catch (err: any) {
    return { status: 'error', message: `${taskHint} model timeout or network error` }
  }
}

function interpretFireResult(data: any[]): { detected: boolean; confidence: number; label: string } {
  if (!Array.isArray(data)) return { detected: false, confidence: 0, label: 'unknown' }
  // Model returns [{label: 'Fire', score: 0.9}, {label: 'Non-Fire', score: 0.1}]
  const fireClass = data.find((d: any) => d.label?.toLowerCase().includes('fire'))
  const confidence = fireClass?.score ?? 0
  return { detected: confidence > 0.55, confidence: Math.round(confidence * 100), label: fireClass?.label ?? 'Non-Fire' }
}

function interpretEmotionResult(data: any[]): { topEmotion: string; isAggressive: boolean; confidence: number } {
  if (!Array.isArray(data)) return { topEmotion: 'neutral', isAggressive: false, confidence: 0 }
  const sorted = [...data].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const aggressiveEmotions = ['angry', 'disgust', 'fear', 'contempt']
  const isAggressive = aggressiveEmotions.some(e => top?.label?.toLowerCase().includes(e))
  return {
    topEmotion: top?.label ?? 'neutral',
    isAggressive,
    confidence: Math.round((top?.score ?? 0) * 100),
  }
}

function interpretObjectDetection(data: any[]): { persons: number; hasCrowding: boolean; objects: string[] } {
  if (!Array.isArray(data)) return { persons: 0, hasCrowding: false, objects: [] }
  const persons = data.filter((d: any) => d.label?.toLowerCase() === 'person').length
  const objects = [...new Set(data.map((d: any) => d.label).filter(Boolean))]
  return { persons, hasCrowding: persons >= 5, objects }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('frame') as File | null
    const analysisType = (formData.get('type') as string) || 'all'

    if (!imageFile) {
      return NextResponse.json({ error: 'No image frame provided. Send a video frame as "frame" field.' }, { status: 400 })
    }

    if (!HF_API_KEY) {
      return NextResponse.json(
        {
          error: 'HF_API_KEY not configured.',
          setup: 'Add HF_API_KEY=hf_xxxxxxxx to your .env.local file. Get a free key at huggingface.co → Settings → Access Tokens.',
        },
        { status: 503 }
      )
    }

    const imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type || 'image/jpeg' })

    // Run models in parallel based on requested analysis type
    const tasks: Promise<any>[] = []
    const taskNames: string[] = []

    if (analysisType === 'all' || analysisType === 'fire') {
      tasks.push(callHFModel(MODELS.fire, imageBlob, 'Fire Detection'))
      taskNames.push('fire')
    }
    if (analysisType === 'all' || analysisType === 'emotion' || analysisType === 'aggression') {
      tasks.push(callHFModel(MODELS.emotion, imageBlob, 'Emotion/Aggression'))
      taskNames.push('emotion')
    }
    if (analysisType === 'all' || analysisType === 'crowd' || analysisType === 'persons') {
      tasks.push(callHFModel(MODELS.objectDetection, imageBlob, 'Person/Crowd Detection'))
      taskNames.push('persons')
    }

    const results = await Promise.all(tasks)

    // Build structured response
    const response: Record<string, any> = {
      timestamp: new Date().toISOString(),
      analysisType,
      modelsUsed: taskNames,
    }

    taskNames.forEach((name, i) => {
      const result = results[i]
      if (result.status === 'ok') {
        if (name === 'fire') response.fire = interpretFireResult(result.data)
        if (name === 'emotion') response.emotion = interpretEmotionResult(result.data)
        if (name === 'persons') response.crowd = interpretObjectDetection(result.data)
      } else {
        response[`${name}_status`] = result
      }
    })

    // Derive top-level alerts
    const alerts: string[] = []
    if (response.fire?.detected) alerts.push(`🔥 FIRE DETECTED (${response.fire.confidence}% confidence)`)
    if (response.emotion?.isAggressive) alerts.push(`😡 AGGRESSION DETECTED — ${response.emotion.topEmotion} (${response.emotion.confidence}%)`)
    if (response.crowd?.hasCrowding) alerts.push(`👥 OVERCROWDING — ${response.crowd.persons} persons detected`)

    response.alerts = alerts
    response.alertLevel = alerts.length === 0 ? 'CLEAR' : alerts.length === 1 ? 'WARNING' : 'CRITICAL'

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('HF Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed', details: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Suraksha AI — Hugging Face Multi-Model Analyzer',
    description: 'Parallel AI inference for hospital security detection using free HF models.',
    requiredEnvVars: {
      HF_API_KEY: 'Your Hugging Face API key — get free at huggingface.co/settings/tokens',
    },
    models: {
      fire_smoke: {
        model: 'EdBianchi/vit-fire-detection',
        task: 'Fire and smoke detection in hospital premises',
        usage: 'POST with frame + type=fire',
      },
      emotion_aggression: {
        model: 'dima806/facial_emotions_image_detection',
        task: 'Detect aggression, anger, and distress in faces',
        usage: 'POST with frame + type=emotion',
      },
      crowd_persons: {
        model: 'facebook/detr-resnet-50',
        task: 'Person counting and crowd detection',
        usage: 'POST with frame + type=crowd',
      },
    },
    usage: {
      endpoint: 'POST /api/hf-analyze',
      fields: {
        frame: 'Image/JPEG frame extracted from video',
        type: 'all | fire | emotion | aggression | crowd | persons',
      },
    },
  })
}
