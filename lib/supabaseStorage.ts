/**
 * lib/supabaseStorage.ts
 * ─────────────────────────────────────────────────────────────
 * Handles all video CRUD against Supabase Storage.
 * Bucket: "videos"  (created automatically on first use)
 *
 * Videos are stored at: videos/{userId}/{videoId}.{ext}
 * Metadata stays in localStorage so the app works offline too.
 */

import { createClient } from "@/utils/supabase/client"

const BUCKET = "videos"

export interface VideoMeta {
  id: string
  name: string
  storagePath: string // e.g. "user-id/1234567890.mp4"
  publicUrl: string
  timestamps: { timestamp: string; description: string; isDangerous?: boolean }[]
  uploadedAt: string
  sizeBytes: number
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getFileExt(file: File): string {
  const parts = file.name.split(".")
  return parts.length > 1 ? parts.pop()! : "mp4"
}

export async function saveVideoToSupabase(
  file: File,
  meta: Omit<VideoMeta, "storagePath" | "publicUrl" | "sizeBytes">,
  onProgress?: (pct: number) => void
): Promise<VideoMeta> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const folder = user?.id ?? "anon"
  const ext = getFileExt(file)
  const storagePath = `${folder}/${meta.id}.${ext}`
  const jsonPath = `${folder}/${meta.id}.json`

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Upload Video File with progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url, true)
    xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`)
    xhr.setRequestHeader("apikey", apiKey)
    xhr.setRequestHeader("x-upsert", "true")
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4")

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`))
    })
    xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
    xhr.send(file)
  })

  // Get public URL for video
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  
  const fullMeta: VideoMeta = {
    ...meta,
    storagePath,
    publicUrl: urlData.publicUrl,
    sizeBytes: file.size
  }

  // Upload JSON metadata Sidecar
  const { error: metaError } = await supabase.storage.from(BUCKET).upload(jsonPath, JSON.stringify(fullMeta), {
    contentType: 'application/json',
    upsert: true
  })
  
  if (metaError && onProgress) {
      console.error("Failed to upload metadata to supabase:", metaError)
  }

  // Also save to localStorage for fast initial load/offline
  saveVideoMetaLocally(fullMeta)

  return fullMeta
}

export async function fetchAllVideosFromSupabase(): Promise<VideoMeta[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const folder = user?.id ?? "anon"

  // List all files in folder
  const { data: files, error } = await supabase.storage.from(BUCKET).list(folder)
  if (error || !files) {
    console.error("Error listing files from supabase:", error)
    return []
  }

  const jsonFiles = files.filter(f => f.name.endsWith(".json"))
  const videos: VideoMeta[] = []

  // Fetch each json file metadata
  for (const file of jsonFiles) {
    const { data: fileData } = await supabase.storage.from(BUCKET).download(`${folder}/${file.name}`)
    if (fileData) {
      try {
        const text = await fileData.text()
        videos.push(JSON.parse(text) as VideoMeta)
      } catch (e) {
        console.error("Failed to parse metadata", e)
      }
    }
  }

  // Sync to local storage
  if (videos.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(videos))
      
      const legacyFormat = videos.map(m => ({
        id: m.id,
        name: m.name,
        url: m.publicUrl,
        thumbnailUrl: m.publicUrl,
        timestamps: m.timestamps,
      }))
      localStorage.setItem("savedVideos", JSON.stringify(legacyFormat))
  }

  return videos
}

export async function deleteVideoFromSupabase(id: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const folder = user?.id ?? "anon"

  // We don't know the exact video extension, so just list files with this ID
  const { data: files } = await supabase.storage.from(BUCKET).list(folder, { search: id })
  if (files && files.length > 0) {
      const pathsToDelete = files.map(f => `${folder}/${f.name}`)
      await supabase.storage.from(BUCKET).remove(pathsToDelete)
  }
  
  // Clean local
  deleteVideoMetaLocally(id)
}

// ── Get usable URL ─────────────

export async function getVideoUrl(storagePath: string): Promise<string> {
  const supabase = createClient()
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

// ── LocalStorage metadata helpers ─────────────────────────────────────────────

const LS_KEY = "savedVideos_v2" 

export function saveVideoMetaLocally(meta: VideoMeta): void {
  const existing: VideoMeta[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]")
  const filtered = existing.filter(v => v.id !== meta.id)
  filtered.push(meta)
  localStorage.setItem(LS_KEY, JSON.stringify(filtered))

  const legacyFormat = filtered.map(m => ({
    id: m.id,
    name: m.name,
    url: m.publicUrl,
    thumbnailUrl: m.publicUrl,
    timestamps: m.timestamps,
  }))
  localStorage.setItem("savedVideos", JSON.stringify(legacyFormat))
}

export function getAllVideoMetaLocally(): VideoMeta[] {
  return JSON.parse(localStorage.getItem(LS_KEY) || "[]")
}

export function deleteVideoMetaLocally(id: string): void {
  const existing: VideoMeta[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]")
  const filtered = existing.filter(v => v.id !== id)
  localStorage.setItem(LS_KEY, JSON.stringify(filtered))

  const legacyFormat = filtered.map(m => ({
    id: m.id,
    name: m.name,
    url: m.publicUrl,
    thumbnailUrl: m.publicUrl,
    timestamps: m.timestamps,
  }))
  localStorage.setItem("savedVideos", JSON.stringify(legacyFormat))
}
