"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Upload, Save, Loader2, Brain, Activity, Clock, Shield } from "lucide-react"
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
    
    const res = await fetch('http://localhost:8000/analyze_frame', {
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


export default function UploadPage() {
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 mesh-gradient opacity-20" />
      
      <main className="relative z-10 flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-white/10 text-blue-400 font-bold text-xs uppercase tracking-widest"
            >
              <Activity className="w-3 h-3 animate-pulse" /> Neural Processing Core
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
              <span className="gradient-text">INTELLIGENT</span> <br /> UPLOAD
            </h1>
            <p className="text-white/40 text-xl font-medium max-w-2xl mx-auto">
              Feed your surveillance stream into our neural matrix for instant event reconstruction.
            </p>
          </div>

          {!videoUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group h-[450px] rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <div className="absolute inset-0 glass group-hover:bg-white/10 transition-all duration-700" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-white/5 group-hover:border-blue-500/50 transition-all rounded-2xl">
                <div className="w-24 h-24 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-400/30 mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <Upload className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Engage Signal Feed</h2>
                <p className="text-white/40 font-medium">MP4, WebM, or OGG up to 500MB</p>
                <input id="file-input" type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-8">
                {/* Progress Status */}
                {(isUploading || isAnalyzing) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-8 space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                           <Brain className="w-4 h-4 animate-pulse" /> {isUploading ? 'Materializing Signal' : 'Neural Reconstructing'}
                        </div>
                        <h3 className="text-2xl font-bold">{isUploading ? 'Uploading...' : 'Analyzing Frames...'}</h3>
                      </div>
                      <div className="text-4xl font-black text-white/20">{uploadProgress}%</div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-500" 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                       />
                    </div>
                  </motion.div>
                )}

                {/* Video Container */}
                <div className="glass rounded-2xl p-4 border-white/5 overflow-hidden shadow-2xl relative">
                  <div className="aspect-video rounded-xl bg-zinc-950 overflow-hidden relative border border-white/5">
                    <VideoPlayer url={videoUrl} timestamps={timestamps} ref={videoRef} />
                    
                    {/* Pixelation Analysis Overlay */}
                    <AnimatePresence>
                      {isAnalyzing && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                        >
                          <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-40">
                            {[...Array(96)].map((_, i) => (
                              <motion.div
                                key={i}
                                animate={{ 
                                  opacity: [0, 0.5, 0],
                                  backgroundColor: i % 3 === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0,0,0,0.6)'
                                }}
                                transition={{
                                  duration: Math.random() * 1.5 + 0.5,
                                  repeat: Infinity,
                                  delay: Math.random() * 2
                                }}
                                className="border-[0.5px] border-white/5"
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 noise-bg opacity-[0.08] animate-glitch-pixel" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="glass rounded-xl p-8 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-4">Registry Name</label>
                    <Input 
                      value={videoName} 
                      onChange={(e) => setVideoName(e.target.value)}
                      className="bg-white/5 border-white/10 rounded-2xl h-14 px-6 text-lg font-bold focus:ring-2 ring-blue-500/20"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveVideo}
                    disabled={isSaving || isSaved}
                    className={`h-14 px-10 rounded-[1.5rem] font-black tracking-tight text-lg transition-all ${isSaved ? 'bg-green-600' : 'btn-primary'}`}
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : isSaved ? <><CheckCircle2 className="mr-2" /> Secured</> : <><Save className="mr-2" /> Save to Matrix</>}
                  </Button>
                </div>
              </div>

              {/* Feed Column */}
              <div className="lg:col-span-4 h-fit">
                <div className="glass rounded-2xl p-8 border-white/5 h-full max-h-[800px] flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black flex items-center gap-2">
                      <Shield className="w-6 h-6 text-blue-400" /> Event Feed
                    </h3>
                    {isAnalyzing && <Activity className="w-5 h-5 text-blue-400 animate-pulse" />}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {timestamps.length === 0 && !isAnalyzing ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center opacity-20">
                        <Clock className="w-12 h-12 mb-4" />
                        <p className="font-bold">No anomalies detected yet.</p>
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
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 text-center opacity-20 font-mono text-xs uppercase tracking-[0.3em]">
        Signal Processing Node v4.0 // Secured Protocol
      </footer>
    </div>
  )
}

