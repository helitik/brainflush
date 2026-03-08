import { useSync } from '../../hooks/useSync'
import { useLanguage } from '../../hooks/useLanguage'

const CloudOff = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M3 3l18 18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.35 10.04A7.49 7.49 0 0012 4a7.49 7.49 0 00-6.65 4.04A5.99 5.99 0 001 14a6 6 0 006 6h10a5 5 0 001.35-9.96z" />
  </svg>
)

const CloudCheck = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.35 10.04A7.49 7.49 0 0012 4a7.49 7.49 0 00-6.65 4.04A5.99 5.99 0 001 14a6 6 0 006 6h10a5 5 0 001.35-9.96z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>
)

const Loader = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 019.95 9" strokeLinecap="round" />
  </svg>
)

const CloudError = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.35 10.04A7.49 7.49 0 0012 4a7.49 7.49 0 00-6.65 4.04A5.99 5.99 0 001 14a6 6 0 006 6h10a5 5 0 001.35-9.96z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
  </svg>
)

const CloudDisconnected = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.35 10.04A7.49 7.49 0 0012 4a7.49 7.49 0 00-6.65 4.04A5.99 5.99 0 001 14a6 6 0 006 6h10a5 5 0 001.35-9.96z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
  </svg>
)

const CloudPending = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.35 10.04A7.49 7.49 0 0012 4a7.49 7.49 0 00-6.65 4.04A5.99 5.99 0 001 14a6 6 0 006 6h10a5 5 0 001.35-9.96z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V10m0 0l-3 3m3-3l3 3" />
  </svg>
)

export function SyncStatus({ onClick }) {
  const { syncProvider, syncStatus, lastSyncedAt, localModifiedAt } = useSync()
  const { t } = useLanguage()

  let icon, color, title
  if (!syncProvider) {
    icon = <CloudDisconnected />
    color = 'var(--text-muted)'
    title = t('sync.notConnected')
  } else if (syncStatus === 'syncing') {
    icon = <Loader />
    color = 'var(--color-primary-500)'
    title = t('sync.syncing')
  } else if (syncStatus === 'error') {
    icon = <CloudError />
    color = '#ef4444'
    title = t('sync.error')
  } else if (syncStatus === 'offline') {
    icon = <CloudOff />
    color = '#f59e0b'
    title = t('sync.offline')
  } else if (syncProvider && localModifiedAt && (!lastSyncedAt || localModifiedAt > lastSyncedAt)) {
    icon = <CloudPending />
    color = '#f59e0b'
    title = t('sync.pendingSync')
  } else if (syncProvider && lastSyncedAt) {
    icon = <CloudCheck />
    color = 'var(--color-primary-500)'
    title = t('sync.lastSync', new Date(lastSyncedAt).toLocaleTimeString())
  } else if (syncProvider) {
    icon = <CloudCheck />
    color = 'var(--color-primary-500)'
    title = t('sync.neverSynced')
  } else {
    icon = <CloudDisconnected />
    color = 'var(--text-muted)'
    title = t('sync.notConnected')
  }

  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
      style={{ color }}
      title={title}
    >
      {icon}
    </button>
  )
}
