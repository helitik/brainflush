import { useEffect, useRef } from 'react'

const navStack = []
let skipNextPopstate = false

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (skipNextPopstate) {
      skipNextPopstate = false
      return
    }
    if (navStack.length > 0) {
      const handler = navStack.pop()
      handler()
    }
  })

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navStack.length > 0) {
      e.preventDefault()
      const handler = navStack.pop()
      handler()
      skipNextPopstate = true
      history.back()
    }
  })
}

function pushNavHandler(handler) {
  navStack.push(handler)
  history.pushState({ guard: true }, '')
}

function removeNavHandler(handler) {
  const idx = navStack.indexOf(handler)
  if (idx !== -1) navStack.splice(idx, 1)
}

/**
 * Intercepts browser back button to close an overlay instead of navigating.
 */
export function useBackClose(isOpen, onClose) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  const handlerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handler = () => onCloseRef.current()
    handlerRef.current = handler
    pushNavHandler(handler)

    return () => removeNavHandler(handlerRef.current)
  }, [isOpen])
}

/**
 * Tracks value changes (e.g. active tab) and allows back to restore previous values.
 */
export function useNavigationBack(value, onRestore) {
  const prevRef = useRef(value)
  const restoringRef = useRef(false)
  const onRestoreRef = useRef(onRestore)
  useEffect(() => { onRestoreRef.current = onRestore })
  const handlersRef = useRef([])

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = value

    if (prev === value) return

    if (restoringRef.current) {
      restoringRef.current = false
      return
    }

    const handler = () => {
      restoringRef.current = true
      onRestoreRef.current(prev)
    }
    handlersRef.current.push(handler)
    pushNavHandler(handler)
  }, [value])

  useEffect(() => {
    return () => {
      handlersRef.current.forEach((h) => removeNavHandler(h))
      handlersRef.current = []
    }
  }, [])
}
