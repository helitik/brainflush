import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

// Precache all assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA fallback — serve index.html for navigation requests (except /api/)
const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//],
}))

// --- IndexedDB helpers (inline, no imports) ---

function openReminderDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('brainflush-reminders', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readReminders() {
  const db = await openReminderDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reminders', 'readonly')
    const store = tx.objectStore('reminders')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function markFiredInDb(id) {
  const db = await openReminderDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reminders', 'readwrite')
    const store = tx.objectStore('reminders')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const item = getReq.result
      if (item) {
        item.reminderFired = true
        store.put(item)
      }
      resolve()
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

// --- Notification click handler ---

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const taskId = event.notification.data?.taskId
  const url = new URL(taskId ? `/?taskId=${taskId}` : '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (taskId) client.postMessage({ type: 'open-task', taskId })
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// --- Periodic Background Sync (Android Chrome only) ---

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndFireReminders())
  }
})

async function checkAndFireReminders() {
  try {
    const reminders = await readReminders()
    const now = Date.now()
    for (const r of reminders) {
      if (r.reminderAt && r.reminderAt <= now && !r.reminderFired) {
        await self.registration.showNotification('Brainflush', {
          body: r.text,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `reminder-${r.id}`,
          renotify: true,
          vibrate: [200],
          silent: false,
          data: { taskId: r.id },
        })
        await markFiredInDb(r.id)
      }
    }
  } catch (e) {
    console.error('[sw] periodic sync error:', e)
  }
}
