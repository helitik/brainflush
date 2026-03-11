const DB_NAME = 'brainflush-images'
const STORE_NAME = 'images'
const DB_VERSION = 1

// Module-level cache for object URLs
const urlCache = new Map()

// Protected images: images picked but not yet submitted as part of a task.
// Prevents sync cleanup from deleting them as orphans.
const protectedIds = new Set()
export function protectImage(id) { protectedIds.add(id) }
export function unprotectImage(id) { protectedIds.delete(id) }
export function getProtectedIds() { return protectedIds }

// Notify listeners when images are added to IndexedDB
const imageReadyListeners = new Set()
export function onImageReady(cb) {
  imageReadyListeners.add(cb)
  return () => imageReadyListeners.delete(cb)
}
function notifyImageReady(id) {
  for (const cb of imageReadyListeners) cb(id)
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getImage(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function putImage(record) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => { notifyImageReady(record.id); resolve() }
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteImage(id) {
  revokeImageUrl(id)
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllImageIds() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAllKeys()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function clearAllImages() {
  // Revoke all cached URLs
  for (const [id, url] of urlCache) {
    URL.revokeObjectURL(url)
  }
  urlCache.clear()
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getImageUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id)
  const record = await getImage(id)
  if (!record) return null
  const url = URL.createObjectURL(record.blob)
  urlCache.set(id, url)
  return url
}

export function revokeImageUrl(id) {
  const url = urlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(id)
  }
}
