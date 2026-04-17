"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Download, 
  ChevronLeft, 
  Activity, 
  Shield, 
  Cpu, 
  Clock, 
  AlertTriangle,
  FileVideo,
  Monitor
} from "lucide-react"
import { Button } from "@/components/ui/button"
import VideoPlayer from "@/components/video-player"
import TimestampList from "@/components/timestamp-list"
import { Timeline } from "@/app/components/Timeline"
import type { Timestamp } from "@/app/types"
import { getVideoBlobUrl } from "@/lib/videoStorage"
import { getAllVideoMetaLocally, type VideoMeta } from "@/lib/supabaseStorage"
import { motion, AnimatePresence } from "framer-motion"

interface LegacySavedVideo {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  timestamps: Timestamp[]
}

export default function VideoPage() {
  const [video, setVideo] = useState<VideoMeta | LegacySavedVideo | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const params = useParams()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    async function load() {
      const cachedMeta = getAllVideoMetaLocally()
      let foundVideo: VideoMeta | LegacySavedVideo | undefined = cachedMeta.find((v) => v.id === params.id)
      
      if (!foundVideo) {
        const savedVideos: LegacySavedVideo[] = JSON.parse(localStorage.getItem("savedVideos") || "[]")
        foundVideo = savedVideos.find((v) => v.id === params.id)
      }

      if (!foundVideo) { router.push("/library"); return }
      setVideo(foundVideo)

      if ('publicUrl' in foundVideo && foundVideo.publicUrl) {
         setResolvedUrl(foundVideo.publicUrl)
      } else if ('url' in foundVideo) {
         if (foundVideo.url.startsWith("idb://")) {
            const id = foundVideo.url.replace("idb://", "")
            const blobUrl = await getVideoBlobUrl(id).catch(() => null)
            setResolvedUrl(blobUrl)
          } else {
            setResolvedUrl(foundVideo.url)
          }
      }
    }
    load()
  }, [params.id, router])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const handleTimeUpdate = () => setCurrentTime(v.currentTime)
    const handleLoadedMetadata = () => setVideoDuration(v.duration)

    v.addEventListener('timeupdate', handleTimeUpdate)
    v.addEventListener('loadedmetadata', handleLoadedMetadata)

    if (v.duration) handleLoadedMetadata()

    return () => {
      v.removeEventListener('timeupdate', handleTimeUpdate)
      v.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const handleTimestampClick = (timestamp: string) => {
    if (!videoRef.current) return
    const [minutes, seconds] = timestamp.split(":").map(Number)
    videoRef.current.currentTime = minutes * 60 + seconds
    videoRef.current.play()
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.3, 1, 0.3] }} 
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-blue-500 font-mono tracking-widest uppercase text-xl"
        >
          Synchronizing Neural Interface...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pt-20">
      <div className="absolute inset-0 mesh-gradient opacity-10 pointer-events-none" />

      {/* Operation Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-3xl">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/library" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-[0.2em] text-blue-500 uppercase">Archive Analysis</span>
                <div className="w-1 h-1 rounded-full bg-blue-500" />
                <span className="text-[10px] font-mono text-white/30">ID: {video.id.slice(0, 8)}</span>
              </div>
              <h1 className="text-xl font-bold truncate max-w-md">{video.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-6 border-r border-white/5 pr-6">
               <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Neural Load</span>
               <span className="text-sm font-mono text-emerald-400">OPTIMAL</span>
            </div>
            <Button
              onClick={async () => {
                const downloadUrl = resolvedUrl ?? ('url' in video ? video.url : '')
                if (!downloadUrl) return;
                const a = document.createElement('a')
                a.href = downloadUrl
                a.download = video.name.toLowerCase().endsWith('.mp4') ? video.name : `${video.name}.mp4`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }}
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 rounded-xl px-6 h-12"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Protocol
            </Button>
          </div>
        </div>
      </header>

      {/* Main Analysis Chamber */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        
        {/* Playback Area */}
        <div className="flex-1 p-6 lg:p-10 overflow-auto scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
              <VideoPlayer 
                url={resolvedUrl ?? ''} 
                timestamps={(video.timestamps || []).map(ts => ({
                  ...ts,
                  isDangerous: !!ts.isDangerous
                })) as Timestamp[]} 
                ref={videoRef} 
              />
              
              {/* Overlay HUD */}
              <div className="absolute top-6 left-6 pointer-events-none">
                 <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-tighter uppercase">Suraksha System Active</span>
                 </div>
              </div>
            </div>

            {/* Neural Timeline */}
            <div className="glass rounded-lg p-8 border-white/5">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-bold">Threat Matrix Timeline</h2>
                 </div>
                 <div className="text-xs font-mono text-white/30 uppercase tracking-widest">
                    Frame Precision: Sub-MS
                 </div>
              </div>
              
              <Timeline
                events={video.timestamps.map(ts => {
                  let timeInSeconds;
                  if (typeof ts.timestamp === 'string' && ts.timestamp.includes(':')) {
                    const [minutes, seconds] = ts.timestamp.split(':').map(Number);
                    timeInSeconds = minutes * 60 + seconds;
                  } else {
                    timeInSeconds = Number(ts.timestamp);
                  }
                  return {
                    startTime: timeInSeconds,
                    endTime: timeInSeconds + 3,
                    type: ts.isDangerous ? 'warning' : 'normal',
                    label: ts.description
                  };
                })}
                totalDuration={videoDuration || 100}
                currentTime={currentTime}
              />
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                 { label: "Neural Confidence", val: "98.4%", icon: Activity },
                 { label: "Entropy Level", val: "Low", icon: Shield },
                 { label: "Packet Integrity", val: "100%", icon: Cpu },
                 { label: "Operation Time", val: "3.2s", icon: Clock },
               ].map((item, i) => (
                 <div key={i} className="glass rounded-xl p-6 border-white/5">
                    <item.icon className="w-4 h-4 text-blue-400/50 mb-3" />
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{item.label}</div>
                    <div className="text-xl font-bold">{item.val}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Intelligence Sidebar */}
        <aside className="w-full lg:w-[450px] border-l border-white/5 bg-black/40 backdrop-blur-3xl p-8 overflow-auto">
          <div className="mb-10">
            <h2 className="text-2xl font-black tracking-tight mb-2">Intelligence Events</h2>
            <p className="text-white/40 text-sm font-medium">Neural engine identified {video.timestamps.length} points of interest.</p>
          </div>

          <div className="space-y-6">
             <TimestampList 
                timestamps={(video.timestamps || []).map(ts => ({
                  ...ts,
                  isDangerous: !!ts.isDangerous
                })) as Timestamp[]} 
                onTimestampClick={handleTimestampClick} 
              />
          </div>

          <div className="mt-12 p-8 rounded-lg bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5">
             <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold">Operational Note</h3>
             </div>
             <p className="text-sm text-white/50 leading-relaxed italic">
                All identified threats have been cross-referenced with local archives. 
                Neural precision verified for this protocol.
             </p>
          </div>
        </aside>
      </main>
    </div>
  )
}

