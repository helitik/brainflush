import { useSync } from '../../hooks/useSync'
import { useLanguage } from '../../hooks/useLanguage'

export function SyncConflict() {
  const { pendingRemoteData, handleConflict, disconnect, syncProvider, syncUserInfo } = useSync()
  const { t } = useLanguage()

  if (!pendingRemoteData) return null

  const remoteDate = new Date(pendingRemoteData.updatedAt).toLocaleString()
  const remoteTasks = pendingRemoteData.data?.tasks?.length ?? 0
  const remoteTabs = pendingRemoteData.data?.tabs?.length ?? 0
  const providerLabel = syncProvider === 'github' ? 'GitHub Gist' : 'Google Drive'

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'var(--bg-overlay)' }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('sync.conflictTitle')}
            </h2>
            {syncUserInfo ? (
              <div className="flex items-center gap-2 mt-2">
                <img
                  src={syncUserInfo.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {syncUserInfo.name || syncUserInfo.login || syncUserInfo.email}
                </span>
              </div>
            ) : (
              <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {providerLabel}
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('sync.conflictDescription')}
            </p>

            <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <div>{t('sync.conflictRemoteInfo', remoteTabs, remoteTasks, remoteDate)}</div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleConflict('merge')}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-primary-500)' }}
              >
                {t('sync.mergeBoth')}
              </button>
              <button
                onClick={() => handleConflict('remote')}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--text-primary)', background: 'var(--bg-input)' }}
              >
                {t('sync.useCloud')}
              </button>
              <button
                onClick={() => handleConflict('local')}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--text-primary)', background: 'var(--bg-input)' }}
              >
                {t('sync.useLocal')}
              </button>
              <button
                onClick={() => { handleConflict('cancel'); disconnect() }}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: '#ef4444' }}
              >
                {t('sync.cancelDisconnect')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
