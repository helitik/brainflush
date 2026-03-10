import { createPortal } from 'react-dom'
import { useBackClose } from '../../hooks/useBackClose'
import { useLanguage } from '../../hooks/useLanguage'

export function ConfirmModal({ isOpen, onConfirm, onCancel, title, message, cancelLabel, confirmLabel }) {
  const { t } = useLanguage()
  useBackClose(isOpen, onCancel)

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button onClick={onCancel} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--bg-column)', color: 'var(--text-primary)' }}
            >
              {cancelLabel || t('confirm.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: '#ef4444' }}
            >
              {confirmLabel || t('confirm.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
