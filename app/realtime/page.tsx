"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Camera, StopCircle, PlayCircle, Loader2, Shield, Brain, Zap, Clock, Monitor } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export default function Page() {
  const [isRecording, setIsRecording] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Auto-boot Python logic when user enters Realtime Analysis
  useEffect(() => {
    async function bootIntelligence() {
      try {
        // Pings the NextJS route which checks for the Python server and spawns it if needed
        await fetch('/api/python-server')
      } catch (error) {
        console.error("Failed to boot Python background intelligence:", error)
      }
      setIsInitializing(false)
    }
    bootIntelligence()
  }, [])

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-300 font-sans p-6 overflow-hidden">
      
      {/* Premium Cinematic Background */}
      <div className="absolute inset-0 bg-radial-gradient opacity-40 pointer-events-none" />
      <div className="absolute inset-0 analyzer-grid opacity-20 pointer-events-none" />
      
      <div className="max-w-[1900px] mx-auto h-[calc(100vh-theme(spacing.20))] mt-10">
        
        {/* Header Section */}
        <div className="flex items-end justify-between mb-8 border-b border-neutral-800 pb-4 relative z-10">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 text-[10px] font-mono uppercase tracking-[0.2em] text-red-400 mb-3 rounded-sm"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live Inference Mode
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-3">
              Python Backend <span className="text-neutral-600 font-light">| Stream</span>
            </h1>
          </div>

          <div className="flex gap-4">
            <div className="text-right hidden sm:block bg-neutral-900 border border-neutral-800 p-3 rounded-xl">
              <div className="text-[9px] font-mono text-neutral-500 uppercase tracking-[0.2em] mb-1 flex items-center justify-end gap-1.5">
                <Brain className="w-3 h-3 text-emerald-400" /> Edge AI Engine
              </div>
              <div className="text-sm font-mono text-emerald-400 font-bold">100% LOCAL PROCESSING</div>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="w-full flex justify-center items-center h-[calc(100%-80px)]">
          
          <div className="relative w-full max-w-6xl aspect-video rounded-2xl overflow-hidden border border-neutral-800 bg-black shadow-2xl flex items-center justify-center">
            
            {isInitializing ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
                  <Monitor className="w-10 h-10 text-neutral-600 m-4" />
                </div>
                <div className="text-xs font-mono tracking-[0.2em] text-neutral-500 uppercase">Connecting to Python Backend...</div>
                <Progress value={45} className="w-48 h-1" />
              </div>
            ) : (
              // The Magic Line - Replaces all Next.js heavy browser capture with MJPEG stream from Python
              <img 
                src="http://localhost:8000/video_feed" 
                alt="Suraksha Python AI Feed" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const errorDiv = document.getElementById('feed-error');
                  if (errorDiv) errorDiv.style.display = 'flex';
                }}
              />
            )}

            {/* Error state if server isn't running */}
            <div id="feed-error" className="hidden absolute inset-0 flex-col items-center justify-center bg-black/90 p-8 text-center backdrop-blur-sm z-50">
              <Shield className="w-12 h-12 text-red-500/50 mb-4" />
              <h3 className="text-xl font-bold text-neutral-200 mb-2 font-mono uppercase tracking-widest">Connection Failed</h3>
              <p className="text-sm text-neutral-400 max-w-md font-mono mb-6">
                The Python inference server is not running on port 8000.
              </p>
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded text-left font-mono text-[11px] text-neutral-300 w-full max-w-md">
                <div className="text-blue-400 mb-2">RUN THIS IN YOUR TERMINAL:</div>
                <code className="block text-emerald-400">cd python_backend<br/>pip install -r requirements.txt<br/>python live_feed_server.py</code>
              </div>
            </div>

            {/* Premium Overlays */}
            {!isInitializing && (
              <>
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse box-shadow-glow" />
                  <span className="text-[10px] font-mono text-white/90 uppercase tracking-widest">LIVE INFERENCE</span>
                  <span className="ml-2 pl-2 border-l border-white/10 text-[10px] font-mono text-blue-400">YOLOv8 NATIVE</span>
                </div>
                
                {/* Visual HUD Borders */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-500/50 rounded-tl pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-500/50 rounded-tr pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-500/50 rounded-bl pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-500/50 rounded-br pointer-events-none" />
                
                {/* CRT Scanline */}
                <div className="absolute inset-0 camera-scanline opacity-30 pointer-events-none z-10" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
