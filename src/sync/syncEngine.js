import { useStore, getMaxPinnedTabs } from '../hooks/useStore'
import { github } from './providers/github'
import { google } from './providers/google'
import { SYNC_DEBOUNCE_MS, SYNC_POLL_INTERVAL_MS, GOOGLE_REFRESH_INTERVAL_MS, SYNC_BASE_KEY } from './syncConstants'
import { threeWayMerge } from './merge'

const providers = { github, google }

function getProvider() {
  const name = useStore.getState().syncProvider
  return name ? providers[name] : null
}

function extractData(state) {
  const { tabs, columns, tasks, activeTabId, theme, language, showArchive } = state
  return {
    tabs: tabs.map(({ pinnedOrder, ...rest }) => rest),
    columns, tasks, activeTabId, theme, language, showArchive,
  }
}

function preserveLocalPins(incomingData) {
  const localTabs = useStore.getState().tabs
  const localPinMap = new Map(localTabs.map(t => [t.id, t.pinnedOrder]))

  const max = getMaxPinnedTabs()
  let pinnedCount = 0

  // First pass: restore local pins (respect max)
  let tabs = incomingData.tabs.map(t => {
    const localPin = localPinMap.get(t.id)
    if (localPin != null && pinnedCount < max) {
      pinnedCount++
      return { ...t, pinnedOrder: localPin }
    }
    return { ...t, pinnedOrder: null }
  })

  // Second pass: auto-pin new tabs (not in local) to fill remaining slots
  tabs = tabs.map(t => {
    if (t.pinnedOrder == null && !localPinMap.has(t.id) && pinnedCount < max) {
      return { ...t, pinnedOrder: pinnedCount++ }
    }
    return t
  })

  // Recompact pinnedOrder to 0,1,2...
  const pinned = tabs.filter(t => t.pinnedOrder != null).sort((a, b) => a.pinnedOrder - b.pinnedOrder)
  const pinMap = new Map(pinned.map((t, i) => [t.id, i]))
  tabs = tabs.map(t => ({ ...t, pinnedOrder: pinMap.get(t.id) ?? null }))

  return { ...incomingData, tabs }
}

function buildEnvelope(data, updatedAt) {
  return {
    envelope: 1,
    updatedAt: updatedAt || Date.now(),
    appVersion: 5,
    data,
  }
}

// --- Sync base helpers (localStorage) ---

function saveBase(data) {
  try {
    localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[sync] failed to save base:', e)
  }
}

function loadBase() {
  try {
    const raw = localStorage.getItem(SYNC_BASE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearBase() {
  localStorage.removeItem(SYNC_BASE_KEY)
}

// Fields that constitute "user data" changes (not sync metadata)
const DATA_KEYS = ['tabs', 'columns', 'tasks', 'theme', 'language']

function stateSnapshot(state) {
  return DATA_KEYS.map((k) => state[k])
}

let debounceTimer = null
let refreshInterval = null
let pollInterval = null
let onlineHandler = null
let offlineHandler = null
let visibilityHandler = null
let focusHandler = null
let unsubscribe = null
let hasPendingPush = false
let prevSnapshot = null
let isSyncing = false
let retryTimer = null
let retryCount = 0
let pullRetryTimer = null
let pullRetried = false
const MAX_RETRIES = 5

function autoDisconnect() {
  const name = useStore.getState().syncProvider
  const provider = getProvider()
  stopSyncEngine()
  if (provider) provider.disconnect()
  clearBase()
  useStore.getState().setSyncProvider(null)
  useStore.getState().setDisconnectedProvider(name)
}

function scheduleRetry() {
  if (retryCount >= MAX_RETRIES) return
  const delay = Math.min(5000 * 2 ** retryCount, 60000)
  retryCount++
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (navigator.onLine !== false) {
      doPush()
    } else {
      hasPendingPush = true
    }
  }, delay)
}

async function doPush() {
  const provider = getProvider()
  if (!provider) return
  if (isSyncing) {
    hasPendingPush = true
    return
  }

  isSyncing = true
  const store = useStore.getState()
  store.setSyncStatus('syncing')

  try {
    const localData = extractData(store)
    const remoteUpdatedAt = await provider.getRemoteUpdatedAt()
    const lastSynced = store.lastSyncedAt

    if (remoteUpdatedAt && lastSynced && remoteUpdatedAt > lastSynced) {
      // Remote changed since last sync — need to merge
      const envelope = await provider.pull()
      if (envelope?.data) {
        const base = loadBase()
        const preferRemote = !(store.localModifiedAt && store.localModifiedAt > remoteUpdatedAt)
        const merged = threeWayMerge(base, localData, envelope.data, preferRemote)

        useStore.getState().replaceData(preserveLocalPins(merged))
        // Update snapshot so the replaceData doesn't re-trigger a push
        prevSnapshot = stateSnapshot(useStore.getState())

        const mergedEnvelope = buildEnvelope(merged)
        await provider.push(mergedEnvelope)
        useStore.getState().setLastSyncedAt(mergedEnvelope.updatedAt)
        saveBase(merged)
      }
    } else {
      // No remote conflict — push directly
      const envelope = buildEnvelope(localData, store.localModifiedAt || Date.now())
      await provider.push(envelope)
      useStore.getState().setLastSyncedAt(envelope.updatedAt)
      saveBase(localData)
    }

    useStore.getState().setLastSyncCompletedAt()
    useStore.getState().setSyncStatus('idle')
    hasPendingPush = false
    retryCount = 0
  } catch (e) {
    console.error('[sync] push error:', e)
    if (e.message === 'notConnected') {
      isSyncing = false
      autoDisconnect()
      return
    }
    useStore.getState().setSyncStatus('error', e.message)
    hasPendingPush = true
    scheduleRetry()
  } finally {
    isSyncing = false
  }
}

async function doPull(silent = false) {
  const provider = getProvider()
  if (!provider || isSyncing) return

  // Don't pull while a first-sync conflict is pending resolution
  if (useStore.getState().pendingRemoteData) return

  isSyncing = true
  if (!silent) useStore.getState().setSyncStatus('syncing')

  try {
    const envelope = await provider.pull()
    if (!envelope?.data) {
      // No remote data — push local state to seed the cloud
      if (!silent) useStore.getState().setSyncStatus('idle')
      isSyncing = false
      if (!silent) schedulePush()
      return
    }

    const state = useStore.getState()
    const lastSynced = state.lastSyncedAt

    if (!lastSynced || envelope.updatedAt > lastSynced) {
      const localData = extractData(state)
      const base = loadBase()

      if (!lastSynced && state.localModifiedAt && !base) {
        // First sync with data on both sides — ask the user
        if (!silent) {
          useStore.getState().setPendingRemoteData(envelope)
          useStore.getState().setSyncStatus('idle')
        }
        isSyncing = false
        return
      }

      if (base && state.localModifiedAt && state.localModifiedAt > lastSynced) {
        // Local was also modified — 3-way merge
        const preferRemote = !(state.localModifiedAt > envelope.updatedAt)
        const merged = threeWayMerge(base, localData, envelope.data, preferRemote)
        useStore.getState().replaceData(preserveLocalPins(merged))
        prevSnapshot = stateSnapshot(useStore.getState())
        useStore.getState().setLastSyncedAt(envelope.updatedAt)
        saveBase(merged)

        // Push merged result
        isSyncing = false
        if (!silent) schedulePush()
        return
      }

      // Remote is newer, local not modified — apply directly (fast path)
      useStore.getState().replaceData(preserveLocalPins(envelope.data))
      prevSnapshot = stateSnapshot(useStore.getState())
      useStore.getState().setLastSyncedAt(envelope.updatedAt)
      saveBase(envelope.data)
    }
    useStore.getState().setLastSyncCompletedAt()
    if (!silent) useStore.getState().setSyncStatus('idle')
  } catch (e) {
    console.error('[sync] pull error:', e)
    if (e.message === 'notConnected') {
      isSyncing = false
      autoDisconnect()
      return
    }
    if (!silent) useStore.getState().setSyncStatus('error', e.message)
    // Retry once on tokenExpired (e.g. Google refresh may succeed on second attempt)
    if ((e.message === 'tokenExpired' || e.message === 'networkError') && !pullRetried) {
      pullRetried = true
      pullRetryTimer = setTimeout(() => {
        pullRetried = false
        pullRetryTimer = null
        doPull(false)
      }, 2000)
    }
  } finally {
    isSyncing = false
    if (hasPendingPush) {
      schedulePush()
    }
  }
}

function resetPollInterval() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(() => {
    if (!isSyncing) doPull(true)
  }, SYNC_POLL_INTERVAL_MS)
}

function schedulePush() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (navigator.onLine) {
      doPush()
    } else {
      hasPendingPush = true
    }
  }, SYNC_DEBOUNCE_MS)
}

export function startSyncEngine() {
  stopSyncEngine()

  const provider = getProvider()
  if (!provider || !provider.isConnected()) return

  // Take initial snapshot
  prevSnapshot = stateSnapshot(useStore.getState())

  // Subscribe to store changes
  unsubscribe = useStore.subscribe((state) => {
    const current = stateSnapshot(state)
    // Only trigger sync on actual data changes
    const changed = prevSnapshot && current.some((v, i) => v !== prevSnapshot[i])
    prevSnapshot = current
    if (changed) {
      schedulePush()
    }
  })

  // Online/offline listeners
  offlineHandler = () => {
    useStore.getState().setSyncStatus('offline')
  }
  onlineHandler = () => {
    useStore.getState().setSyncStatus('idle')
    retryCount = 0
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
    if (hasPendingPush) {
      doPush()
    }
  }
  window.addEventListener('online', onlineHandler)
  window.addEventListener('offline', offlineHandler)

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      // Clear any pending pull retry to avoid double-pulls
      if (pullRetryTimer) { clearTimeout(pullRetryTimer); pullRetryTimer = null; pullRetried = false }

      const provider = getProvider()
      const authReady = provider?.ensureAuth
        ? provider.ensureAuth().catch(() => {})
        : Promise.resolve()

      authReady.then(() => {
        if (hasPendingPush) {
          retryCount = 0
          if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
          doPush()
        } else if (!isSyncing) {
          doPull(false)  // non-silent so user sees syncing state on return
        }
        resetPollInterval()
      })
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)

  focusHandler = () => {
    if (!isSyncing && !hasPendingPush) {
      const provider = getProvider()
      const authReady = provider?.ensureAuth
        ? provider.ensureAuth().catch(() => {})
        : Promise.resolve()
      authReady.then(() => {
        if (!isSyncing && !hasPendingPush) {
          doPull(false)
          resetPollInterval()
        }
      })
    }
  }
  window.addEventListener('focus', focusHandler)

  if (!navigator.onLine) {
    useStore.getState().setSyncStatus('offline')
  }

  // Google token refresh — lightweight, just ensures token stays fresh
  if (provider.name === 'google') {
    refreshInterval = setInterval(() => {
      provider.ensureAuth().catch(() => {})
    }, GOOGLE_REFRESH_INTERVAL_MS)
  }

  // Initial pull on startup
  doPull()

  // Start periodic background polling for remote changes
  resetPollInterval()
}

export function stopSyncEngine() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler)
    onlineHandler = null
  }
  if (offlineHandler) {
    window.removeEventListener('offline', offlineHandler)
    offlineHandler = null
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler)
    focusHandler = null
  }
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  if (pullRetryTimer) {
    clearTimeout(pullRetryTimer)
    pullRetryTimer = null
    pullRetried = false
  }
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  prevSnapshot = null
  hasPendingPush = false
  isSyncing = false
  retryCount = 0
}

export function triggerManualSync() {
  return doPush()
}

export function resolveConflict(choice) {
  const state = useStore.getState()
  const envelope = state.pendingRemoteData
  state.setPendingRemoteData(null)

  if (choice === 'remote' && envelope?.data) {
    state.replaceData(preserveLocalPins(envelope.data))
    prevSnapshot = stateSnapshot(useStore.getState())
    state.setLastSyncedAt(envelope.updatedAt)
    saveBase(envelope.data)
  } else if (choice === 'merge' && envelope?.data) {
    const localData = extractData(state)
    const merged = threeWayMerge(null, localData, envelope.data, true)
    state.replaceData(preserveLocalPins(merged))
    prevSnapshot = stateSnapshot(useStore.getState())
    state.setLastSyncedAt(Date.now())
    saveBase(merged)
    schedulePush()
  } else if (choice === 'local') {
    const localData = extractData(state)
    state.setLastSyncedAt(envelope.updatedAt)
    saveBase(localData)
    schedulePush()
  }
  // 'cancel' — do nothing, disconnect is handled by the UI
}

export { providers }
