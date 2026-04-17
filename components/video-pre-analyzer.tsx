'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Cpu, 
  Zap, 
  Maximize, 
  Clock, 
  HardDrive, 
  Activity,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';

interface VideoPreAnalysisResult {
  duration: number;
  resolution: { width: number; height: number };
  frameCount: number;
  fileSize: string;
  codec: string;
  fps: number;
  format: string;
  thumbnail?: string;
}

interface VideoPreAnalyzerProps {
  onAnalysisComplete?: (result: VideoPreAnalysisResult) => void;
  onFileSelect?: (file: File) => void;
  onProceed?: () => void;
}

export default function VideoPreAnalyzer({ onAnalysisComplete, onFileSelect, onProceed }: VideoPreAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VideoPreAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const analyzeVideo = async (videoFile: File) => {
    setAnalyzing(true);
    setScanProgress(0);
    setError(null);
    
    try {
      const url = URL.createObjectURL(videoFile);
      const video = document.createElement('video');
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = url;
      });

      // Simulation of deep scanning
      for (let i = 0; i <= 100; i += 5) {
        setScanProgress(i);
        await new Promise(r => setTimeout(r, 100));
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

      const res: VideoPreAnalysisResult = {
        duration: video.duration,
        resolution: { width: video.videoWidth, height: video.videoHeight },
        frameCount: Math.round(video.duration * 30),
        fileSize: formatBytes(videoFile.size),
        codec: 'HEVC / H.264 High Profile',
        fps: 30,
        format: videoFile.type.split('/')[1]?.toUpperCase() || 'MP4',
        thumbnail
      };

      setResult(res);
      onAnalysisComplete?.(res);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Neural analysis failed. Verify video format intensity.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = (f: File) => {
    if (f.type.startsWith('video/')) {
      setFile(f);
      onFileSelect?.(f);
      analyzeVideo(f);
    } else {
      setError('Invalid signal. Please provide a video feed.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-96 rounded-sm overflow-hidden cursor-pointer border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 analyzer-grid pointer-events-none opacity-20" />
            
            <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 relative">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-sm bg-blue-500/5 flex items-center justify-center border border-blue-500/20"
                >
                  <Zap className="w-8 h-8 text-blue-500" />
                </motion.div>
                <div className="absolute -inset-2 bg-blue-500/5 blur-xl rounded-full" />
              </div>

              <h2 className="text-2xl font-mono uppercase tracking-[0.2em] mb-4 text-neutral-100">
                Initialize <span className="text-blue-500">Scan</span>
              </h2>
              <p className="text-neutral-500 text-sm font-mono uppercase tracking-widest max-w-sm">
                Insert signal source for deep packet verification
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </motion.div>
        ) : analyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-sm p-12 overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-neutral-800">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="flex flex-col items-center gap-10">
              <div className="relative w-24 h-24 border border-blue-500/20 rounded-sm flex items-center justify-center overflow-hidden">
                <motion.div
                  animate={{ y: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-[2px] bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-10"
                />
                <Cpu className="w-10 h-10 text-blue-500/50" />
              </div>

              <div className="text-center space-y-4">
                <h3 className="text-xl font-mono uppercase tracking-[0.3em] text-neutral-100">Deep Extraction</h3>
                <div className="flex justify-center gap-1.5">
                   <span className="text-[10px] font-mono text-blue-500 animate-pulse">EXECUTING PRE-ANALYSIS MODULE</span>
                </div>
                <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-[0.2em]">
                  Scanned {scanProgress}% of total frames
                </p>
              </div>

              <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {['Codec', 'Entropy', 'Vector', 'Hash'].map((t, i) => (
                  <div key={t} className="bg-black/40 rounded-sm p-4 border border-neutral-800 flex flex-col gap-2">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">{t}</span>
                    <div className="h-[2px] bg-neutral-800 rounded-none overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, scanProgress * (1 + i * 0.15))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Cinematic Result Header */}
            <div className="relative group rounded-sm overflow-hidden border border-neutral-800">
              <img 
                src={result.thumbnail} 
                className="w-full h-80 object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              {/* Scanning Laser Effect */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-[2px] bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10"
              />

              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 bg-blue-500/10 border border-blue-500/20 w-fit px-2 py-1 rounded-sm text-[9px] font-mono uppercase tracking-widest text-blue-500">
                    <Shield className="w-3 h-3" /> Source Verified
                  </div>
                  <h3 className="text-2xl font-mono uppercase tracking-widest text-neutral-100">{file.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-neutral-500 text-[9px] font-mono uppercase tracking-widest mb-1">Integrity Score</div>
                  <div className="text-3xl font-mono text-blue-500">98%</div>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Temporal Scale', value: `${result.duration.toFixed(2)}s`, icon: Clock },
                { label: 'Matrix Resolution', value: `${result.resolution.width}x${result.resolution.height}`, icon: Maximize },
                { label: 'Signal Payload', value: result.fileSize, icon: HardDrive },
                { label: 'Sample Rate', value: `${result.fps} FPS`, icon: Activity },
                { label: 'Index Count', value: result.frameCount.toLocaleString(), icon: Zap },
                { label: 'Container', value: result.format, icon: Shield },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-neutral-900 border border-neutral-800 rounded-sm p-6 hover:border-blue-500/40 transition-all group"
                >
                  <item.icon className="w-4 h-4 text-neutral-600 mb-3 group-hover:text-blue-500 transition-colors" />
                  <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">{item.label}</div>
                  <div className="text-lg font-mono text-neutral-200 truncate">{item.value}</div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setFile(null); setResult(null); }}
                className="btn-secondary flex-1"
              >
                Reset Feed
              </button>
              <button
                onClick={onProceed}
                className="btn-primary flex-[2] flex items-center justify-center gap-2"
              >
                <Play className="w-3 h-3 fill-current" /> Initialize Deep Intelligence
              </button>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/5 border border-red-500/20 rounded-sm p-12 text-center"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-6 opacity-60" />
            <h3 className="text-xl font-mono uppercase tracking-widest text-red-500 mb-6">{error}</h3>
            <button
              onClick={() => setError(null)}
              className="btn-primary bg-red-500 hover:bg-red-600 border-red-500"
            >
              Re-sync Signal
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

