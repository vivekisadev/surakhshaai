"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, StopCircle, PlayCircle, Save, Loader2, Activity, Shield, Brain, Zap, Clock, Monitor, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TimestampList from "@/components/timestamp-list"
import ChatInterface from "@/components/chat-interface"
import { Timeline } from "@/app/components/Timeline"
import type { Timestamp } from "@/app/types"
import { detectEvents, type VideoEvent, type TensorFlowData } from "./actions"
import { ReconHUD } from "@/components/premium/ReconHUD"
import { AnalysisOverlay } from "@/components/premium/AnalysisOverlay"

// Dynamically import TensorFlow.js and models
import { loadTensorFlowModules, isTensorFlowReady, type TensorFlowModules } from '@/lib/tensorflow-loader'
import type * as blazeface from '@tensorflow-models/blazeface'
import type * as posedetection from '@tensorflow-models/pose-detection'
import type * as tf from '@tensorflow/tfjs'

let tfModules: TensorFlowModules | null = null

interface SavedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  timestamps: Timestamp[]
}

interface Keypoint {
  x: number
  y: number
  score?: number
  name?: string
}

interface FacePrediction {
  topLeft: [number, number] | tf.Tensor1D
  bottomRight: [number, number] | tf.Tensor1D
  landmarks?: Array<[number, number]> | tf.Tensor2D
  probability: number | tf.Tensor1D
}

export default function Page() {
  // States
  const [isRecording, setIsRecording] = useState(false)
  const [timestamps, setTimestamps] = useState<Timestamp[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [initializationProgress, setInitializationProgress] = useState<string>('')
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [videoName, setVideoName] = useState('')
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [mlModelsReady, setMlModelsReady] = useState(false)
  const [lastPoseKeypoints, setLastPoseKeypoints] = useState<Keypoint[]>([])
  const [isClient, setIsClient] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const detectionFrameRef = useRef<number | null>(null)
  const lastDetectionTime = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(performance.now())
  const startTimeRef = useRef<Date | null>(null)
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null)
  const poseModelRef = useRef<posedetection.PoseDetector | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const isRecordingRef = useRef<boolean>(false)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // -----------------------------
  // 1) Initialize ML Models
  // -----------------------------
  const initMLModels = async () => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }
    
    try {
      setIsInitializing(true)
      setMlModelsReady(false)
      setError(null)

      setInitializationProgress('Loading TensorFlow.js modules...')
      
      // Load TensorFlow modules using the utility
      tfModules = await loadTensorFlowModules()
      
      if (!tfModules) {
        throw new Error('Failed to load TensorFlow.js modules')
      }

      // Load models in parallel
      setInitializationProgress('Initializing AI models...')
      const [faceModel, poseModel] = await Promise.all([
        tfModules.blazefaceModel.load({
          maxFaces: 1, // Limit to 1 face for better performance
          scoreThreshold: 0.5 // Increase threshold for better performance
        }),
        tfModules.poseDetection.createDetector(
          tfModules.poseDetection.SupportedModels.MoveNet,
          {
            modelType: tfModules.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.3
          }
        )
      ])

      faceModelRef.current = faceModel
      poseModelRef.current = poseModel

      setMlModelsReady(true)
      setIsInitializing(false)
      console.log('All ML models loaded successfully')
    } catch (err) {
      console.error('Error loading ML models:', err)
      setError('Failed to load ML models: ' + (err as Error).message)
      setMlModelsReady(false)
      setIsInitializing(false)
    }
  }

  // Helper to set canvas dimensions
  const updateCanvasSize = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    canvas.width = 640 // fixed width
    canvas.height = 360 // fixed height (16:9)
  }

  // -----------------------------
  // 2) Set up the webcam
  // -----------------------------
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 360, max: 360 },
          frameRate: { ideal: 30 },
          facingMode: "user"
        },
        audio: true
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        mediaStreamRef.current = stream

        // Wait for video metadata so we can set the canvas size
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            updateCanvasSize()
            resolve()
          }
        })
      }
    } catch (error) {
      console.error("Error accessing webcam:", error)
      setError(
        "Failed to access webcam. Please make sure you have granted camera permissions."
      )
    }
  }

  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl)
      setRecordedVideoUrl(null)
    }
  }

  // -----------------------------
  // 3) Speech Recognition
  // -----------------------------
  const initSpeechRecognition = () => {
    if (typeof window === "undefined") return
    if ("webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + " " + finalTranscript)
        }
      }

      recognitionRef.current = recognition
    } else {
      console.warn("Speech recognition not supported in this browser.")
    }
  }

  // -----------------------------
  // 4) TensorFlow detection loop
  // -----------------------------
  // 4) TensorFlow detection loop — uses setTimeout at 6fps to avoid blocking main thread
  // -----------------------------
  const runDetection = async () => {
    if (!isRecordingRef.current) return
    if (!mlModelsReady || !faceModelRef.current || !poseModelRef.current) {
      // Models not ready — check again in 500ms
      detectionFrameRef.current = setTimeout(runDetection, 500) as unknown as number
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      detectionFrameRef.current = setTimeout(runDetection, 200) as unknown as number
      return
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) {
      detectionFrameRef.current = setTimeout(runDetection, 200) as unknown as number
      return
    }

    try {
      // Draw current video frame to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawVideoToCanvas(video, canvas, ctx)

      const scaleX = canvas.width / (video.videoWidth || canvas.width)
      const scaleY = canvas.height / (video.videoHeight || canvas.height)

      // --- Face Detection — hospital overlay style ---
      try {
        const predictions = await faceModelRef.current.estimateFaces(video, false)
        predictions.forEach((prediction: blazeface.NormalizedFace) => {
          const start = prediction.topLeft as [number, number]
          const end = prediction.bottomRight as [number, number]
          const w = (end[0] - start[0]) * scaleX
          const h = (end[1] - start[1]) * scaleY
          const sx = start[0] * scaleX
          const sy = start[1] * scaleY

          // Hospital-style green detection box
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)' // emerald
          ctx.lineWidth = 1.5
          ctx.strokeRect(sx, sy, w, h)

          // Corner accents
          const corner = 8
          ctx.strokeStyle = 'rgba(52, 211, 153, 1)'
          ctx.lineWidth = 2.5
          ;[[sx,sy],[sx+w,sy],[sx,sy+h],[sx+w,sy+h]].forEach(([cx,cy], i) => {
            ctx.beginPath()
            ctx.moveTo(cx + (i%2===0 ? corner : -corner), cy)
            ctx.lineTo(cx, cy)
            ctx.lineTo(cx, cy + (i<2 ? corner : -corner))
            ctx.stroke()
          })

          // Label
          const confidence = Math.round((prediction.probability as number) * 100)
          ctx.fillStyle = 'rgba(0,0,0,0.65)'
          ctx.fillRect(sx, sy - 18, 130, 16)
          ctx.fillStyle = 'rgba(52,211,153,1)'
          ctx.font = '10px monospace'
          ctx.fillText(`SUBJECT DETECTED • ${confidence}%`, sx + 4, sy - 5)
        })
      } catch (e) { /* face detection error — silently skip */ }

      // --- Pose Detection — highlight body keypoints ---
      try {
        const poses = await poseModelRef.current.estimatePoses(video)
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints
          const converted: Keypoint[] = keypoints.map(kp => ({
            x: kp.x, y: kp.y, score: kp.score ?? 0, name: kp.name
          }))
          setLastPoseKeypoints(converted)

          // Determine if pose looks aggressive (arms raised above shoulders)
          const leftWrist = keypoints.find(k => k.name === 'left_wrist')
          const rightWrist = keypoints.find(k => k.name === 'right_wrist')
          const leftShoulder = keypoints.find(k => k.name === 'left_shoulder')
          const rightShoulder = keypoints.find(k => k.name === 'right_shoulder')
          const armsRaised = (
            (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y - 30) ||
            (rightWrist && rightShoulder && rightWrist.y < rightShoulder.y - 30)
          )

          keypoints.forEach(kp => {
            if ((kp.score ?? 0) > 0.35) {
              const x = kp.x * scaleX
              const y = kp.y * scaleY
              ctx.beginPath()
              ctx.arc(x, y, 3, 0, 2 * Math.PI)
              ctx.fillStyle = armsRaised ? 'rgba(239,68,68,0.9)' : 'rgba(96,165,250,0.9)'
              ctx.fill()
            }
          })

          if (armsRaised) {
            ctx.fillStyle = 'rgba(239,68,68,0.15)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = 'rgba(239,68,68,1)'
            ctx.font = 'bold 11px monospace'
            ctx.fillText('⚠ AGGRESSIVE BEHAVIOR FLAGGED', 10, 20)
          }
        }
      } catch (e) { /* pose error — skip */ }
    } catch (err) {
      console.error('Detection loop error:', err)
    }

    lastFrameTimeRef.current = performance.now()
    // Schedule next detection at 6fps using setTimeout (not rAF)
    if (isRecordingRef.current) {
      detectionFrameRef.current = setTimeout(runDetection, 166) as unknown as number
    }
  }

  // Helper: Draw video to canvas (maintaining aspect ratio)
  const drawVideoToCanvas = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) => {
    const videoAspect = video.videoWidth / video.videoHeight
    const canvasAspect = canvas.width / canvas.height

    let drawWidth = canvas.width
    let drawHeight = canvas.height
    let offsetX = 0
    let offsetY = 0

    if (videoAspect > canvasAspect) {
      drawHeight = canvas.width / videoAspect
      offsetY = (canvas.height - drawHeight) / 2
    } else {
      drawWidth = canvas.height * videoAspect
      offsetX = (canvas.width - drawWidth) / 2
    }

    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)
  }

  // -----------------------------
  // 5) Analyze frame via API (and send email if dangerous)
  // -----------------------------
  const analyzeFrame = async () => {
    if (!isRecordingRef.current) return

    const currentTranscript = transcript.trim()
    const currentPoseKeypoints = [...lastPoseKeypoints]

    try {
      const frame = await captureFrame()
      if (!frame) return

      if (!frame.startsWith("data:image/jpeg")) {
        console.error("Invalid frame format")
        return
      }

      // Build TensorFlow data for enhanced Gemini analysis
      const tensorflowData: TensorFlowData = {
        poseKeypoints: currentPoseKeypoints,
        faceDetected: faceModelRef.current !== null && currentPoseKeypoints.length > 0,
        faceConfidence: undefined // Will be set if face is detected
      }

      // Check face detection status
      if (faceModelRef.current && videoRef.current) {
        try {
          const predictions = await faceModelRef.current.estimateFaces(videoRef.current, false)
          tensorflowData.faceDetected = predictions.length > 0
          if (predictions.length > 0) {
            tensorflowData.faceConfidence = predictions[0].probability as number
          }
        } catch (e) {
          // Face detection failed, keep defaults
        }
      }

      console.log('📊 TensorFlow data:', {
        poseKeypoints: currentPoseKeypoints.length,
        faceDetected: tensorflowData.faceDetected,
        faceConfidence: tensorflowData.faceConfidence
      })

      const result = await detectEvents(frame, currentTranscript, tensorflowData)
      if (!isRecordingRef.current) return

      // Add null/undefined check for result
      if (!result || !result.events) {
        console.warn("No events returned from detectEvents")
        return
      }

      if (result.events.length > 0) {
        // Use for...of instead of forEach for proper async handling
        for (const event of result.events) {
          const newTimestamp = {
            timestamp: getElapsedTime(),
            description: event.description,
            isDangerous: event.isDangerous
          }
          
          console.log("Adding new timestamp:", newTimestamp)
          setTimestamps((prev) => {
            console.log("Previous timestamps:", prev.length, "Adding:", newTimestamp.description)
            return [...prev, newTimestamp]
          })

          // For dangerous events, send notifications (email + Telegram)
          if (event.isDangerous) {
            console.log("🚨 DANGEROUS EVENT DETECTED - Sending notifications...")
            const notificationPayload = {
              title: "Dangerous Activity Detected",
              description: `At ${newTimestamp.timestamp}, the following dangerous activity was detected: ${event.description}`,
              timestamp: newTimestamp.timestamp,
              imageBase64: frame // Include the captured frame
            }

            // Send Telegram notification with image
            try {
              console.log("📱 Sending Telegram notification...")
              const telegramResponse = await fetch("/api/send-telegram", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json"
                },
                body: JSON.stringify(notificationPayload)
              })
              
              if (telegramResponse.ok) {
                console.log("✅ Telegram notification sent successfully")
              } else {
                const telegramError = await telegramResponse.json()
                console.error("❌ Failed to send Telegram notification:", telegramError)
              }
            } catch (telegramError) {
              console.error("❌ Error sending Telegram notification:", telegramError)
            }

            // Send WhatsApp notification
            try {
              console.log("💬 Sending WhatsApp notification...")
              const whatsappResponse = await fetch("/api/send-whatsapp", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json"
                },
                body: JSON.stringify(notificationPayload)
              })

              if (whatsappResponse.ok) {
                console.log("✅ WhatsApp notification sent successfully")
              } else {
                const whatsappError = await whatsappResponse.json()
                console.error("❌ Failed to send WhatsApp notification:", whatsappError)
              }
            } catch (whatsappError) {
              console.error("❌ Error sending WhatsApp notification:", whatsappError)
            }

            // Send email notification
            try {
              console.log("📧 Sending email notification...")
              const emailPayload = {
                title: notificationPayload.title,
                description: notificationPayload.description
              }
              const response = await fetch("/api/send-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json"
                },
                body: JSON.stringify(emailPayload)
              })
              
              // Check if response is ok before trying to parse JSON
              if (!response.ok) {
                if (response.status === 401) {
                  setError(
                    "Please sign in to receive email notifications for dangerous events."
                  )
                } else if (response.status === 500) {
                  setError(
                    "Email service not properly configured. Please contact support."
                  )
                } else {
                  const errorText = await response.text()
                  console.error("Failed to send email notification:", errorText)
                  setError(
                    `Failed to send email notification. Please try again later.`
                  )
                }
                continue // Continue to next event instead of return
              }
              
              // Only try to parse JSON for successful responses
              const resData = await response.json()
              console.log("✅ Email notification sent successfully:", resData)
            } catch (error) {
              console.error("Error sending email notification:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error analyzing frame:", error)
      setError("Error analyzing frame. Please try again.")
      if (isRecordingRef.current) {
        stopRecording()
      }
    }
  }

  // -----------------------------
  // 6) Capture current video frame (for analysis)
  // -----------------------------
  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current) return null

    const video = videoRef.current
    const tempCanvas = document.createElement("canvas")
    const width = 640
    const height = 360
    tempCanvas.width = width
    tempCanvas.height = height

    const context = tempCanvas.getContext("2d")
    if (!context) return null

    try {
      context.drawImage(video, 0, 0, width, height)
      const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.8)
      return dataUrl
    } catch (error) {
      console.error("Error capturing frame:", error)
      return null
    }
  }

  // -----------------------------
  // 7) Get elapsed time string
  // -----------------------------
  const getElapsedTime = () => {
    if (!startTimeRef.current) return "00:00"
    const elapsed = Math.floor(
      (Date.now() - startTimeRef.current.getTime()) / 1000
    )
    // Update current time for timeline
    setCurrentTime(elapsed)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  // -----------------------------
  // 8) Recording control (start/stop)
  // -----------------------------
  const startRecording = async () => {
    setCurrentTime(0)
    setVideoDuration(0)
    
    // Load TensorFlow models on demand when starting recording
    if (!mlModelsReady) {
      console.log("📦 Loading TensorFlow models on demand...")
      setInitializationProgress("Loading AI models...")
      setIsInitializing(true)
      try {
        await initMLModels()
      } catch (err) {
        setError("Failed to load ML models: " + (err as Error).message)
        setIsInitializing(false)
        return
      }
    }
    
    if (!mediaStreamRef.current) {
      setError("Camera not ready. Please wait.")
      return
    }

    setError(null)
    setTimestamps([])
    setAnalysisProgress(0)

    startTimeRef.current = new Date()
    isRecordingRef.current = true
    setIsRecording(true)
    // Start tracking video duration
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }
    durationIntervalRef.current = setInterval(() => {
      if (isRecordingRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000)
        setVideoDuration(elapsed)
      }
    }, 1000)

    // Start speech recognition
    if (recognitionRef.current) {
      setTranscript("")
      setIsTranscribing(true)
      recognitionRef.current.start()
    }

    // Start video recording using MediaRecorder with WebM container (MP4 not supported by browsers)
    recordedChunksRef.current = []
    
    // Check for supported mimeType with audio+video codecs
    const getSupportedMimeType = () => {
      const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus', 
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ]
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type
        }
      }
      return 'video/webm'
    }
    
    const mimeType = getSupportedMimeType()
    console.log('Using MediaRecorder mimeType:', mimeType)
    
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setRecordedVideoUrl(url)
      setVideoName("stream.webm")
    }

    // Set up data handling before starting
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setRecordedVideoUrl(url)
      setVideoName("stream.webm")
    }

    mediaRecorderRef.current = mediaRecorder
    // Start recording with a timeslice of 1000ms (1 second)
    mediaRecorder.start(1000)

    // Start TF detection loop via setTimeout (not rAF) — avoids blocking main thread
    if (detectionFrameRef.current) {
      clearTimeout(detectionFrameRef.current as unknown as ReturnType<typeof setTimeout>)
    }
    if (mlModelsReady) {
      detectionFrameRef.current = setTimeout(runDetection, 100) as unknown as number
    }

    // Set up repeated frame analysis every 3 seconds
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
    }
    analyzeFrame() // first immediate call
    analysisIntervalRef.current = setInterval(analyzeFrame, 3000)
  }

  const stopRecording = () => {
    startTimeRef.current = null
    isRecordingRef.current = false
    setIsRecording(false)

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsTranscribing(false)
    }

    // Stop MediaRecorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    // Stop detection (setTimeout-based)
    if (detectionFrameRef.current) {
      clearTimeout(detectionFrameRef.current as unknown as ReturnType<typeof setTimeout>)
      detectionFrameRef.current = null
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current)
      analysisIntervalRef.current = null
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }

  // -----------------------------
  // 9) Save video functionality
  // -----------------------------
  const handleSaveVideo = () => {
    if (!recordedVideoUrl || !videoName) return

    try {
      const savedVideos: SavedVideo[] = JSON.parse(
        localStorage.getItem("savedVideos") || "[]"
      )
      const newVideo: SavedVideo = {
        id: Date.now().toString(),
        name: videoName,
        url: recordedVideoUrl,
        thumbnailUrl: recordedVideoUrl,
        timestamps: timestamps
      }
      savedVideos.push(newVideo)
      localStorage.setItem("savedVideos", JSON.stringify(savedVideos))
      alert("Video saved successfully!")
    } catch (error) {
      console.error("Error saving video:", error)
      alert("Failed to save video. Please try again.")
    }
  }

  // -----------------------------
  // 10) useEffect hooks
  // -----------------------------
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update current time and duration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration || 60)
      // Reset playback position to start
      video.currentTime = 0
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Reset playback position when video source changes
    video.currentTime = 0

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [recordedVideoUrl])

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return
    
    initSpeechRecognition()
    const init = async () => {
      await startWebcam()
      // TensorFlow models are now loaded on-demand when Start Recording is clicked
      // This makes the page load faster
      console.log("📷 Webcam ready. TensorFlow will load when you click Start Recording.")
      setIsInitializing(false)
    }
    init()

    return () => {
      stopWebcam()
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current)
      if (detectionFrameRef.current) cancelAnimationFrame(detectionFrameRef.current)
    }
  }, [isClient]) // Only run after client-side hydration

  // Start detection when ML models become ready and recording is active
  useEffect(() => {
    if (mlModelsReady && isRecordingRef.current && !detectionFrameRef.current) {
      console.log("Starting TensorFlow detection now that models are ready")
      lastDetectionTime.current = 0
      detectionFrameRef.current = requestAnimationFrame(runDetection)
    }
  }, [mlModelsReady])

  // -----------------------------
  // Render
  // -----------------------------
  // Don't render anything on server-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-zinc-300">Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col pt-20 overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-10 pointer-events-none" />
      
      <main className="relative z-10 w-full max-w-[1800px] mx-auto px-6 py-10">
        <div className="space-y-12">
          
          <div className="text-center space-y-4">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500"
             >
                <Activity className="w-3 h-3" /> Neural Monitoring Active
             </motion.div>
             <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">
                Real-Time <span className="gradient-text">Stream Analyzer.</span>
             </h1>
          </div>

          <div className="space-y-8">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl glass p-2">
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl z-20 p-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                  <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse text-center">{initializationProgress}</p>
                </div>
              )}
              <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                {isClient && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                <AnalysisOverlay isActive={isRecording} />
                <ReconHUD isRecording={isRecording} />
              </div>
            </div>

            {error && !isInitializing && (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-6">
              {isInitializing ? (
                <Button
                  disabled
                  className="h-16 px-10 glass border-white/5 rounded-lg text-white/30 font-black gap-3 cursor-not-allowed uppercase tracking-widest text-xs"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initializing...
                </Button>
              ) : !isRecording ? (
                <Button
                  onClick={startRecording}
                  className="btn-primary h-20 px-12 rounded-[2rem] text-xl font-black gap-4 group"
                >
                  <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  Initialize Feed
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="h-20 px-12 rounded-[2rem] text-xl font-black gap-4 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:bg-red-700 transition-all"
                >
                  <StopCircle className="w-6 h-6 animate-pulse" />
                  Kill Feed
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
              <div className="lg:col-span-8 space-y-8">
                <div className="glass p-8 rounded-xl border-white/5">
                  <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-blue-500" /> Neural Timeline
                  </h2>
                  {timestamps.length > 0 ? (
                    <Timeline
                      events={timestamps.map(ts => {
                        const [m, s] = ts.timestamp.split(':').map(Number);
                        return {
                          startTime: m * 60 + s,
                          endTime: m * 60 + s + 3,
                          type: ts.isDangerous ? 'warning' : 'normal',
                          label: ts.description
                        };
                      })}
                      totalDuration={videoDuration || 60}
                      currentTime={currentTime}
                    />
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-white/5 rounded-xl">
                       <Zap className="w-8 h-8 mb-2" />
                       <p className="text-xs font-bold uppercase tracking-widest">Awaiting Anomalies</p>
                    </div>
                  )}
                </div>

                <div className="glass p-8 rounded-xl border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                      <Brain className="w-5 h-5 text-blue-500" /> Signal Transcript
                    </h2>
                    {isTranscribing && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Listening</span>
                      </div>
                    )}
                  </div>
                  <div className="min-h-[120px] p-6 glass bg-white/5 rounded-xl border border-white/5">
                    {transcript ? (
                      <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap italic">
                        {transcript}
                      </p>
                    ) : (
                      <p className="text-white/20 text-xs font-bold uppercase tracking-widest italic text-center py-10">
                        Waiting for signal modulation...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="glass p-8 rounded-xl border-white/5 h-full space-y-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-500" /> Event Stream
                  </h2>
                  <div className="max-h-[500px] overflow-auto pr-2 custom-scrollbar">
                    <TimestampList
                      timestamps={timestamps}
                      onTimestampClick={() => {}}
                    />
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isClient && !isRecording && recordedVideoUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 p-10 glass rounded-2xl border border-blue-500/20 bg-blue-600/5 backdrop-blur-3xl"
                >
                  <h2 className="text-2xl font-black mb-6 text-white uppercase tracking-tight flex items-center gap-3">
                    <Save className="w-6 h-6 text-blue-500" /> Secure Archival
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      type="text"
                      placeholder="Signal Registry ID"
                      value={videoName}
                      onChange={(e) => setVideoName(e.target.value)}
                      className="glass border-white/10 text-white rounded-2xl h-14 px-6 text-lg"
                    />
                    <Button
                      onClick={handleSaveVideo}
                      className="btn-primary h-14 px-10 rounded-2xl font-black whitespace-nowrap"
                      disabled={!videoName}
                    >
                      Confirm Registry
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <ChatInterface timestamps={timestamps} />

      <footer className="relative z-10 py-12 border-t border-white/5 text-center opacity-20 font-mono text-[10px] uppercase tracking-[0.4em]">
        Neural Monitoring Node v9.2 // Matrix Secured
      </footer>
    </div>
  )
}
