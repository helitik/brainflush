import { useRef, useCallback } from 'react'

const LOCK_THRESHOLD = 10

export function useSwipeToDismiss(onDismiss, { threshold = 80 } = {}) {
  const sheetRef = useRef(null)
  const startY = useRef(null)
  const startX = useRef(null)
  const currentY = useRef(0)
  const locked = useRef(null)

  const onTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY
    startX.current = e.touches[0].clientX
    currentY.current = 0
    locked.current = null
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none'
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return
    const deltaX = e.touches[0].clientX - startX.current
    const deltaY = e.touches[0].clientY - startY.current

    if (locked.current === null) {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      if (absX < LOCK_THRESHOLD && absY < LOCK_THRESHOLD) return
      locked.current = absX > absY ? 'horizontal' : 'vertical'
    }

    if (locked.current === 'horizontal') return

    if (deltaY > 0) {
      currentY.current = deltaY
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`
      }
    } else {
      currentY.current = 0
      if (sheetRef.current) {
        sheetRef.current.style.transform = ''
      }
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    const el = sheetRef.current
    if (!el) {
      startY.current = null
      startX.current = null
      currentY.current = 0
      locked.current = null
      return
    }
    el.style.transition = 'transform 0.2s ease-out'
    if (currentY.current > threshold) {
      el.style.transform = 'translateY(100%)'
      setTimeout(() => onDismiss(), 200)
    } else {
      el.style.transform = ''
    }
    startY.current = null
    startX.current = null
    currentY.current = 0
    locked.current = null
  }, [threshold, onDismiss])

  return {
    sheetRef,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
