import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'File must be a video' },
        { status: 400 }
      );
    }

    // Convert file to Buffer and extract metadata
    const buffer = await file.arrayBuffer();
    const fileSize = buffer.byteLength;

    // Extract basic metadata from video file
    // Note: In production, you'd use a library like ffprobe or mediainfo
    const metadata = {
      fileName: file.name,
      fileSize: fileSize,
      fileType: file.type,
      format: file.type.split('/')[1]?.toUpperCase() || 'MP4',
      lastModified: new Date(file.lastModified).toISOString(),
    };

    // Return pre-analysis result
    return NextResponse.json({
      success: true,
      metadata: metadata,
      estimatedProcessingTime: {
        min: Math.ceil(fileSize / (5 * 1024 * 1024)), // Rough estimate
        max: Math.ceil(fileSize / (1 * 1024 * 1024)),
      },
      supportedFeatures: [
        'fire_smoke_detection',
        'aggression_detection',
        'crowd_person_counting',
        'patient_fall_detection',
        'unauthorized_access',
        'staff_negligence',
        'infant_perimeter_breach',
        'violence_against_staff',
      ],
      aiModels: {
        hf_models: ['EdBianchi/vit-fire-detection', 'dima806/facial_emotions_image_detection', 'facebook/detr-resnet-50'],
        gemini: 'gemini-2.5-flash (hospital context)',
        routing: 'Specialized → HF; Complex scene → Gemini',
      },
    });
  } catch (error) {
    console.error('Pre-analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Pre-analyze endpoint - POST required',
    supportedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    maxFileSize: '500MB',
  });
}
