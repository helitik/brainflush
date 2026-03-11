const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.8
const SKIP_THRESHOLD = 200 * 1024 // 200 KB

export function generateImageId() {
  return `img_${crypto.randomUUID()}`
}

export function validateImageFile(file) {
  if (file.type === 'image/svg+xml') return 'invalidType'
  if (!file.type.startsWith('image/')) return 'invalidType'
  if (file.size > MAX_SIZE_BYTES) return 'tooLarge'
  return null
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function processImage(file) {
  const error = validateImageFile(file)
  if (error) throw new Error(error)

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const { naturalWidth: w, naturalHeight: h } = img

    // Skip reprocessing if already small enough
    if (file.size < SKIP_THRESHOLD && w <= MAX_DIMENSION && h <= MAX_DIMENSION) {
      const blob = file.slice(0, file.size, file.type)
      return { blob, mimeType: file.type, width: w, height: h }
    }

    // Compute target dimensions
    let tw = w, th = h
    if (Math.max(w, h) > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(w, h)
      tw = Math.round(w * scale)
      th = Math.round(h * scale)
    }

    // Resize via canvas
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      canvas.width = 0
      canvas.height = 0
      throw new Error('Canvas 2D context not available')
    }
    ctx.drawImage(img, 0, 0, tw, th)

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((result) => {
        if (!result) reject(new Error('Failed to create image blob'))
        else resolve(result)
      }, 'image/jpeg', JPEG_QUALITY)
    )

    // Release canvas memory (important on mobile with limited GPU memory)
    canvas.width = 0
    canvas.height = 0

    return { blob, mimeType: 'image/jpeg', width: tw, height: th }
  } finally {
    URL.revokeObjectURL(url)
  }
}
