import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'

export function TaskInput({ columnId }) {
  const addTask = useStore((s) => s.addTask)
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [text])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addTask(columnId, trimmed)
    setText('')
  }

  return (
    <div className="px-3 pb-2">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder={t('taskInput.placeholder')}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none overflow-hidden placeholder:text-[var(--text-muted)]"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary-400)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
      />
    </div>
  )
}
