import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useSync } from '../../hooks/useSync'

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
const hasAnyProvider = hasGithubCredentials || hasGoogleCredentials

const features = [
  { icon: '\u{1F4C1}', key: 'onboarding.featureProjects' },
  { icon: '\u{1F4CB}', key: 'onboarding.featureLists' },
  { icon: '\u2705', key: 'onboarding.featureTasks' },
]

export function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0)
  const { t } = useLanguage()
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const { connect } = useSync()

  const handleClose = () => {
    completeOnboarding()
    onClose()
  }

  const handleNext = () => {
    if (hasAnyProvider) {
      setStep(1)
    } else {
      handleClose()
    }
  }

  const handleConnect = (provider) => {
    completeOnboarding()
    connect(provider)
  }

  const positionClasses = 'fixed inset-0 z-50 flex items-center justify-center p-4'
  const cardClasses = 'w-full max-w-sm rounded-xl shadow-lg overflow-hidden'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'var(--bg-overlay)' }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={positionClasses} onClick={handleClose}>
        <div
          className={cardClasses}
          style={{ background: 'var(--bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step === 0 ? t('onboarding.welcomeTitle') : t('onboarding.syncTitle')}
            </h2>
            <button onClick={handleClose} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5">
            {step === 0 ? (
              /* Step 0 — Welcome */
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('onboarding.welcomeSubtitle')}
                  </p>
                </div>

                <div className="space-y-3">
                  {features.map((f) => (
                    <div key={f.key} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                      <span className="text-lg shrink-0">{f.icon}</span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {t(f.key)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleNext}
                    className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ background: 'var(--color-primary-500)' }}
                  >
                    {t('onboarding.next')}
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full py-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('onboarding.skip')}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 1 — Sync */
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t('onboarding.syncDescription')}
                  </p>
                </div>

                <div className="space-y-3">
                  {hasGithubCredentials && (
                    <button
                      onClick={() => handleConnect('github')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:brightness-95 dark:hover:brightness-110"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    >
                      <GitHubIcon />
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm">GitHub Gist</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t('sync.githubDescription')}
                        </div>
                      </div>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  {hasGoogleCredentials && (
                    <button
                      onClick={() => handleConnect('google')}
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:brightness-95 dark:hover:brightness-110"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    >
                      <GoogleIcon />
                      <div className="text-left flex-1">
                        <div className="font-medium text-sm">Google Drive</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t('sync.googleDescription')}
                        </div>
                      </div>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('onboarding.maybeLater')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
