import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss'
import { requestNotificationPermission } from '../../hooks/useReminders'

function toLocalDatetime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AddTaskSheet({ open, onClose, initialColumnId }) {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const allColumns = useStore((s) => s.columns)
  const addTask = useStore((s) => s.addTask)
  const setReminderAction = useStore((s) => s.setReminder)
  const { t } = useLanguage()
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

  const [tabId, setTabId] = useState(activeTabId)

  const columns = useMemo(
    () => allColumns.filter((c) => c.tabId === tabId).sort((a, b) => a.order - b.order),
    [allColumns, tabId]
  )

  const [text, setText] = useState('')
  const [columnId, setColumnId] = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [reminderValue, setReminderValue] = useState('')
  const [reminderError, setReminderError] = useState(null)
  const [minDatetime] = useState(() => toLocalDatetime(Date.now()))
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
      setShowReminder(false)
      setReminderValue('')
      setReminderError(null)
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
    const id = addTask(columnId, trimmed)
    if (reminderValue) {
      setReminderAction(id, new Date(reminderValue).getTime())
    }
    setText('')
    setReminderValue('')
    setShowReminder(false)
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
      >
        {/* Handle */}
        <div className="py-3 -mx-5 px-5 cursor-grab" {...swipeHandlers}>
          <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border-color)' }} />
        </div>

        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
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

          {/* Reminder picker */}
          {showReminder && (
            <div className="mb-3">
              {reminderError && (
                <p className="text-xs mb-2" style={{ color: '#ef4444' }}>{reminderError}</p>
              )}
              {!isStandalone && (
                <div
                  className="flex items-center gap-2 mb-2 px-2.5 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--bg-column)', color: 'var(--text-secondary)' }}
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="flex-1">{t('reminder.installHint')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="datetime-local"
                  value={reminderValue}
                  min={minDatetime}
                  onChange={(e) => setReminderValue(e.target.value)}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1.5 rounded-lg border text-xs outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
                  }}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setReminderValue(''); setShowReminder(false) }}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{ background: 'color-mix(in srgb, #ef4444 15%, var(--bg-column))', color: '#ef4444' }}
                >
                  {t('reminder.clear')}
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { label: t('reminder.inOneHour'), getTime: () => Date.now() + 60 * 60 * 1000 },
                  { label: t('reminder.tomorrowMorning'), getTime: () => {
                    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.getTime()
                  }},
                  { label: t('reminder.nextMonday'), getTime: () => {
                    const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 1 : 8 - day
                    d.setDate(d.getDate() + diff); d.setHours(8, 0, 0, 0); return d.getTime()
                  }},
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setReminderValue(toLocalDatetime(preset.getTime()))}
                    className="px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 hover:opacity-80"
                    style={{ background: 'var(--bg-column)', color: 'var(--text-secondary)' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end">
            {/* Bell toggle */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                if (showReminder) {
                  setShowReminder(false)
                  setReminderValue('')
                  return
                }
                if (!('Notification' in window)) {
                  setReminderError(t('reminder.unsupported'))
                  setShowReminder(true)
                  return
                }
                const granted = await requestNotificationPermission()
                if (!granted) {
                  setReminderError(t('reminder.permissionDenied'))
                  setShowReminder(true)
                  return
                }
                setReminderError(null)
                setShowReminder(true)
              }}
              className="p-3 rounded-xl transition-all hover:opacity-80"
              style={{
                background: showReminder || reminderValue ? 'var(--color-primary-500)' : 'var(--bg-column)',
                color: showReminder || reminderValue ? 'white' : 'var(--text-secondary)',
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
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
