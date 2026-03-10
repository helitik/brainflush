import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useBackClose } from '../../hooks/useBackClose'
import { useLanguage } from '../../hooks/useLanguage'
import { useStore } from '../../hooks/useStore'
import { stopSyncEngine, clearBase, providers } from '../../sync/syncEngine'
import { ConfirmModal } from './ConfirmModal'

export function DataModal({ isOpen, onClose }) {
  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', key: string }
  const [pendingImport, setPendingImport] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearInput, setClearInput] = useState('')

  useBackClose(isOpen && !showClearConfirm, onClose)
  useBackClose(showClearConfirm, () => { setShowClearConfirm(false); setClearInput('') })

  if (!isOpen) return null

  const handleExport = () => {
    const state = useStore.getState()
    const envelope = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'brainflush',
      data: {
        tabs: state.tabs,
        columns: state.columns,
        tasks: state.tasks,
        activeTabId: state.activeTabId,
        theme: state.theme,
        language: state.language,
      },
    }
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brainflush-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ type: 'success', key: 'data.exportSuccess' })
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset so the same file can be re-selected
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (
          parsed.app !== 'brainflush' ||
          !Array.isArray(parsed.data?.tabs) ||
          !Array.isArray(parsed.data?.columns) ||
          !Array.isArray(parsed.data?.tasks)
        ) {
          setStatus({ type: 'error', key: 'data.importError' })
          return
        }
        setPendingImport(parsed.data)
      } catch {
        setStatus({ type: 'error', key: 'data.importError' })
      }
    }
    reader.readAsText(file)
  }

  const confirmImport = () => {
    if (!pendingImport) return
    const state = useStore.getState()
    useStore.getState().replaceData({
      ...pendingImport,
      theme: pendingImport.theme ?? state.theme,
      language: pendingImport.language ?? state.language,
    })
    useStore.setState({ localModifiedAt: Date.now() })
    setPendingImport(null)
    onClose()
  }

  const handleClearData = () => {
    stopSyncEngine()
    const providerName = useStore.getState().syncProvider
    if (providerName && providers[providerName]) {
      providers[providerName].disconnect()
    }
    clearBase()
    useStore.getState().clearAllData()
    setShowClearConfirm(false)
    setClearInput('')
    onClose()
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'var(--bg-overlay)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
          style={{ background: 'var(--bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('data.title')}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5">
          <div className="flex flex-col gap-3">
            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--bg-column)', color: 'var(--text-primary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('data.export')}
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--bg-column)', color: 'var(--text-primary)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('data.import')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Status message */}
          {status && (
            <p
              className="text-xs mt-3 text-center"
              style={{ color: status.type === 'error' ? '#ef4444' : 'var(--color-primary-500)' }}
            >
              {t(status.key)}
            </p>
          )}

          {/* Clear all data */}
          <div className="border-t mt-4 pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-3 w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              style={{ color: '#ef4444' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('drawer.clearData')}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Import confirmation */}
      <ConfirmModal
        isOpen={!!pendingImport}
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
        title={t('data.title')}
        message={t('data.importConfirm')}
        confirmLabel={t('data.confirmReplace')}
      />

      {/* Clear data confirmation with typed word */}
      {showClearConfirm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={() => { setShowClearConfirm(false); setClearInput('') }}
        >
          <div
            className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
            style={{ background: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('drawer.clearData')}
              </h2>
              <button onClick={() => { setShowClearConfirm(false); setClearInput('') }} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {t('drawer.clearDataConfirm')}
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('data.clearConfirmPrompt', t('data.clearConfirmWord'))}
              </p>
              <input
                type="text"
                value={clearInput}
                onChange={(e) => setClearInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm mb-4 outline-none"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowClearConfirm(false); setClearInput('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'var(--bg-column)', color: 'var(--text-primary)' }}
                >
                  {t('confirm.cancel')}
                </button>
                <button
                  onClick={handleClearData}
                  disabled={clearInput !== t('data.clearConfirmWord')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-40"
                  style={{ background: '#ef4444' }}
                >
                  {t('confirm.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  )
}
