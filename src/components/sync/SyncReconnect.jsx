import { useStore } from '../../hooks/useStore'
import { useSync } from '../../hooks/useSync'
import { useLanguage } from '../../hooks/useLanguage'
import { useBackClose } from '../../hooks/useBackClose'

export function SyncReconnect() {
  const disconnectedProvider = useStore((s) => s.disconnectedProvider)
  const setDisconnectedProvider = useStore((s) => s.setDisconnectedProvider)
  const { connect } = useSync()
  const { t } = useLanguage()

  const dismiss = () => setDisconnectedProvider(null)

  useBackClose(!!disconnectedProvider, dismiss)

  if (!disconnectedProvider) return null

  const providerLabel = disconnectedProvider === 'github' ? 'GitHub Gist' : 'Google Drive'

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'var(--bg-overlay)' }}
        onClick={dismiss}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={dismiss}>
        <div
          className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
          style={{ background: 'var(--bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {providerLabel}
            </h2>
            <button onClick={dismiss} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('sync.disconnected')}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const provider = disconnectedProvider
                  setDisconnectedProvider(null)
                  connect(provider)
                }}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-primary-500)' }}
              >
                {t('sync.reconnect')}
              </button>
              <button
                onClick={dismiss}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: 'var(--text-primary)', background: 'var(--bg-input)' }}
              >
                {t('sync.dismiss')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
