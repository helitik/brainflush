import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'

export function ColumnEditor({ tabId, onClose }) {
  const addColumn = useStore((s) => s.addColumn)
  const { t } = useLanguage()
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addColumn(tabId, trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'var(--bg-overlay)' }} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }}>
      <div
        className="w-full max-w-xs rounded-xl shadow-lg overflow-hidden"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('listEditor.title')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('listEditor.placeholder')}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-800"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('listEditor.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 hover:opacity-90"
              style={{ background: 'var(--color-primary-500)' }}
            >
              {t('listEditor.add')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
