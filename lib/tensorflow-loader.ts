// TensorFlow.js loader utility to prevent SSR issues
import type * as tf from '@tensorflow/tfjs'
import type * as blazeface from '@tensorflow-models/blazeface'
import type * as posedetection from '@tensorflow-models/pose-detection'

let tfjs: typeof tf | null = null
let blazefaceModel: typeof blazeface | null = null
let poseDetection: typeof posedetection | null = null
let isInitialized = false

export interface TensorFlowModules {
  tfjs: typeof tf
  blazefaceModel: typeof blazeface
  poseDetection: typeof posedetection
}

export async function loadTensorFlowModules(): Promise<TensorFlowModules | null> {
  // Only run on client side
  if (typeof window === 'undefined') {
    return null
  }

  // Return cached modules if already loaded
  if (isInitialized && tfjs && blazefaceModel && poseDetection) {
    return { tfjs, blazefaceModel, poseDetection }
  }

  try {
    console.log('Loading TensorFlow.js modules...')
    
    // Load TensorFlow.js first
    tfjs = await import('@tensorflow/tfjs')
    
    // Wait for TF.js to be ready
    await tfjs.ready()
    
    // Try to set backend with fallback options
    try {
      // First try WebGL (most compatible)
      await tfjs.setBackend('webgl')
      await tfjs.ready()
      console.log('Using WebGL backend')
    } catch (webglError) {
      console.log('WebGL not available, falling back to CPU:', webglError)
      try {
        await tfjs.setBackend('cpu')
        await tfjs.ready()
        console.log('Using CPU backend')
      } catch (cpuError) {
        console.error('No TensorFlow.js backend available:', cpuError)
        throw new Error('TensorFlow.js backend initialization failed')
      }
    }
    
    // Configure TF.js for better performance (only for WebGL)
    if (tfjs.getBackend() === 'webgl') {
      tfjs.env().set('WEBGL_FORCE_F16_TEXTURES', false) // Disable for compatibility
      tfjs.env().set('WEBGL_PACK', true) // Enable texture packing
      tfjs.env().set('WEBGL_CHECK_NUMERICAL_PROBLEMS', false) // Disable numerical checks
    }
    
    // Load models in parallel
    console.log('Loading AI models...')
    const [blazefaceModule, poseDetectionModule] = await Promise.all([
      import('@tensorflow-models/blazeface'),
      import('@tensorflow-models/pose-detection')
    ])

    blazefaceModel = blazefaceModule
    poseDetection = poseDetectionModule
    isInitialized = true
    
    console.log('TensorFlow.js modules loaded successfully')
    return { tfjs, blazefaceModel, poseDetection }
  } catch (error) {
    console.error('Failed to load TensorFlow.js modules:', error)
    isInitialized = false
    return null
  }
}

export function getTensorFlowModules(): TensorFlowModules | null {
  if (isInitialized && tfjs && blazefaceModel && poseDetection) {
    return { tfjs, blazefaceModel, poseDetection }
  }
  return null
}

export function isTensorFlowReady(): boolean {
  return isInitialized && !!tfjs && !!blazefaceModel && !!poseDetection
}