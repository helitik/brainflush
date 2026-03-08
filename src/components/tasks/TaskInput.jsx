import { useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'

export function TaskInput({ columnId }) {
  const addTask = useStore((s) => s.addTask)
  const { t } = useLanguage()
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    addTask(columnId, trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 pb-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('taskInput.placeholder')}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors placeholder:text-[var(--text-muted)]"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary-400)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
      />
    </form>
  )
}
