"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trash2, Search, Video, Clock, AlertTriangle, CheckCircle2, PlayCircle, Upload, Activity, ArrowRight, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchAllVideosFromSupabase, deleteVideoFromSupabase, type VideoMeta } from "@/lib/supabaseStorage"
import { motion, AnimatePresence } from "framer-motion"

export default function SavedVideosPage() {
  const [resolvedVideos, setResolvedVideos] = useState<VideoMeta[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    async function loadVideos() {
      setIsLoading(true)
      try {
        const videos = await fetchAllVideosFromSupabase()
        setResolvedVideos(videos)
      } catch (err) {
        console.error("Failed to load videos:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadVideos()
  }, [])

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleDelete = async (id: string) => {
    await deleteVideoFromSupabase(id).catch(() => {})
    setResolvedVideos(prev => prev.filter(v => v.id !== id))
    setSelectedIds(prev => prev.filter(i => i !== id))
  }

  const filteredVideos = resolvedVideos.filter(video =>
    video.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.timestamps.some(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col">
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      <main className="relative z-10 flex-1 container mx-auto px-6 py-20">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px] uppercase tracking-widest"
              >
                <Activity className="w-3 h-3" /> Secure Video Repository
              </motion.div>
              <h1 className="text-6xl font-black tracking-tighter">
                SIGNAL <span className="gradient-text italic">ARCHIVE.</span>
              </h1>
              <p className="text-white/40 font-medium text-xl max-w-xl">
                Comprehensive records of all neural surveillance events and recovered signals.
              </p>
            </div>
            
            <Link href="/upload">
              <Button className="btn-primary h-16 px-10 rounded-xl font-black text-lg gap-4 group">
                Recover New Signal <Upload className="group-hover:-translate-y-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Search & Stats Bar */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" />
              <Input
                placeholder="Search encrypted tags or registry IDs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-16 pl-16 pr-8 bg-white/5 border-white/10 rounded-xl font-bold text-lg focus:ring-2 ring-blue-500/20 placeholder:text-white/10"
              />
            </div>
            <div className="flex gap-4">
               <div className="glass rounded-xl px-8 flex items-center gap-4 h-16 border-white/5">
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Active Feeds</div>
                    <div className="text-2xl font-black text-blue-400 leading-none">{resolvedVideos.length}</div>
                  </div>
               </div>
               <Button variant="outline" className="h-16 w-16 rounded-xl border-white/10 bg-white/5 hover:bg-white/10">
                  <Filter className="w-6 h-6" />
               </Button>
            </div>
          </div>

          {/* Video Grid */}
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-video rounded-xl glass animate-pulse" />
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
               <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="py-40 text-center space-y-6"
               >
                 <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                    <Video className="w-10 h-10 text-white/20" />
                 </div>
                 <h2 className="text-4xl font-black text-white/20 tracking-tight">NO SIGNALS FOUND.</h2>
                 <p className="text-white/10 font-bold uppercase tracking-[0.3em]">Initialize a new upload protocol</p>
               </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredVideos.map((video, idx) => {
                  const dangerCount = video.timestamps.filter(ts => ts.isDangerous).length
                  const isSelected = selectedIds.includes(video.id)
                  
                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group relative"
                    >
                      <div className="absolute inset-0 bg-blue-600/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className={`relative glass rounded-xl overflow-hidden border-white/10 transition-all duration-500 shadow-2xl ${isSelected ? 'ring-2 ring-blue-500 bg-blue-500/5' : 'group-hover:border-blue-500/50'}`}>
                        {/* Thumbnail Area */}
                        <div className="aspect-video relative overflow-hidden bg-zinc-900 border-b border-white/5">
                          {video.publicUrl ? (
                            <video 
                              src={video.publicUrl} 
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                              muted
                              onMouseEnter={e => e.currentTarget.play()}
                              onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-white/10">
                              <Video className="w-12 h-12" />
                            </div>
                          )}
                          
                          {/* Selection Checkbox */}
                          <button 
                            onClick={(e) => { e.preventDefault(); toggleSelection(video.id); }}
                            className="absolute top-6 right-6 z-20 w-8 h-8 rounded-full glass border-white/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          >
                             {isSelected ? (
                               <CheckCircle2 className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                             ) : (
                               <div className="w-4 h-4 rounded-full border-2 border-white/20" />
                             )}
                          </button>

                          {/* Alert Badge */}
                          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 rounded-full glass border-white/10 backdrop-blur-xl">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${dangerCount > 0 ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-green-500 shadow-[0_0_8px_green]'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                               {dangerCount > 0 ? `${dangerCount} Anomalies` : 'Signal Clear'}
                            </span>
                          </div>

                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                        </div>

                        {/* Info Area */}
                        <div className="p-8 space-y-6">
                          <div className="space-y-2">
                             <div className="flex items-center justify-between">
                               <div className="text-[10px] font-black uppercase tracking-widest text-white/20 truncate max-w-[150px]">{video.id}</div>
                               <button 
                                onClick={() => handleDelete(video.id)}
                                className="text-white/20 hover:text-red-500 transition-colors p-1"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                             <h3 className="text-xl font-bold truncate group-hover:text-blue-400 transition-colors">
                               {video.name}
                             </h3>
                          </div>

                          <div className="flex items-center gap-6">
                             <div className="flex items-center gap-2">
                               <Clock className="w-4 h-4 text-blue-400/50" />
                               <span className="text-xs font-bold text-white/40">{video.timestamps.length} Events</span>
                             </div>
                             <div className="w-px h-4 bg-white/5" />
                             <div className="flex items-center gap-2">
                               <AlertTriangle className={`w-4 h-4 ${dangerCount > 0 ? 'text-red-400/50' : 'text-green-400/50'}`} />
                               <span className="text-xs font-bold text-white/40">{dangerCount} Hazards</span>
                             </div>
                          </div>

                          <div className="flex gap-2">
                            <Link href={`/video/${video.id}`} className="flex-1">
                              <Button variant="ghost" className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-black text-sm uppercase tracking-widest group/btn">
                                Open Matrix <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-8 py-6 glass border-blue-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-8 min-w-[500px]"
          >
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Grid Multicam Dashboard</div>
              <div className="text-xl font-black">{selectedIds.length} Signals Selected</div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setSelectedIds([])}
                variant="ghost" 
                className="h-14 px-6 rounded-xl text-white/40 hover:text-white font-bold"
              >
                Clear
              </Button>
              <Link href={`/surveillance?ids=${selectedIds.join(',')}`}>
                <Button className="btn-primary h-14 px-10 rounded-xl font-black text-lg gap-4 group">
                  Open Collective <PlayCircle className="w-6 h-6" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 py-12 border-t border-white/5 text-center opacity-20 font-mono text-xs uppercase tracking-[0.3em]">
        Surveillance Archival Protocol v6.0
      </footer>
    </div>
  )
}


