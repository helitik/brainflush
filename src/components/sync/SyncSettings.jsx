import { useSync } from '../../hooks/useSync'
import { useLanguage } from '../../hooks/useLanguage'

const GitHubIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
)

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const hasGithubCredentials = !!import.meta.env.VITE_GITHUB_CLIENT_ID
const hasGoogleCredentials = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

export function SyncSettings({ onClose }) {
  const { syncProvider, syncStatus, lastSyncCompletedAt, localModifiedAt, connect, disconnect, triggerSync, syncUserInfo } = useSync()
  const { t } = useLanguage()

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'var(--bg-overlay)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
          style={{ background: 'var(--bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('sync.title')}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5">
            {syncProvider ? (
              /* Connected state */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                  {syncUserInfo?.avatar ? (
                    <img
                      src={syncUserInfo.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div style={{ color: 'var(--text-primary)' }}>
                      {syncProvider === 'github' ? <GitHubIcon /> : <GoogleIcon />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {syncUserInfo
                        ? (syncUserInfo.name || syncUserInfo.login || syncUserInfo.email)
                        : (syncProvider === 'github' ? 'GitHub Gist' : 'Google Drive')}
                    </div>
                    {syncUserInfo && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {syncProvider === 'github' ? 'GitHub Gist' : 'Google Drive'}
                      </div>
                    )}
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {syncStatus === 'syncing'
                        ? t('sync.syncing')
                        : syncStatus === 'error'
                          ? t('sync.error')
                          : syncStatus === 'offline'
                            ? t('sync.offline')
                            : lastSyncCompletedAt
                              ? t('sync.lastSync', new Date(lastSyncCompletedAt).toLocaleTimeString())
                              : t('sync.neverSynced')}
                    </div>
                    {localModifiedAt && syncStatus !== 'syncing' && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('sync.lastModified', new Date(localModifiedAt).toLocaleTimeString())}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={triggerSync}
                    disabled={syncStatus === 'syncing' || syncStatus === 'offline'}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: 'var(--color-primary-500)' }}
                  >
                    {t('sync.syncNow')}
                  </button>
                  <button
                    onClick={() => { disconnect(); onClose() }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: '#ef4444', background: '#ef444415' }}
                  >
                    {t('sync.disconnect')}
                  </button>
                </div>
              </div>
            ) : (
              /* Not connected — provider selection */
              <div className="space-y-3">
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {t('sync.description')}
                </p>

                {/* GitHub */}
                <button
                  onClick={() => hasGithubCredentials && connect('github')}
                  disabled={!hasGithubCredentials}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 dark:hover:brightness-110 disabled:hover:brightness-100"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <GitHubIcon />
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">GitHub Gist</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {hasGithubCredentials ? t('sync.githubDescription') : t('sync.notConfigured')}
                    </div>
                  </div>
                  {hasGithubCredentials && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>

                {/* Google Drive */}
                <button
                  onClick={() => hasGoogleCredentials && connect('google')}
                  disabled={!hasGoogleCredentials}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95 dark:hover:brightness-110 disabled:hover:brightness-100"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <GoogleIcon />
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">Google Drive</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {hasGoogleCredentials ? t('sync.googleDescription') : t('sync.notConfigured')}
                    </div>
                  </div>
                  {hasGoogleCredentials && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
