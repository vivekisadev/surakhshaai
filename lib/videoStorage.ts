/**
 * videoStorage.ts
 * ─────────────────────────────────────────────────────
 * Stores video blobs in IndexedDB so they survive page
 * reloads and cross-session navigation.
 *
 * Metadata (name, id, timestamps …) stays in localStorage
 * as before, but the actual binary data lives in IndexedDB.
 */

const DB_NAME = 'nazar-ai-videos'
const DB_VERSION = 1
const STORE_NAME = 'video-blobs'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Save a Blob under the given key (e.g. video id).
 */
export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Load a Blob and return a persistent object URL for it.
 * Returns null if not found.
 */
export async function getVideoBlobUrl(id: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => {
      const blob: Blob | undefined = req.result
      if (!blob) { resolve(null); return }
      resolve(URL.createObjectURL(blob))
    }
    req.onerror = () => reject(req.error)
  })
}

/**
 * Delete a video blob from IndexedDB (call when user deletes a saved video).
 */
export async function deleteVideoBlob(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
