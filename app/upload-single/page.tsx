'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import VideoPreAnalyzer from '@/components/video-pre-analyzer';
import Link from 'next/link';

interface VideoAnalysisData {
  duration: number;
  resolution: { width: number; height: number };
  frameCount: number;
  fileSize: string;
  codec: string;
  fps: number;
  format: string;
  thumbnail?: string;
}

export default function UploadOneVideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysisData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProceedWithAnalysis = async () => {
    if (!file || !analysis) return;

    setUploading(true);
    setAnalyzing(true);

    try {
      // Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(analysis));

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();

      // Trigger analysis
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: uploadData.id,
          file: file.name,
          metadata: analysis,
        }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed');
      }

      // Redirect to video page
      window.location.href = `/pages/video/${uploadData.id}`;
    } catch (error) {
      console.error('Error:', error);
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-radial-gradient"></div>
      <div className="absolute top-20 right-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl"></div>

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

          <nav className="hidden md:flex gap-8">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/pages/pre-analyzer" className="text-white/70 hover:text-white transition-colors">
              Pre-Analyzer
            </Link>
            <Link href="/pages/saved-videos" className="text-white/70 hover:text-white transition-colors">
              Library
            </Link>
            <Link href="/pages/statistics" className="text-white/70 hover:text-white transition-colors">
              Statistics
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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block mb-6"
          >
            <div className="inline-block px-4 py-2 glass rounded-full border border-white/20">
              <span className="text-neon-blue font-semibold">🚀 Premium Analysis</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold mb-4"
          >
            Upload & Analyze
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold mb-6 gradient-text"
          >
            Your Security Video
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-white/60 max-w-2xl mx-auto"
          >
            Upload a single video and let our AI detect threats in real-time. Get instant insights with our advanced detection system.
          </motion.p>
        </motion.div>

        {/* Upload Area with Steps */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          {!uploading ? (
            <>
              <VideoPreAnalyzer
                onAnalysisComplete={(result) => {
                  setAnalysis(result);
                }}
                onFileSelect={(selectedFile) => {
                  setFile(selectedFile);
                }}
              />

              {/* Action Button */}
              {analysis && file && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex gap-4 justify-center"
                >
                  <button
                    onClick={handleProceedWithAnalysis}
                    className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start AI Analysis
                  </button>

                  <Link
                    href="/pages/pre-analyzer"
                    className="btn-secondary flex items-center gap-2 text-lg px-8 py-4"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </Link>
                </motion.div>
              )}
            </>
          ) : (
            // Upload Progress
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-3xl p-12 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto mb-6"
              >
                <svg className="w-full h-full text-neon-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </motion.div>

              <h3 className="text-2xl font-bold mb-2">Analyzing Your Video</h3>
              <p className="text-white/60 mb-8">
                {analyzing ? 'Running AI detection models...' : 'Uploading video...'}
              </p>

              {/* Progress Bar */}
              <div className="space-y-4">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-blue to-neon-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-white/60">{uploadProgress}% Complete</p>
              </div>

              {/* Step Indicators */}
              <div className="mt-8 space-y-3 text-left max-w-sm mx-auto">
                {[
                  { done: uploadProgress > 25, label: 'Uploading video' },
                  { done: uploadProgress > 50, label: 'Processing frames' },
                  { done: uploadProgress > 75, label: 'Running detection models' },
                  { done: uploadProgress > 90, label: 'Generating results' },
                ].map((step, idx) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    {step.done ? (
                      <div className="w-5 h-5 rounded-full bg-neon-green flex items-center justify-center">
                        <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-5 h-5 rounded-full bg-neon-blue/50"
                      />
                    )}
                    <span className={step.done ? 'text-white/60' : 'text-white'}>{step.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 pt-12 border-t border-white/10"
        >
          <h2 className="text-3xl font-bold mb-8 text-center">Detection Capabilities</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '🚨', title: 'Theft Detection', desc: 'Identify suspicious activity' },
              { icon: '🔥', title: 'Fire Detection', desc: 'Detect smoke and flames' },
              { icon: '⚠️', title: 'Fall Detection', desc: 'Alert on person falls' },
              { icon: '👊', title: 'Fight Detection', desc: 'Detect altercations' },
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + idx * 0.05 }}
                className="glass rounded-xl p-4 hover:bg-white/10 transition-all group"
              >
                <div className="text-3xl mb-2 group-hover:scale-125 transition-transform">{feature.icon}</div>
                <h3 className="font-bold text-sm">{feature.title}</h3>
                <p className="text-white/50 text-xs mt-1">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}