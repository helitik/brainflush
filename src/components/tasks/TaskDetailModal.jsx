import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss'
import { useBackClose } from '../../hooks/useBackClose'
import { ConfirmModal } from '../shared/ConfirmModal'
import { requestNotificationPermission } from '../../hooks/useReminders'
import { useTaskImages, useImagePicker, useFileDrop, processFiles } from '../../hooks/useImages'
import { deleteImage } from '../../lib/imageStore'
import { showToast } from '../../hooks/useToast'

// Format a Date/timestamp to local 'YYYY-MM-DDTHH:MM' for datetime-local input
function toLocalDatetime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Format reminder timestamp to a readable short date
function formatReminderDate(ts, language) {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(ts).toLocaleDateString(locale, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function Chevron({ expanded }) {
  return (
    <svg
      className="w-3 h-3 shrink-0 transition-transform duration-200"
      style={{ transform: expanded ? 'rotate(90deg)' : 'none', color: 'var(--text-muted)' }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function Separator() {
  return <div style={{ height: 1, background: 'var(--border-color)', opacity: 0.3 }} />
}

const bellIcon = (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

export function TaskDetailModal({ task, onClose }) {
  const isDesktop = useIsDesktop()
  const { language, t } = useLanguage()
  const tabs = useStore((s) => s.tabs)
  const allColumns = useStore((s) => s.columns)
  const editTask = useStore((s) => s.editTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const moveTask = useStore((s) => s.moveTask)
  const setReminder = useStore((s) => s.setReminder)
  const clearReminder = useStore((s) => s.clearReminder)
  const addTaskImages = useStore((s) => s.addTaskImages)
  const removeTaskImage = useStore((s) => s.removeTaskImage)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

  // Find current column and tab
  const currentColumn = allColumns.find((c) => c.id === task.columnId)
  const currentTabId = currentColumn?.tabId

  const [text, setText] = useState(task.text)
  const [selectedTabId, setSelectedTabId] = useState(currentTabId)
  const [selectedColumnId, setSelectedColumnId] = useState(task.columnId)
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedSection, setExpandedSection] = useState(null) // 'reminder' | null
  const [reminderValue, setReminderValue] = useState(
    task.reminderAt ? toLocalDatetime(task.reminderAt) : ''
  )
  const [reminderError, setReminderError] = useState(null)
  const [minDatetime] = useState(() => toLocalDatetime(Date.now()))
  const [pendingImageIds, setPendingImageIds] = useState([])
  const [removedImageIds, setRemovedImageIds] = useState([])
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const textareaRef = useRef(null)
  const currentImageIds = useMemo(() => {
    const base = task.images || []
    return [...base.filter((id) => !removedImageIds.includes(id)), ...pendingImageIds]
  }, [task.images, removedImageIds, pendingImageIds])
  const taskImages = useTaskImages(currentImageIds)
  const { pickImages, pending: imagesPending } = useImagePicker()
  const handleFileDrop = useCallback(async (files) => {
    const remaining = 3 - currentImageIds.length
    if (remaining <= 0) return
    const { ids, errors } = await processFiles(files, remaining)
    if (ids.length) setPendingImageIds((prev) => [...prev, ...ids])
    if (errors.length) for (const err of new Set(errors)) showToast(t(`images.${err}`))
  }, [currentImageIds.length, t])
  const { isDragOver, handlers: dropHandlers } = useFileDrop(handleFileDrop, {
    enabled: currentImageIds.length < 3,
  })
  const saveRef = useRef(null)
  const { sheetRef, handlers: swipeHandlers } = useSwipeToDismiss(
    useCallback(() => saveRef.current?.(), [])
  )

  const columns = useMemo(
    () => allColumns.filter((c) => c.tabId === selectedTabId).sort((a, b) => a.order - b.order),
    [allColumns, selectedTabId]
  )

  // When tab changes, select appropriate column
  const autoColumnId = selectedTabId === currentTabId ? task.columnId : (columns.length > 0 ? columns[0].id : null)
  const [prevAutoColumnId, setPrevAutoColumnId] = useState(autoColumnId)
  if (autoColumnId !== null && autoColumnId !== prevAutoColumnId) {
    setPrevAutoColumnId(autoColumnId)
    setSelectedColumnId(autoColumnId)
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [text])

  // Place cursor at end of text on mount
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [])

  // Back button / Escape closes fullscreen image before closing modal
  useBackClose(!!fullscreenImage, () => setFullscreenImage(null))

  const handleSave = () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== task.text) {
      editTask(task.id, trimmed)
    }
    if (selectedColumnId !== task.columnId) {
      const state = useStore.getState()
      const targetColTasks = state.tasks
        .filter((t) => t.columnId === selectedColumnId && t.id !== task.id && (!t.archived || state.justArchivedIds.includes(t.id)))
      moveTask(task.id, selectedColumnId, targetColTasks.length)
    }
    // Persist reminder
    if (reminderValue) {
      const ts = new Date(reminderValue).getTime()
      if (ts !== task.reminderAt) setReminder(task.id, ts)
    } else if (task.reminderAt) {
      clearReminder(task.id)
    }
    // Persist image changes
    if (removedImageIds.length > 0) {
      for (const id of removedImageIds) {
        removeTaskImage(task.id, id)
        // Async cleanup from IndexedDB
        deleteImage(id).catch(() => {})
      }
    }
    if (pendingImageIds.length > 0) {
      addTaskImages(task.id, pendingImageIds)
    }
    onClose()
  }
  useEffect(() => { saveRef.current = handleSave })

  const handleDelete = () => {
    for (const id of pendingImageIds) deleteImage(id).catch(() => {})
    deleteTask(task.id)
    onClose()
  }

  const handleOverlayClick = () => {
    handleSave()
  }

  const formattedDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const toggleSection = (section) => {
    setExpandedSection((prev) => prev === section ? null : section)
  }

  const handleReminderRowClick = async () => {
    if (!('Notification' in window)) {
      setReminderError(t('reminder.unsupported'))
      return
    }
    const granted = await requestNotificationPermission()
    if (!granted) {
      setReminderError(t('reminder.permissionDenied'))
      return
    }
    setReminderError(null)
    toggleSection('reminder')
  }

  const modalContent = (
    <>
      {/* Scrollable content — everything except action buttons */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {/* Title — mobile only (desktop uses modal header bar) */}
        {!isDesktop && (
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('taskDetail.editTask')}
          </h2>
        )}
        {formattedDate && (
          <p className={`text-xs ${!isDesktop ? 'mt-1' : ''} mb-3`} style={{ color: 'var(--text-muted)' }}>
            {t('taskDetail.created', formattedDate)}
          </p>
        )}
        {!formattedDate && <div className="mb-3" />}

        {/* Tab pills + Column pills */}
        <div className="mb-3">
          <div className={`flex gap-1.5 mb-2.5 ${isDesktop ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={tab.id === selectedTabId ? (el) => el?.scrollIntoView({ inline: 'center', block: 'nearest' }) : undefined}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSelectedTabId(tab.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 hover:opacity-80"
                style={{
                  background: tab.id === selectedTabId ? 'var(--color-primary-500)' : 'var(--bg-column)',
                  color: tab.id === selectedTabId ? 'white' : 'var(--text-secondary)',
                }}
              >
                {tab.emoji} {tab.name}
              </button>
            ))}
          </div>
          <div className={`flex gap-1.5 ${isDesktop ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'}`}>
            {columns.map((col) => (
              <button
                key={col.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSelectedColumnId(col.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 hover:opacity-80"
                style={{
                  background: col.id === selectedColumnId ? 'var(--color-primary-500)' : 'var(--bg-column)',
                  color: col.id === selectedColumnId ? 'white' : 'var(--text-secondary)',
                }}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleSave()
          }}
          rows={1}
          className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none overflow-hidden mb-2"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          autoFocus
        />

        {/* Image gallery */}
        <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar items-center">
          {taskImages.map((img) => (
            <div key={img.id} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden" style={{ background: 'var(--bg-column)' }}>
              {img.loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('images.downloading')}</span>
                </div>
              ) : img.url ? (
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setFullscreenImage(img.url)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (pendingImageIds.includes(img.id)) {
                    setPendingImageIds((prev) => prev.filter((i) => i !== img.id))
                    deleteImage(img.id).catch(() => {})
                  } else {
                    setRemovedImageIds((prev) => [...prev, img.id])
                  }
                }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {currentImageIds.length < 3 && (
            <button
              type="button"
              disabled={imagesPending}
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                const { ids, errors } = await pickImages(currentImageIds.length)
                if (ids.length) setPendingImageIds((prev) => [...prev, ...ids])
                if (errors.length) for (const err of new Set(errors)) showToast(t(`images.${err}`))
              }}
              className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="text-[10px]">{imagesPending ? '...' : '+'}</span>
            </button>
          )}
        </div>

        <Separator />

        {/* Reminder section — compact row */}
        <div>
          {reminderError && (
            <p className="text-xs px-1 pt-2" style={{ color: '#ef4444' }}>{reminderError}</p>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={expandedSection === 'reminder' ? () => toggleSection('reminder') : handleReminderRowClick}
            className="w-full flex items-center gap-2 py-2.5 px-1 text-xs transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {bellIcon}
            <span className="flex-1 text-left font-medium truncate">
              {expandedSection === 'reminder'
                ? t('reminder.add')
                : reminderValue
                  ? formatReminderDate(new Date(reminderValue).getTime(), language)
                  : t('reminder.add')
              }
            </span>
            {reminderValue && expandedSection !== 'reminder' && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => { e.stopPropagation(); setReminderValue('') }}
                className="p-2 -m-1 rounded-md hover:opacity-80 transition-opacity"
                style={{ color: '#ef4444' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <Chevron expanded={expandedSection === 'reminder'} />
          </button>

          {/* Expanded reminder picker */}
          {expandedSection === 'reminder' && (
            <div className="pb-2 px-1">
              {!isDesktop && !isStandalone && (
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
                {reminderValue && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setReminderValue('')}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: 'color-mix(in srgb, #ef4444 15%, var(--bg-column))', color: '#ef4444' }}
                  >
                    {t('reminder.clear')}
                  </button>
                )}
              </div>
              {/* Preset pills */}
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
        </div>

      </div>

      {/* Action buttons — fixed at bottom */}
      <div className="flex gap-3 pt-3">
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-medium transition-colors hover:opacity-90"
          style={{ borderColor: '#ef4444', color: '#ef4444', background: 'transparent' }}
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ background: 'var(--color-primary-500)' }}
        >
          {t('taskDetail.save')}
        </button>
      </div>
    </>
  )

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex ${isDesktop ? 'items-center justify-center p-4' : 'items-end'}`}
      style={{ background: 'var(--bg-overlay)' }}
      onClick={handleOverlayClick}
    >
      <div
        ref={!isDesktop ? sheetRef : undefined}
        className={`relative w-full flex flex-col ${isDesktop ? 'max-w-md max-h-[80vh] rounded-xl shadow-lg overflow-hidden' : 'max-h-[85vh] rounded-t-2xl p-5 shadow-xl'}`}
        style={{
          background: 'var(--bg-card)',
          ...(!isDesktop && { paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }),
        }}
        onClick={(e) => e.stopPropagation()}
        {...dropHandlers}
      >
        {isDragOver && (
          <div
            className="absolute inset-0 z-10 rounded-xl border-2 border-dashed pointer-events-none"
            style={{ borderColor: 'var(--color-primary-500)', background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)' }}
          />
        )}
        {isDesktop ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('taskDetail.editTask')}
              </h2>
              <button onClick={handleSave} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 flex flex-col flex-1 min-h-0">
              {modalContent}
            </div>
          </>
        ) : (
          <>
            <div className="py-3 -mx-5 px-5 cursor-grab" {...swipeHandlers}>
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--border-color)' }} />
            </div>
            {modalContent}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onConfirm={() => { setShowConfirm(false); handleDelete() }}
        onCancel={() => setShowConfirm(false)}
        title={t('taskDetail.confirmTitle')}
        message={t('taskDetail.confirmMessage')}
      />

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
          onClick={(e) => { e.stopPropagation(); setFullscreenImage(null) }}
        >
          <img src={fullscreenImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>,
    document.body
  )
}
