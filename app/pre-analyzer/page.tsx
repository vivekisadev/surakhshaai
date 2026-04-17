'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import VideoPreAnalyzer from '@/components/video-pre-analyzer';
import Link from 'next/link';

interface AnalysisResult {
  duration: number;
  resolution: { width: number; height: number };
  frameCount: number;
  fileSize: string;
  codec: string;
  fps: number;
  format: string;
  thumbnail?: string;
}

export default function PreAnalyzerPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleProceedWithAnalysis = async () => {
    if (!selectedFile) return;

    // Create FormData and proceed to upload
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('analysis', JSON.stringify(analysisResult));

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to video analysis page
        window.location.href = `/pages/video/${data.id}`;
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-radial-gradient"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl"></div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 glass backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-green flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
              ✦
            </div>
            <span className="font-bold text-xl">Nazar AI</span>
          </Link>

          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/pages/upload" className="text-white/70 hover:text-white transition-colors">
              Upload
            </Link>
            <Link href="/pages/saved-videos" className="text-white/70 hover:text-white transition-colors">
              Library
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-32 pb-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold mb-4"
          >
            Instant Video <span className="gradient-text-blue">Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/60 mb-6"
          >
            Get comprehensive video analysis before uploading. Validate format, check metadata, and estimate processing time.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {[
              { icon: '⚡', label: 'Instant Analysis' },
              { icon: '🎯', label: 'Format Detection' },
              { icon: '📊', label: 'Metadata Extraction' },
              { icon: '🚀', label: 'Quick Preview' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="glass rounded-full px-4 py-2 border border-white/10 flex items-center gap-2 hover:border-white/20 transition-all"
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-sm text-white/70">{feature.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Pre-Analyzer Component */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <VideoPreAnalyzer
            onAnalysisComplete={(result) => {
              setAnalysisResult(result);
            }}
            onFileSelect={(file) => {
              setSelectedFile(file);
            }}
          />
        </motion.div>

        {/* Action Button */}
        {analysisResult && selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 justify-center"
          >
            <button
              onClick={handleProceedWithAnalysis}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Start AI Analysis
            </button>
          </motion.div>
        )}

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 pt-12 border-t border-white/10"
        >
          <h2 className="text-2xl font-bold mb-8 text-center">How It Works</h2>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Upload Video',
                description: 'Drag and drop or select your video file',
                icon: '📹',
              },
              {
                step: '2',
                title: 'Pre-Analyze',
                description: 'Extract metadata and validate format',
                icon: '🔍',
              },
              {
                step: '3',
                title: 'AI Detection',
                description: 'Run advanced video analysis',
                icon: '🤖',
              },
              {
                step: '4',
                title: 'Review Results',
                description: 'View timeline and insights',
                icon: '✅',
              },
            ].map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className="glass rounded-xl p-6 text-center group hover:bg-white/10 transition-all"
              >
                <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{step.icon}</div>
                <div className="inline-block w-8 h-8 rounded-full bg-neon-blue/20 border border-neon-blue text-neon-blue font-bold mb-3">
                  {step.step}
                </div>
                <h3 className="font-bold mb-2">{step.title}</h3>
                <p className="text-white/60 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Premium Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 pt-12 border-t border-white/10"
        >
          <h2 className="text-2xl font-bold mb-8 text-center">Premium Features</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Real-Time Detection',
                description: 'Detects theft, fire, falls, and altercations in real-time',
                features: ['Instant alerts', '24/7 monitoring', 'Multi-camera support'],
              },
              {
                title: 'Advanced Analytics',
                description: 'Comprehensive insights and detailed reports',
                features: ['Timeline visualization', 'Event statistics', 'Export reports'],
              },
              {
                title: 'AI Chat Integration',
                description: 'Ask questions about your video analysis',
                features: ['Natural language', 'Context-aware', 'Real-time answers'],
              },
              {
                title: 'Secure Storage',
                description: 'Enterprise-grade security for your data',
                features: ['Encrypted storage', 'Auto-backup', 'Easy sharing'],
              },
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="glass rounded-2xl p-6 border border-white/5 group hover:border-neon-blue/30 transition-all"
              >
                <h3 className="text-lg font-bold mb-2 group-hover:text-neon-blue transition-colors">{feature.title}</h3>
                <p className="text-white/60 text-sm mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((f) => (
                    <li key={f} className="text-sm text-white/50 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-neon-green"></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-20 py-8 text-center text-white/50">
        <p>© 2026 Nazar AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
