import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss'

export function AddTaskSheet({ open, onClose, initialColumnId }) {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const allColumns = useStore((s) => s.columns)
  const addTask = useStore((s) => s.addTask)
  const { t } = useLanguage()

  const [tabId, setTabId] = useState(activeTabId)

  const columns = useMemo(
    () => allColumns.filter((c) => c.tabId === tabId).sort((a, b) => a.order - b.order),
    [allColumns, tabId]
  )

  const [text, setText] = useState('')
  const [columnId, setColumnId] = useState('')
  const inputRef = useRef(null)
  const { sheetRef, handlers: swipeHandlers } = useSwipeToDismiss(onClose)

  // Reset tabId and text when sheet opens
  const openKey = open ? activeTabId : null
  const [prevOpenKey, setPrevOpenKey] = useState(openKey)
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey)
    if (open) {
      setTabId(activeTabId)
      setText('')
    }
  }

  // Focus input when sheet opens (DOM side effect)
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Select initial or first column when columns change
  const targetColId = open && columns.length > 0
    ? ((initialColumnId && columns.find((c) => c.id === initialColumnId)) ? initialColumnId : columns[0].id)
    : ''
  const [prevTargetColId, setPrevTargetColId] = useState(targetColId)
  if (targetColId !== prevTargetColId) {
    setPrevTargetColId(targetColId)
    setColumnId(targetColId)
  }

  if (!open) return null

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || !columnId) return
    addTask(columnId, trimmed)
    setText('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    if (navigator.vibrate) navigator.vibrate(10)
    inputRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end overflow-y-auto" style={{ background: 'var(--bg-overlay)' }} onClick={onClose}>
      <div
        ref={sheetRef}
        className="w-full rounded-t-2xl p-5 pb-8 shadow-xl"
        style={{ background: 'var(--bg-card)', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
        {...swipeHandlers}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--border-color)' }} />

        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {t('addTask.title')}
        </h2>

        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={tab.id === tabId ? (el) => el?.scrollIntoView({ inline: 'center', block: 'nearest' }) : undefined}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setTabId(tab.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 hover:opacity-80"
              style={{
                background: tab.id === tabId ? 'var(--color-primary-500)' : 'var(--bg-column)',
                color: tab.id === tabId ? 'white' : 'var(--text-secondary)',
              }}
            >
              {tab.emoji} {tab.name}
            </button>
          ))}
        </div>

        <div>
          {/* Column selector */}
          <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
            {columns.map((col) => (
              <button
                key={col.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setColumnId(col.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 hover:opacity-80"
                style={{
                  background: col.id === columnId ? 'var(--color-primary-500)' : 'var(--bg-column)',
                  color: col.id === columnId ? 'white' : 'var(--text-secondary)',
                }}
              >
                {col.name}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                const el = e.target
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
              placeholder={t('addTask.placeholder')}
              className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none resize-none overflow-y-auto"
              style={{
                background: 'var(--bg-input)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              disabled={!text.trim()}
              onClick={handleSubmit}
              className="px-4 py-3 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-40 hover:opacity-90"
              style={{ background: 'var(--color-primary-500)' }}
            >
              {t('addTask.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
