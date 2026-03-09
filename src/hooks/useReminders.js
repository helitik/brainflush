import { useEffect, useRef } from 'react'
import { useStore } from './useStore'
import { writeReminders } from '../lib/reminderDb'

/**
 * Request notification permission lazily (called from UI on first reminder).
 * Returns true if granted.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

async function showNotification(task) {
  const title = 'Brainflush'
  const options = {
    body: task.text,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `reminder-${task.id}`,
    renotify: true,
    vibrate: [200],
    silent: false,
    data: { taskId: task.id },
  }

  // Try SW notification first (required on mobile)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, options)
      return true
    } catch { /* fallthrough to Notification API */ }
  }

  // Fallback: Notification API (works on desktop, not mobile)
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options)
      return true
    }
  } catch { /* ignore */ }

  return false
}

/**
 * Core reminder engine hook. Call once in App.jsx.
 * Handles catch-up on mount/visibility, scheduling future reminders,
 * and syncing reminder data to IndexedDB for the SW.
 */
async function checkAndSchedule(timerRef) {
  // Clear previous timer
  if (timerRef.current) {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const state = useStore.getState()
  const now = Date.now()

  // Fire all overdue unfired reminders
  for (const task of state.tasks) {
    if (
      task.reminderAt &&
      task.reminderAt <= now &&
      !task.reminderFired &&
      !task.archived
    ) {
      const shown = await showNotification(task)
      if (shown) {
        state.markReminderFired(task.id)
      }
    }
  }

  // Schedule next future reminder
  const tasks = useStore.getState().tasks // re-read after potential markReminderFired calls
  let nearest = Infinity
  for (const task of tasks) {
    if (
      task.reminderAt &&
      task.reminderAt > Date.now() &&
      !task.reminderFired &&
      !task.archived
    ) {
      if (task.reminderAt < nearest) nearest = task.reminderAt
    }
  }

  if (nearest < Infinity) {
    const delay = Math.max(nearest - Date.now(), 100)
    timerRef.current = setTimeout(() => checkAndSchedule(timerRef), delay)
  }
}

export function useReminderEngine() {
  const timerRef = useRef(null)

  // Subscribe to task changes
  useEffect(() => {
    // Initial check
    checkAndSchedule(timerRef)

    let prevTasks = useStore.getState().tasks
    const unsub = useStore.subscribe((state) => {
      if (state.tasks !== prevTasks) {
        prevTasks = state.tasks
        // Sync to IndexedDB for SW
        writeReminders(state.tasks).catch(() => {})
        // Re-check and re-schedule
        checkAndSchedule(timerRef)
      }
    })

    const ref = timerRef
    return () => {
      unsub()
      clearTimeout(ref.current)
    }
  }, [])

  // Catch-up on visibility change (tab refocus / app reopen)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        checkAndSchedule(timerRef)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Register periodic background sync (best-effort)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if ('periodicSync' in reg) {
          reg.periodicSync
            .register('check-reminders', { minInterval: 60 * 60 * 1000 })
            .catch(() => {})
        }
      })
      // Also write initial reminder data to IDB
      writeReminders(useStore.getState().tasks).catch(() => {})
    }
  }, [])
}
