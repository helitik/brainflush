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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'var(--bg-overlay)' }}>
      <div
        className="w-full max-w-xs rounded-xl p-5 shadow-xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{t('listEditor.title')}</h3>
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
  )
}
