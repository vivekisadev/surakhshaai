import { Battery, Wifi } from "lucide-react"
import type { Camera } from "@/types"
import { useEffect, useRef, useState, useCallback } from "react"
import { BoundingBoxesOverlay } from "./bounding-boxes-overlay"

interface CameraFeedProps {
  camera: Camera
  date?: Date
  onTimeUpdate?: (time: number) => void
  mode?: "live" | "archive"
  archiveUrl?: string
}

export function CameraFeed({ camera, date = new Date(), onTimeUpdate, mode = "live", archiveUrl }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 })
  const [currentTime, setCurrentTime] = useState(0)
  const lastReportedTime = useRef<number>(-1)
  const rafRef = useRef<number | null>(null)

  // Reload video source when URL or mode changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [camera.videoUrl, camera.thumbnail, archiveUrl, mode])

  // ResizeObserver — much better than window resize for per-element tracking
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setVideoDimensions({ width, height })
        }
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Poll currentTime at low frequency (4 fps) using rAF — avoids 60x/s timeupdate events
  useEffect(() => {
    if (!videoRef.current) return

    let lastPoll = 0
    const INTERVAL = 250 // poll every 250ms (4 fps) — enough for bounding box sync

    const tick = (now: number) => {
      if (now - lastPoll >= INTERVAL) {
        lastPoll = now
        const video = videoRef.current
        if (video) {
          const t = video.currentTime
          // Only update state if time changed meaningfully (>0.1s diff)
          if (Math.abs(t - lastReportedTime.current) > 0.1) {
            lastReportedTime.current = t
            setCurrentTime(t)
            onTimeUpdate?.(t)
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [onTimeUpdate])

  const feedUrl = mode === "archive" ? (archiveUrl || camera.videoUrl) : (camera.videoUrl || camera.thumbnail)

  return (
    <div ref={containerRef} className="group relative w-full h-full overflow-hidden bg-black">
      {/* Camera Feed — hardware decode hints for smooth playback */}
      <video
        ref={videoRef}
        key={feedUrl} // Key change forces re-render of video element
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
      >
        <source src={feedUrl} type="video/mp4" />
      </video>

      {/* Bounding Boxes — only render when dimensions are known */}
      {videoDimensions.width > 0 && mode === "live" && (
        <BoundingBoxesOverlay
          videoName={camera.name}
          currentTime={currentTime}
          width={videoDimensions.width}
          height={videoDimensions.height}
        />
      )}

      {/* Feed Mode Indicator top-right */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 bg-black/40 backdrop-blur-md px-2 py-1 rounded">
        <span className={`w-1.5 h-1.5 rounded-full ${mode === "live" ? "bg-red-500 animate-pulse" : "bg-blue-400"}`} />
        <span className="text-[8px] font-mono uppercase tracking-widest text-white/90">
          {mode === "live" ? "LIVE" : "ARCHIVE"}
        </span>
      </div>

      {/* Status icons top-left */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 text-white/50 z-10 transition-colors group-hover:text-emerald-400">
        <Wifi className="h-3 w-3" />
        <Battery className="h-3 w-3" />
      </div>

      {/* Neural Scanline Overlay (Visual only) */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-[5]" />
      <div className="absolute inset-0 pointer-events-none bg-[length:100%_2px] opacity-[0.15] z-[6]" style={{ backgroundImage: "linear-gradient(to bottom, transparent 50%, #000 50%)" }} />
    </div>
  )
}
