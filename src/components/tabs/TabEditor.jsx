import { useState, useRef } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'

const EMOJIS = [
  '📋', '🏠', '💼', '🎯', '🚀', '💡', '🎨', '📚', '🏋️', '🎵', '✈️', '🛒',
  '💰', '❤️', '⭐', '🔧', '📱', '💻', '🌍', '📸', '🎮', '🧹', '🍳', '📅',
  '🎓', '🐾', '🌱', '🧘', '🏖️', '🎁', '📝', '🔬', '🏗️', '⚡',
]

export function TabEditor({ tab, onClose }) {
  const addTab = useStore((s) => s.addTab)
  const renameTab = useStore((s) => s.renameTab)
  const deleteTab = useStore((s) => s.deleteTab)
  const tabs = useStore((s) => s.tabs)
  const { t } = useLanguage()

  const isNew = !tab
  const userHasTyped = useRef(false)

  const [name, setName] = useState(tab?.name || (isNew ? t('emojiName.📋') : ''))
  const [emoji, setEmoji] = useState(tab?.emoji || '📋')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    if (isNew) {
      addTab(trimmed, emoji)
    } else {
      renameTab(tab.id, trimmed, emoji)
    }
    onClose()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteTab(tab.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'var(--bg-overlay)' }} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }}>
      <div
        className="w-full max-w-md rounded-xl p-5 shadow-xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {isNew ? t('tabEditor.newProject') : t('tabEditor.editProject')}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Emoji picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  setEmoji(e)
                  if (isNew && (!userHasTyped.current || name.trim() === '')) {
                    const defaultName = t(`emojiName.${e}`)
                    if (defaultName) setName(defaultName)
                  }
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all hover:brightness-95 dark:hover:brightness-110"
                style={{
                  background: emoji === e ? 'var(--color-primary-500)20' : 'transparent',
                  outline: emoji === e ? '2px solid var(--color-primary-500)' : '2px solid transparent',
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Name input */}
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (isNew) userHasTyped.current = true
            }}
            placeholder={t('tabEditor.placeholder')}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
            style={{
              background: 'var(--bg-input)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary-500)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
          />

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            {!isNew && tabs.length > 1 && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  color: confirmDelete ? 'white' : '#ef4444',
                  background: confirmDelete ? '#ef4444' : 'transparent',
                }}
              >
                {confirmDelete ? t('tabEditor.confirmDelete') : t('tabEditor.delete')}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-800"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('tabEditor.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 hover:opacity-90"
              style={{ background: 'var(--color-primary-500)' }}
            >
              {isNew ? t('tabEditor.create') : t('tabEditor.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
