"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { fetchAllVideosFromSupabase, type VideoMeta } from "@/lib/supabaseStorage"
import { Camera, Shield, Activity, BarChart2, Zap, LayoutGrid, Clock, AlertTriangle, Monitor } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { locations, events } from "@/lib/data"
import { CameraFeed } from "@/components/camera-feed"
import { EventFeed } from "@/components/event-feed"
import { StatsOverview } from "@/components/stats-overview"
import { CameraModal } from "@/components/camera-modal"

export default function SurveillancePageClient() {
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')?.split(',') || []
  const [selectedArchiveVideos, setSelectedArchiveVideos] = useState<VideoMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [videoTimes, setVideoTimes] = useState<Record<string, number>>({})
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const allVideos = await fetchAllVideosFromSupabase()
      if (ids.length > 0) {
        setSelectedArchiveVideos(allVideos.filter(v => ids.includes(v.id)))
      }
      setIsLoading(false)
    }
    load()
  }, [searchParams])

  const handleTimeUpdate = (cameraId: string, time: number) => {
    setVideoTimes(prev => ({ ...prev, [cameraId]: time }))
  }

  const handleEventClick = (cameraId: string, timestamp: number) => {
    setSelectedCamera(cameraId)
    setVideoTimes(prev => ({ ...prev, [cameraId]: timestamp }))
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-300 relative flex flex-col pt-12 font-sans selection:bg-blue-500/30">
      {/* Precision Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <main className="relative z-10 w-full max-w-[1900px] mx-auto px-6 py-4">
        {/* Top Header - Analyzer Style */}
        <div className="flex items-end justify-between mb-8 border-b border-neutral-800 pb-4">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono uppercase tracking-widest text-blue-400 mb-3 rounded-sm"
            >
               <Shield className="w-3 h-3" /> Suraksha AI — Hospital Security Active
            </motion.div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-100 flex items-center gap-3">
               HOSPITAL SECURITY <span className="text-neutral-600 font-light">| MATRIX</span>
            </h1>
          </div>
          
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-1">Active Cameras</div>
            <div className="text-xl font-mono text-neutral-200">14/14 <span className="text-blue-500 text-sm">●</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Main Matrix Area - lg:col-span-9 for 3-col video grid */}
          <div className="xl:col-span-9 space-y-12">
            
            {/* Grid of Archive Videos (If any selected) */}
            <AnimatePresence>
              {selectedArchiveVideos.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                    <Zap className="w-3 h-3 text-blue-400" /> Active Archive Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedArchiveVideos.map((video) => (
                      <div 
                        key={video.id} 
                        className="relative bg-neutral-900 border border-neutral-800 rounded-sm overflow-hidden group transition-all duration-300 hover:border-blue-500/50"
                        onMouseEnter={() => setHoveredCamera(video.id)}
                        onMouseLeave={() => setHoveredCamera(null)}
                      >
                        <div className="aspect-video bg-black relative border-b border-neutral-800">
                          {video.publicUrl && (
                            <video src={video.publicUrl} autoPlay loop muted className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          )}
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-1 border border-neutral-800 rounded-sm text-[9px] font-mono uppercase tracking-widest text-neutral-300">
                             {video.name}
                          </div>
                        </div>
                        <a href={`/video/${video.id}`} className="block py-2 text-center bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono uppercase tracking-widest text-blue-400 transition-colors">
                           [ Analyze Source ]
                        </a>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* System Mock Feeds */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                <Monitor className="w-3 h-3 text-blue-400" /> Hospital Camera Network
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.flatMap((location) =>
                  location.cameras.map((camera) => (
                    <motion.button
                      key={camera.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedCamera(camera.id)}
                      onMouseEnter={() => setHoveredCamera(camera.id)}
                      onMouseLeave={() => setHoveredCamera(null)}
                      className={`relative aspect-video rounded-sm overflow-hidden border transition-all duration-300 bg-neutral-900 group ${
                        hoveredCamera && hoveredCamera !== camera.id 
                        ? 'opacity-40 border-neutral-800' 
                        : 'opacity-100 border-neutral-700 hover:border-blue-500/60'
                      }`}
                    >
                      <CameraFeed
                        camera={camera}
                        onTimeUpdate={(time) => handleTimeUpdate(camera.id, time)}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-start text-left">
                        <div className="text-neutral-200 font-mono text-[10px] uppercase tracking-wider">{camera.name}</div>
                        <div className="text-neutral-500 text-[9px] font-mono tracking-widest truncate mt-0.5">{camera.address}</div>
                      </div>
                      
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 pointer-events-none" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 pointer-events-none" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 pointer-events-none" />
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area - xl:col-span-3 */}
          <aside className="xl:col-span-3 space-y-6 sticky top-24">
            <div className="bg-neutral-900 border border-neutral-800 rounded-sm p-5 space-y-5">
               <StatsOverview />
               <div className="h-px bg-neutral-800 w-full" />
               <div className="flex flex-col h-full">
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                     <Activity className="w-3 h-3 text-blue-500" /> Event Stream
                  </h3>
                  <div className="max-h-[calc(100vh-450px)] overflow-auto pr-2 custom-scrollbar">
                     <EventFeed
                       events={events}
                       videoTimes={videoTimes}
                       onEventHover={setHoveredCamera}
                       onEventClick={handleEventClick}
                       highlightCameraId={hoveredCamera}
                     />
                  </div>
               </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Hospital Status</h3>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-neutral-400 uppercase">Active Incidents</span>
                      <span className="text-red-400">3</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-neutral-400 uppercase">Uptime</span>
                      <span className="text-neutral-200">99.99%</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-neutral-400 uppercase">Staff Monitored</span>
                      <span className="text-neutral-200">47</span>
                   </div>
                   <div className="mt-2 w-full h-[2px] bg-neutral-800 rounded-none overflow-hidden">
                      <div className="w-full h-full bg-blue-500 opacity-80" />
                   </div>
                </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Camera Modal */}
      {selectedCamera && (
        <CameraModal
          open={true}
          onOpenChange={(open) => !open && setSelectedCamera(null)}
          cameraId={selectedCamera}
          currentTime={videoTimes[selectedCamera]}
          date={new Date()}
        />
      )}
    </div>
  )
}
