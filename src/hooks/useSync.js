import { useEffect, useCallback, useRef } from 'react'
import { useStore } from './useStore'
import { startSyncEngine, stopSyncEngine, triggerManualSync, resolveConflict, clearBase, providers } from '../sync/syncEngine'

export function useSync() {
  const syncProvider = useStore((s) => s.syncProvider)
  const syncStatus = useStore((s) => s.syncStatus)
  const syncError = useStore((s) => s.syncError)
  const lastSyncedAt = useStore((s) => s.lastSyncedAt)
  const localModifiedAt = useStore((s) => s.localModifiedAt)
  const pendingRemoteData = useStore((s) => s.pendingRemoteData)
  const setSyncProvider = useStore((s) => s.setSyncProvider)

  const prevProvider = useRef(syncProvider)

  // Start/stop engine when provider changes
  useEffect(() => {
    if (syncProvider && providers[syncProvider]?.isConnected()) {
      startSyncEngine()
    } else {
      stopSyncEngine()
    }
    prevProvider.current = syncProvider
    return () => stopSyncEngine()
  }, [syncProvider])

  const connect = useCallback((providerName) => {
    const provider = providers[providerName]
    if (!provider) return
    provider.startAuth()
  }, [])

  const disconnect = useCallback(() => {
    const provider = providers[syncProvider]
    if (provider) {
      stopSyncEngine()
      provider.disconnect()
    }
    clearBase()
    setSyncProvider(null)
  }, [syncProvider, setSyncProvider])

  const triggerSync = useCallback(() => {
    if (syncProvider) triggerManualSync()
  }, [syncProvider])

  const handleConflict = useCallback((choice) => {
    resolveConflict(choice)
  }, [])

  const syncUserInfo = syncProvider ? providers[syncProvider]?.getUserInfo?.() ?? null : null

  return {
    syncProvider,
    syncStatus,
    syncError,
    lastSyncedAt,
    localModifiedAt,
    pendingRemoteData,
    syncUserInfo,
    connect,
    disconnect,
    triggerSync,
    handleConflict,
  }
}
