const DB_NAME = 'brainflush-reminders'
const STORE_NAME = 'reminders'
const DB_VERSION = 1

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

/**
 * Write the full set of tasks with reminders to IDB (for SW access).
 * Only stores tasks that have a reminderAt set and are not archived.
 */
export async function writeReminders(tasks) {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.clear()
  for (const t of tasks) {
    if (t.reminderAt && !t.archived) {
      store.put({
        id: t.id,
        text: t.text,
        reminderAt: t.reminderAt,
        reminderFired: t.reminderFired,
      })
    }
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
