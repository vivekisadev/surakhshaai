import { NextRequest, NextResponse } from 'next/server'

/**
 * SURAKSHA AI — Hugging Face Multi-Model Inference Router
 *
 * Models (all FREE via HF Inference API):
 * ────────────────────────────────────────────────────────────────────
 *  Task                    Model
 *  ─────────────────────────────────────────────────────────────────
 *  Fire / Smoke            EdBianchi/vit-fire-detection
 *  Emotion / Aggression    dima806/facial_emotions_image_detection
 *  Sexual Harassment       Falconsai/nsfw_image_classification
 *  Person / Crowd Count    facebook/detr-resnet-50
 * ────────────────────────────────────────────────────────────────────
 *
 * HF_API_KEY setup:
 *   1. Go to https://huggingface.co → Sign up (free)
 *   2. Settings → Access Tokens → New Token (Read)
 *   3. Add to .env.local:  HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
 */

const HF_API_KEY = process.env.HF_API_KEY
const HF_BASE = 'https://api-inference.huggingface.co/models'

const MODELS = {
  fire:       `${HF_BASE}/EdBianchi/vit-fire-detection`,
  emotion:    `${HF_BASE}/dima806/facial_emotions_image_detection`,
  harassment: `${HF_BASE}/Falconsai/nsfw_image_classification`,
  crowd:      `${HF_BASE}/facebook/detr-resnet-50`,
}

const CONFIDENCE_THRESHOLD = 0.55

// ─── Call a HF model ───────────────────────────────────────────────────────
async function callModel(url: string, blob: Blob, label: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': blob.type || 'image/jpeg',
      },
      body: blob,
      signal: AbortSignal.timeout(14000),
    })

    if (res.status === 503) return { status: 'loading', message: `${label} model warming up — retry in 20s` }
    if (!res.ok) return { status: 'error', message: `${label}: HTTP ${res.status}` }

    const data = await res.json()
    return { status: 'ok', data }
  } catch (err: any) {
    return { status: 'timeout', message: `${label}: ${err.message}` }
  }
}

// ─── Interpreters ──────────────────────────────────────────────────────────

function interpretFire(data: any[]): { detected: boolean; confidence: number; label: string } {
  if (!Array.isArray(data)) return { detected: false, confidence: 0, label: 'error' }
  const fire = data.find(d => d.label?.toLowerCase().includes('fire'))
  const conf = fire?.score ?? 0
  return { detected: conf > CONFIDENCE_THRESHOLD, confidence: Math.round(conf * 100), label: fire?.label ?? 'Non-Fire' }
}

function interpretEmotion(data: any[]): { emotion: string; isAggressive: boolean; confidence: number } {
  if (!Array.isArray(data)) return { emotion: 'neutral', isAggressive: false, confidence: 0 }
  const sorted = [...data].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const violent = ['angry', 'disgust', 'fear', 'contempt']
  const isAggressive = violent.some(e => top?.label?.toLowerCase().includes(e))
  return { emotion: top?.label ?? 'neutral', isAggressive, confidence: Math.round((top?.score ?? 0) * 100) }
}

function interpretHarassment(data: any[]): { detected: boolean; confidence: number; label: string } {
  if (!Array.isArray(data)) return { detected: false, confidence: 0, label: 'safe' }
  const unsafe = data.find(d =>
    d.label?.toLowerCase() === 'nsfw' ||
    d.label?.toLowerCase() === 'unsafe' ||
    d.label?.toLowerCase().includes('explicit')
  )
  const conf = unsafe?.score ?? 0
  // Slightly lower threshold for harassment — better to flag and review
  return { detected: conf > 0.50, confidence: Math.round(conf * 100), label: unsafe?.label ?? 'safe' }
}

function interpretCrowd(data: any[]): { persons: number; hasCrowding: boolean; objects: string[] } {
  if (!Array.isArray(data)) return { persons: 0, hasCrowding: false, objects: [] }
  // DETR returns bounding box objects with labels
  const personList = data.filter((d: any) => {
    // Handle both classification and detection output formats
    const label = d.label?.toLowerCase() ?? ''
    return label === 'person' || label.includes('person')
  })
  const objects = [...new Set(data.map((d: any) => d.label).filter(Boolean))]
  return { persons: personList.length, hasCrowding: personList.length >= 6, objects }
}

// ─── Main handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('frame') as File | null
    const type = (formData.get('type') as string) || 'all'

    if (!imageFile) {
      return NextResponse.json({ error: 'No frame provided. Send a video frame as "frame" field.' }, { status: 400 })
    }

    if (!HF_API_KEY) {
      return NextResponse.json({
        error: 'HF_API_KEY not set in .env.local',
        setup: 'Sign up at huggingface.co → Settings → Access Tokens → New Token (Read)',
      }, { status: 503 })
    }

    const blob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type || 'image/jpeg' })

    // Choose which models to run
    const tasks: Promise<any>[] = []
    const keys: string[] = []

    if (type === 'all' || type === 'fire') { tasks.push(callModel(MODELS.fire, blob, 'Fire')); keys.push('fire') }
    if (type === 'all' || type === 'emotion' || type === 'aggression') { tasks.push(callModel(MODELS.emotion, blob, 'Emotion')); keys.push('emotion') }
    if (type === 'all' || type === 'harassment' || type === 'nsfw') { tasks.push(callModel(MODELS.harassment, blob, 'Harassment')); keys.push('harassment') }
    if (type === 'all' || type === 'crowd' || type === 'persons') { tasks.push(callModel(MODELS.crowd, blob, 'Crowd')); keys.push('crowd') }

    const results = await Promise.all(tasks)

    const response: Record<string, any> = {
      timestamp: new Date().toISOString(),
      type,
      models: keys,
    }

    keys.forEach((key, i) => {
      const r = results[i]
      if (r.status === 'ok') {
        if (key === 'fire')       response.fire       = interpretFire(r.data)
        if (key === 'emotion')    response.emotion    = interpretEmotion(r.data)
        if (key === 'harassment') response.harassment = interpretHarassment(r.data)
        if (key === 'crowd')      response.crowd      = interpretCrowd(r.data)
      } else {
        response[`${key}_status`] = r
      }
    })

    // Build alert list
    const alerts: { type: string; message: string; severity: 'CRITICAL' | 'WARNING' }[] = []

    if (response.fire?.detected)
      alerts.push({ type: 'FIRE', message: `Fire/smoke detected (${response.fire.confidence}%)`, severity: 'CRITICAL' })

    if (response.emotion?.isAggressive && response.emotion.confidence > 60)
      alerts.push({ type: 'AGGRESSION', message: `Aggressive behavior: ${response.emotion.emotion} (${response.emotion.confidence}%)`, severity: response.emotion.confidence > 80 ? 'CRITICAL' : 'WARNING' })

    if (response.harassment?.detected)
      alerts.push({ type: 'SEXUAL_HARASSMENT', message: `Inappropriate conduct detected (${response.harassment.confidence}%). Immediate response required.`, severity: 'CRITICAL' })

    if (response.crowd?.hasCrowding)
      alerts.push({ type: 'OVERCROWDING', message: `${response.crowd.persons} persons detected — overcrowding risk`, severity: response.crowd.persons >= 10 ? 'CRITICAL' : 'WARNING' })

    response.alerts = alerts
    response.alertCount = alerts.length
    response.alertLevel = alerts.length === 0
      ? 'CLEAR'
      : alerts.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' : 'WARNING'

    // Only escalate to Gemini if a critical alert was found and Gemini is needed for detail
    response.requiresGemini = response.alertLevel === 'CLEAR' // true = no HF detections, Gemini should be called

    return NextResponse.json(response)
  } catch (err: any) {
    console.error('HF analysis error:', err)
    return NextResponse.json({ error: 'Analysis failed', detail: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Suraksha AI — HF Multi-Model Analyzer',
    models: {
      fire:       { model: 'EdBianchi/vit-fire-detection',              task: 'Fire & smoke in hospital' },
      emotion:    { model: 'dima806/facial_emotions_image_detection',   task: 'Anger / aggression / fear' },
      harassment: { model: 'Falconsai/nsfw_image_classification',       task: 'Sexual harassment / inappropriate conduct' },
      crowd:      { model: 'facebook/detr-resnet-50',                   task: 'Person & crowd detection' },
    },
    usage: {
      endpoint: 'POST /api/hf-analyze',
      fields: { frame: 'JPEG image (video frame)', type: 'all | fire | emotion | aggression | harassment | crowd' },
      note: 'requiresGemini: true in response means HF found nothing — caller should invoke Gemini.',
    },
  })
}
