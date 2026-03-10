import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getImageUrl, revokeImageUrl, putImage, onImageReady, protectImage } from '../lib/imageStore'
import { processImage, generateImageId, validateImageFile } from '../lib/imageUtils'

export async function processFiles(files, maxCount = 3) {
  const ids = []
  const errors = []
  for (const file of files.slice(0, maxCount)) {
    const validationError = validateImageFile(file)
    if (validationError) {
      errors.push(validationError)
      continue
    }
    try {
      const { blob, mimeType, width, height } = await processImage(file)
      const id = generateImageId()
      await putImage({ id, blob, mimeType, width, height, size: blob.size, createdAt: Date.now() })
      protectImage(id)
      ids.push(id)
    } catch (e) {
      errors.push(e.message)
    }
  }
  return { ids, errors }
}

export function useTaskImages(imageIds) {
  const [images, setImages] = useState([])
  const mountedRef = useRef(true)
  const idsRef = useRef(imageIds)
  idsRef.current = imageIds

  useEffect(() => {
    mountedRef.current = true
    if (!imageIds?.length) {
      setImages([])
      return
    }

    setImages(imageIds.map((id) => ({ id, url: null, loading: true, error: null })))

    for (const id of imageIds) {
      getImageUrl(id)
        .then((url) => {
          if (!mountedRef.current) return
          setImages((prev) =>
            prev.map((img) => (img.id === id ? { ...img, url, loading: false } : img))
          )
        })
        .catch(() => {
          if (!mountedRef.current) return
          setImages((prev) =>
            prev.map((img) => (img.id === id ? { ...img, loading: false, error: true } : img))
          )
        })
    }

    return () => {
      mountedRef.current = false
    }
  }, [imageIds?.join(',')])

  // Re-fetch when an image becomes available in IndexedDB (e.g. after sync download)
  useEffect(() => {
    const unsub = onImageReady((id) => {
      if (!idsRef.current?.includes(id)) return
      getImageUrl(id).then((url) => {
        if (!url) return
        setImages((prev) =>
          prev.map((img) => (img.id === id ? { ...img, url, loading: false, error: null } : img))
        )
      })
    })
    return unsub
  }, [])

  return images
}

const MAX_IMAGES_PER_TASK = 3

export function useImagePicker() {
  const [pending, setPending] = useState(false)

  const pickImages = useCallback((currentCount = 0) => {
    return new Promise((resolve) => {
      const remaining = MAX_IMAGES_PER_TASK - currentCount
      if (remaining <= 0) {
        resolve({ ids: [], errors: [] })
        return
      }

      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = remaining > 1

      input.onchange = async () => {
        const files = Array.from(input.files || [])
        if (!files.length) {
          resolve({ ids: [], errors: [] })
          return
        }

        setPending(true)
        const result = await processFiles(files, remaining)
        setPending(false)
        resolve(result)
      }

      // Handle cancel (no file selected)
      input.oncancel = () => resolve({ ids: [], errors: [] })
      input.click()
    })
  }, [])

  return { pickImages, pending }
}

export function useFileDrop(onDrop, { enabled = true, maxFiles = 3 } = {}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const counterRef = useRef(0)

  const handlers = useMemo(() => {
    if (!enabled) return {}
    return {
      onDragEnter(e) {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        counterRef.current++
        setIsDragOver(true)
      },
      onDragOver(e) {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      },
      onDragLeave(e) {
        if (!e.dataTransfer.types.includes('Files')) return
        counterRef.current--
        if (counterRef.current <= 0) {
          counterRef.current = 0
          setIsDragOver(false)
        }
      },
      async onDrop(e) {
        e.preventDefault()
        e.stopPropagation()
        counterRef.current = 0
        setIsDragOver(false)
        const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))
        if (!files.length) return
        onDrop(files.slice(0, maxFiles))
      },
    }
  }, [enabled, maxFiles, onDrop])

  return { isDragOver, handlers }
}
