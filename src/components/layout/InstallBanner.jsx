import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { useLanguage } from '../../hooks/useLanguage'

export function InstallBanner() {
  const { installPrompt, triggerInstall, dismissInstall } = useInstallPrompt()
  const { t } = useLanguage()

  if (!installPrompt) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{
        padding: `0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px))`,
        backgroundColor: 'var(--bg-card)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('install.title')}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('install.description')}
          </p>
        </div>
        <button
          onClick={triggerInstall}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
        >
          {t('install.button')}
        </button>
        <button
          onClick={dismissInstall}
          className="shrink-0 p-1 rounded cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Dismiss"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
          </svg>
        </button>
      </div>
    </div>
  )
}
