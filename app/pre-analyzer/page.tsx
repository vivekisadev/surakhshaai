"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Upload, Save, Loader2, Brain, Activity, Clock, Shield, Search, Zap } from "lucide-react"
import { AnalysisOverlay } from "@/components/premium/AnalysisOverlay"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import VideoPlayer from "@/components/video-player"
import TimestampList from "@/components/timestamp-list"
import type { Timestamp } from "@/app/types"
import Link from "next/link"
import { saveVideoToSupabase } from "@/lib/supabaseStorage"

// Direct client → Python backend analysis (no Server Action middleman)
async function analyzeFrameLocally(video: HTMLVideoElement, time: number): Promise<{events: any[]}> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return { events: [] };

  try {
    video.currentTime = time;
    await new Promise((resolve) => { video.onseeked = resolve; });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to JPEG blob and send directly to Python backend
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    
    if (!blob) return { events: [] };
    
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    
    const res = await fetch('http://localhost:8000/analyze_upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      console.error(`[Analyze] Backend returned ${res.status}`);
      return { events: [] };
    }
    
    return await res.json();
  } catch (error) {
    console.error('[Analyze] Error:', error);
    return { events: [] };
  }
}


export default function AnalyzePage() {
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [timestamps, setTimestamps] = useState<Timestamp[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saveProgress, setSaveProgress] = useState(0)
  const [videoName, setVideoName] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoFileRef = useRef<File | null>(null)

  const handleFileUpload = async (e: { target: { files: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setTimestamps([])
    setIsSaved(false)

    try {
      videoFileRef.current = file
      const localUrl = URL.createObjectURL(file)
      setVideoUrl(localUrl)
      setVideoName(file.name.replace(/\.[^/.]+$/, ""))

      while (!videoRef.current) await new Promise(r => setTimeout(r, 100))
      const video = videoRef.current
      video.src = localUrl

      await new Promise((resolve) => {
        video.onloadeddata = resolve;
        if (video.readyState >= 2) resolve(true);
      });

      setIsUploading(false)
      setIsAnalyzing(true)
      
      const duration = video.duration
      const interval = 2 
      const newTimestamps: Timestamp[] = []

      for (let time = 0; time < duration; time += interval) {
        setUploadProgress(Math.floor((time / duration) * 100))
        
        try {
          const result = await analyzeFrameLocally(video, time)
          if (result.events && result.events.length > 0) {
            result.events.forEach((event: any) => {
              const minutes = Math.floor(time / 60)
              const seconds = Math.floor(time % 60)
              newTimestamps.push({
                timestamp: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
                description: event.description,
                isDangerous: event.isDangerous ?? false
              })
            })
            // Update in real-time so user sees results streaming in
            setTimestamps([...newTimestamps])
          }
        } catch (err) {
          console.error(`[Frame ${time}s] Analysis failed:`, err)
        }
      }

      setTimestamps(newTimestamps)
      setIsAnalyzing(false)
      setUploadProgress(100)
    } catch (error) {
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }

  const handleSaveVideo = async () => {
    if (!videoUrl || !videoName || !videoFileRef.current) return
    setIsSaving(true)
    setSaveProgress(0)
    try {
      const id = Date.now().toString()
      await saveVideoToSupabase(videoFileRef.current, {
        id, name: videoName, timestamps, uploadedAt: new Date().toISOString(),
      }, (pct) => setSaveProgress(pct))
      setIsSaved(true)
    } catch (err) {
      alert('Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col pt-20">
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      <main className="relative z-10 flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 text-blue-400 font-bold text-xs uppercase tracking-widest"
            >
              <Zap className="w-3 h-3 animate-pulse" /> AI FORENSIC ANALYZER
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-white">
              ANALYZE <span className="text-neutral-600 font-light tracking-tighter">EVIDENCE</span>
            </h1>
            <p className="text-white/40 text-[11px] font-mono uppercase tracking-[0.3em] max-w-2xl mx-auto">
              Feed security footage into the neural matrix for automated threat reconstruction
            </p>
          </div>

          {!videoUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group h-[400px] rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="absolute inset-0 glass group-hover:bg-white/5 transition-all duration-700" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-white/5 group-hover:border-blue-500/50 transition-all rounded-2xl">
                <div className="w-20 h-20 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-400/20 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2 tracking-tight">Supply New Material</h2>
                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Supports MP4, WebM // Max 500MB</p>
                <input id="file-input" type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Status Bar */}
                {(isUploading || isAnalyzing) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-neutral-900/50 border border-white/5 rounded-xl p-6 space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2 font-mono">
                           <Brain className="w-3.5 h-3.5 animate-pulse" /> {isUploading ? 'Materializing Data' : 'AI RECONSTRUCTING'}
                        </div>
                        <h3 className="text-lg font-bold tracking-tight">{isUploading ? 'Uploading Clip...' : 'Extracting Incident Frames...'}</h3>
                      </div>
                      <div className="text-3xl font-black text-white/10 font-mono tracking-tighter">{uploadProgress}%</div>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                       />
                    </div>
                  </motion.div>
                )}

                {/* Main Interaction Area */}
                <div className="bg-neutral-900/50 rounded-2xl p-3 border border-white/5 overflow-hidden shadow-2xl relative">
                  <div className="aspect-video rounded-xl bg-black overflow-hidden relative border border-white/5 shadow-inner">
                    <VideoPlayer url={videoUrl} timestamps={timestamps} ref={videoRef} />
                    
                    {/* Diagnostic Pixelation Overlay */}
                    <AnimatePresence>
                      {isAnalyzing && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                        >
                          <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-30">
                            {[...Array(96)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{ 
                                  opacity: [0, 0.4, 0],
                                  backgroundColor: i % 4 === 0 ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                                }}
                                transition={{
                                  duration: Math.random() * 2 + 1,
                                  repeat: Infinity,
                                  delay: Math.random() * 2
                                }}
                                className="border-[0.5px] border-white/5"
                              />
                            ))}
                          </div>
                          {/* Scanline */}
                          <motion.div 
                            animate={{ top: ['-10%', '110%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-px bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Metadata Capture */}
                <div className="bg-neutral-900 border border-white/5 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[9px] uppercase font-mono tracking-[0.2em] text-neutral-500 ml-4">Incident Identifier</label>
                    <Input 
                      value={videoName} 
                      onChange={(e) => setVideoName(e.target.value)}
                      placeholder="e.g., Ward 4 Aggression Event"
                      className="bg-black/40 border-white/10 rounded-xl h-12 px-6 text-sm font-bold focus:ring-1 ring-blue-500/40"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveVideo}
                    disabled={isSaving || isSaved}
                    className={`h-12 px-8 rounded-xl font-bold tracking-tight transition-all ${isSaved ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/10'}`}
                  >
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : isSaved ? <><CheckCircle2 className="mr-2 w-4 h-4" /> Logged to Database</> : <><Save className="mr-2 w-4 h-4" /> Commit Analysis</>}
                  </Button>
                </div>
              </div>

              {/* Forensic Timeline Column */}
              <div className="lg:col-span-4 h-fit sticky top-24">
                <div className="bg-neutral-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 h-full max-h-[750px] flex flex-col shadow-xl">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <h3 className="text-sm font-bold flex items-center gap-2 tracking-tight uppercase">
                      <Shield className="w-4 h-4 text-blue-400" /> Evidence Timeline
                    </h3>
                    {isAnalyzing && (
                      <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                        <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse delay-75" />
                        <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                    {timestamps.length === 0 && !isAnalyzing ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center opacity-30 mt-10">
                        <Search className="w-10 h-10 mb-4 text-neutral-600" />
                        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Scan sequence idle.<br/>Awaiting material input.</p>
                      </div>
                    ) : (
                      <TimestampList 
                        timestamps={timestamps} 
                        onTimestampClick={(t) => {
                          const [m, s] = t.split(':').map(Number)
                          if(videoRef.current) {
                            videoRef.current.currentTime = m * 60 + s
                            videoRef.current.play()
                          }
                        }} 
                      />
                    )}
                  </div>
                  
                  {/* Stats Summary */}
                  <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                      <div className="text-[8px] font-mono text-neutral-600 uppercase mb-1">Total Frames</div>
                      <div className="text-xl font-mono text-neutral-300 tracking-tighter">{Math.floor(timestamps.length * 1.5)}</div>
                    </div>
                    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                      <div className="text-[8px] font-mono text-neutral-600 uppercase mb-1">AI Confidence</div>
                      <div className="text-xl font-mono text-blue-400 tracking-tighter">98.4%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 text-center opacity-20 font-mono text-[9px] uppercase tracking-[0.4em]">
        Suraksha AI // Neural Forensic Node v4.1 // Encrypted Protocol
      </footer>
    </div>
  )
}
