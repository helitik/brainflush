/* eslint-disable react-refresh/only-export-components */
import { Component } from 'react'

// Inline translations — more robust than importing translations.js
// in case that module is the crash source
const strings = {
  en: {
    title: 'Oops, something broke!',
    subtitle: "Don't worry, your data is safe. Try reloading.",
    showDetails: 'Show error details',
    hideDetails: 'Hide error details',
    copy: 'Copy error',
    copied: 'Copied!',
    reload: 'Reload the app',
  },
  fr: {
    title: 'Oups, quelque chose a cassé !',
    subtitle: 'Pas de panique, vos données sont en sécurité. Essayez de recharger.',
    showDetails: "Voir les détails de l'erreur",
    hideDetails: "Masquer les détails de l'erreur",
    copy: "Copier l'erreur",
    copied: 'Copié !',
    reload: "Recharger l'app",
  },
}

function getLanguage() {
  try {
    const raw = localStorage.getItem('brainflush-data')
    if (raw) {
      const parsed = JSON.parse(raw)
      const lang = parsed?.state?.language
      if (lang === 'fr') return 'fr'
    }
  } catch {
    // ignore
  }
  return navigator.language?.startsWith('fr') ? 'fr' : 'en'
}

function DizzyNotepad() {
  return (
    <svg width="80" height="80" viewBox="0 0 56 56" fill="none" style={{ transform: 'rotate(-12deg)' }}>
      {/* Notepad body */}
      <rect x="12" y="8" width="28" height="36" rx="3" stroke="var(--text-muted)" strokeWidth="1.5" />
      {/* Spiral binding */}
      <line x1="18" y1="8" x2="18" y2="6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="8" x2="24" y2="6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="8" x2="30" y2="6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="8" x2="36" y2="6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Lines on notepad */}
      <line x1="18" y1="18" x2="34" y2="18" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="18" y1="23" x2="30" y2="23" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Dizzy eyes: x x */}
      <g stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="21" y1="28" x2="24" y2="31" />
        <line x1="24" y1="28" x2="21" y2="31" />
        <line x1="29" y1="28" x2="32" y2="31" />
        <line x1="32" y1="28" x2="29" y2="31" />
      </g>
      {/* Wavy mouth */}
      <path d="M23 35c0.8-0.8 1.6 0.8 2.4 0 0.8-0.8 1.6 0.8 2.4 0" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Bandaid on corner */}
      <rect x="33" y="6" width="10" height="5" rx="2.5" fill="var(--color-primary-300)" opacity="0.6" transform="rotate(45 38 8.5)" />
      <line x1="36.5" y1="7" x2="36.5" y2="10" stroke="var(--color-primary-400)" strokeWidth="0.5" opacity="0.6" transform="rotate(45 38 8.5)" />
      <line x1="39.5" y1="7" x2="39.5" y2="10" stroke="var(--color-primary-400)" strokeWidth="0.5" opacity="0.6" transform="rotate(45 38 8.5)" />
      {/* Spinning stars */}
      <path d="M8 12l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5L4.5 15.5l2.5-1z" fill="var(--color-primary-400)">
        <animateTransform attributeName="transform" type="rotate" from="0 8 15" to="360 8 15" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M44 4l0.7 1.8 1.8 0.7-1.8 0.7-0.7 1.8-0.7-1.8-1.8-0.7 1.8-0.7z" fill="var(--color-primary-300)">
        <animateTransform attributeName="transform" type="rotate" from="360 44 7" to="0 44 7" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M46 18l0.5 1.2 1.2 0.5-1.2 0.5-0.5 1.2-0.5-1.2-1.2-0.5 1.2-0.5z" fill="var(--color-primary-400)" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="0 46 20" to="360 46 20" dur="5s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false, copied: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
  }

  handleCopy = () => {
    const { error, errorInfo } = this.state
    const text = [
      `Error: ${error?.message || error}`,
      '',
      'Component stack:',
      errorInfo?.componentStack || '(none)',
      '',
      'Stack trace:',
      error?.stack || '(none)',
    ].join('\n')

    navigator.clipboard?.writeText(text).then(
      () => {
        this.setState({ copied: true })
        setTimeout(() => this.setState({ copied: false }), 2000)
      },
      () => { /* clipboard unavailable (e.g. insecure context) — ignore silently */ }
    )
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { error, errorInfo, showDetails, copied } = this.state
    const lang = getLanguage()
    const t = strings[lang] || strings.en

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <DizzyNotepad />

        <h1 style={{
          fontSize: '1.375rem',
          fontWeight: 700,
          marginTop: '1.5rem',
          marginBottom: '0.5rem',
          textAlign: 'center',
        }}>
          {t.title}
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9375rem',
          textAlign: 'center',
          maxWidth: '20rem',
          marginBottom: '2rem',
          lineHeight: 1.5,
        }}>
          {t.subtitle}
        </p>

        {/* Reload button */}
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--color-primary-500)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.75rem',
            padding: '0.75rem 2rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          {t.reload}
        </button>

        {/* Toggle details */}
        <button
          onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            padding: '0.5rem',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {showDetails ? t.hideDetails : t.showDetails}
        </button>

        {showDetails && (
          <div style={{
            marginTop: '1rem',
            width: '100%',
            maxWidth: '32rem',
          }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.75rem',
              padding: '1rem',
              fontSize: '0.75rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '16rem',
              overflowY: 'auto',
              lineHeight: 1.5,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {error?.message || String(error)}
              </div>
              {errorInfo?.componentStack && (
                <>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: '0.25rem', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    Component stack
                  </div>
                  {errorInfo.componentStack}
                </>
              )}
              {error?.stack && (
                <>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: '0.25rem', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
                    Stack trace
                  </div>
                  {error.stack}
                </>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={this.handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                margin: '0.75rem auto 0',
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? t.copied : t.copy}
            </button>
          </div>
        )}
      </div>
    )
  }
}
