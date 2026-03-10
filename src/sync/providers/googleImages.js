import { getAccessToken, driveApi } from './google'
import { IMAGE_FILE_PREFIX } from '../syncConstants'
import { getImage, putImage, deleteImage, getAllImageIds, getProtectedIds } from '../../lib/imageStore'

function extensionForMime(mimeType) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

function imageIdFromName(name) {
  // name = "brainflush-img-img_xxxx.jpg"
  const stripped = name.replace(IMAGE_FILE_PREFIX, '').replace(/\.[^.]+$/, '')
  return stripped
}

export async function uploadImage(imageId, blob, mimeType) {
  const token = await getAccessToken()
  const ext = extensionForMime(mimeType)
  const metadata = {
    name: `${IMAGE_FILE_PREFIX}${imageId}.${ext}`,
    parents: ['appDataFolder'],
  }
  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  )
  form.append('file', new Blob([blob], { type: mimeType }))

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )
  if (!res.ok) throw new Error(`Image upload failed: ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function downloadImage(driveFileId) {
  const token = await getAccessToken()
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  return await res.blob()
}

export async function deleteRemoteImage(driveFileId) {
  await driveApi(`/files/${driveFileId}`, { method: 'DELETE' })
}

export async function listRemoteImages() {
  const result = new Map()
  let pageToken = null

  do {
    const params = new URLSearchParams({
      spaces: 'appDataFolder',
      q: `name contains '${IMAGE_FILE_PREFIX}'`,
      fields: 'nextPageToken,files(id,name)',
      pageSize: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await driveApi(`/files?${params}`)
    const data = await res.json()

    for (const file of data.files || []) {
      const imageId = imageIdFromName(file.name)
      result.set(imageId, { driveFileId: file.id, name: file.name })
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return result
}

export async function syncImages(allReferencedIds) {
  // allReferencedIds can be a function (returns fresh IDs) or an array
  const getIds = typeof allReferencedIds === 'function' ? allReferencedIds : () => allReferencedIds
  const referencedSet = new Set(getIds())
  const remoteMap = await listRemoteImages()
  const localIds = new Set(await getAllImageIds())

  // Upload: local images not yet on Drive
  for (const id of localIds) {
    if (referencedSet.has(id) && !remoteMap.has(id)) {
      const record = await getImage(id)
      if (record) {
        try {
          await uploadImage(id, record.blob, record.mimeType)
        } catch (e) {
          console.warn('[sync] image upload error:', id, e)
        }
      }
    }
  }

  // Download: remote images not in local IndexedDB
  for (const [id, { driveFileId, name }] of remoteMap) {
    if (referencedSet.has(id) && !localIds.has(id)) {
      try {
        const blob = await downloadImage(driveFileId)
        const ext = name.split('.').pop()
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
        // Read dimensions from the downloaded blob
        let width, height
        try {
          const url = URL.createObjectURL(blob)
          const img = await new Promise((resolve, reject) => {
            const i = new Image()
            i.onload = () => resolve(i)
            i.onerror = reject
            i.src = url
          })
          width = img.naturalWidth
          height = img.naturalHeight
          URL.revokeObjectURL(url)
        } catch {
          // Dimensions unavailable — store without them
        }
        await putImage({ id, blob, mimeType, width, height, createdAt: Date.now() })
      } catch (e) {
        console.warn('[sync] image download error:', id, e)
      }
    }
  }

  // Re-read referenced IDs for cleanup (state may have changed during upload/download)
  const freshReferencedSet = new Set(getIds())

  // Cleanup orphans: images not referenced by any task (skip protected images being picked)
  const protectedSet = getProtectedIds()
  for (const id of localIds) {
    if (!freshReferencedSet.has(id) && !protectedSet.has(id)) {
      deleteImage(id).catch(() => {})
    }
  }
  for (const [id, { driveFileId }] of remoteMap) {
    if (!freshReferencedSet.has(id)) {
      deleteRemoteImage(driveFileId).catch(() => {})
    }
  }
}
