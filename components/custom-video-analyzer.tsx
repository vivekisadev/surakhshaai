'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface DetectionEvent {
  timestamp: number;
  type: 'theft' | 'fire' | 'fall' | 'fight' | 'unknown';
  confidence: number;
  description: string;
}

interface CustomVideoAnalyzerProps {
  videoUrl: string;
  isAnalyzing?: boolean;
  detections?: DetectionEvent[];
  progress?: number;
}

const DETECTION_COLORS = {
  theft: '#F46F6F',
  fire: '#F8E082',
  fall: '#6FF4C6',
  fight: '#F59E0B',
  unknown: '#206EF6',
};

const DETECTION_ICONS = {
  theft: '🚨',
  fire: '🔥',
  fall: '⚠️',
  fight: '👊',
  unknown: '🔍',
};

export default function CustomVideoAnalyzer({
  videoUrl,
  isAnalyzing = false,
  detections = [],
  progress = 0,
}: CustomVideoAnalyzerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const updateProgress = () => {
        const percent = (video.currentTime / video.duration) * 100;
        setCurrentFrame(percent);
      };

      const updateDuration = () => {
        setTotalFrames(video.duration);
      };

      video.addEventListener('timeupdate', updateProgress);
      video.addEventListener('loadedmetadata', updateDuration);

      return () => {
        video.removeEventListener('timeupdate', updateProgress);
        video.removeEventListener('loadedmetadata', updateDuration);
      };
    }
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Video Player with Overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full rounded-2xl overflow-hidden shadow-2xl group"
      >
        {/* Video Container */}
        <div className="relative w-full bg-black rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full"
          />

          {/* Analysis Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16"
              >
                <svg className="w-full h-full text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </motion.div>
            </div>
          )}

          {/* Detection Markers on Timeline */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 group-hover:h-2 transition-all">
            {detections.map((detection, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position: 'absolute',
                  left: `${(detection.timestamp / totalFrames) * 100}%`,
                  backgroundColor: DETECTION_COLORS[detection.type],
                }}
                className="w-1 h-full hover:w-2 group-hover:h-full transition-all cursor-pointer"
                title={`${detection.type}: ${detection.confidence}%`}
              />
            ))}
          </div>
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 glass rounded-lg px-3 py-1.5 flex items-center gap-2"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-neon-green"
          />
          <span className="text-xs font-semibold text-white">Live Analysis</span>
        </motion.div>
      </motion.div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Analysis Progress</h3>
            <span className="text-neon-blue font-bold">{Math.round(progress)}%</span>
          </div>

          {/* Main Progress Bar */}
          <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-6">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-blue via-neon-green to-neon-blue"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Analysis Steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Frame Extraction', progress: progress > 20 ? 100 : progress * 5 },
              { name: 'Object Detection', progress: progress > 40 ? 100 : Math.max(0, (progress - 20) * 5) },
              { name: 'Classification', progress: progress > 70 ? 100 : Math.max(0, (progress - 40) * 5) },
              { name: 'Report Generation', progress: progress > 90 ? 100 : Math.max(0, (progress - 70) * 5) },
            ].map((step, idx) => (
              <motion.div
                key={step.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white/70">{step.name}</p>
                  {step.progress === 100 && (
                    <svg className="w-4 h-4 text-neon-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-blue to-neon-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detection Results */}
      {detections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="font-bold text-lg mb-6">Detections Timeline</h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {detections.map((detection, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 rounded-lg p-4 border-l-4 hover:bg-white/10 transition-all group cursor-pointer"
                style={{ borderColor: DETECTION_COLORS[detection.type] }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{DETECTION_ICONS[detection.type]}</span>
                    <div className="flex-1">
                      <p className="font-bold text-white capitalize">{detection.type}</p>
                      <p className="text-sm text-white/60">{detection.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{detection.confidence}%</p>
                    <p className="text-xs text-white/60">{detection.timestamp.toFixed(2)}s</p>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${detection.confidence}%` }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    style={{
                      background: `linear-gradient(90deg, ${DETECTION_COLORS[detection.type]}, ${DETECTION_COLORS[detection.type]}cc)`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Statistics Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          {
            label: 'Total Detections',
            value: detections.length,
            color: 'neon-blue',
            icon: '🎯',
          },
          {
            label: 'High Confidence',
            value: detections.filter((d) => d.confidence > 80).length,
            color: 'neon-green',
            icon: '✅',
          },
          {
            label: 'Avg Confidence',
            value: (
              detections.reduce((sum, d) => sum + d.confidence, 0) / Math.max(detections.length, 1)
            ).toFixed(0) + '%',
            color: 'neon-yellow',
            icon: '📊',
          },
          {
            label: 'Duration',
            value: totalFrames ? totalFrames.toFixed(1) + 's' : '—',
            color: 'neon-orange',
            icon: '⏱️',
          },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="glass rounded-xl p-4 text-center group hover:bg-white/10 transition-all"
          >
            <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">{stat.icon}</div>
            <p className="text-white/60 text-sm mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
