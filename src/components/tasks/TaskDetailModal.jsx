import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss'
import { ConfirmModal } from '../shared/ConfirmModal'

export function TaskDetailModal({ task, onClose }) {
  const isDesktop = useIsDesktop()
  const { language, t } = useLanguage()
  const tabs = useStore((s) => s.tabs)
  const allColumns = useStore((s) => s.columns)
  const editTask = useStore((s) => s.editTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const moveTask = useStore((s) => s.moveTask)

  // Find current column and tab
  const currentColumn = allColumns.find((c) => c.id === task.columnId)
  const currentTabId = currentColumn?.tabId

  const [text, setText] = useState(task.text)
  const [selectedTabId, setSelectedTabId] = useState(currentTabId)
  const [selectedColumnId, setSelectedColumnId] = useState(task.columnId)
  const [showConfirm, setShowConfirm] = useState(false)
  const textareaRef = useRef(null)
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

  const handleSave = () => {
    const trimmed = text.trim()
    if (trimmed && trimmed !== task.text) {
      editTask(task.id, trimmed)
    }
    if (selectedColumnId !== task.columnId) {
      const targetColTasks = useStore.getState().tasks
        .filter((t) => t.columnId === selectedColumnId && !t.archived)
      moveTask(task.id, selectedColumnId, targetColTasks.length)
    }
    onClose()
  }
  useEffect(() => { saveRef.current = handleSave })

  const handleDelete = () => {
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

  const modalContent = (
    <>
      {/* Header */}
      <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        {t('taskDetail.editTask')}
      </h2>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        rows={1}
        className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none overflow-hidden mb-3"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        autoFocus
      />

      {/* Created date */}
      {formattedDate && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('taskDetail.created', formattedDate)}
        </p>
      )}

      {/* Move to section */}
      <div className="mb-4">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          {t('taskDetail.moveTo')}
        </p>

        {/* Tab pills */}
        <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
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

        {/* Column pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
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

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirm(true)}
          className="py-2.5 px-4 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
          style={{ background: 'color-mix(in srgb, #ef4444 15%, var(--bg-column))', color: '#ef4444' }}
        >
          {t('taskDetail.delete')}
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="py-2.5 px-6 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
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
        className={`w-full shadow-xl ${isDesktop ? 'max-w-md rounded-2xl p-5' : 'rounded-t-2xl p-5'}`}
        style={{
          background: 'var(--bg-card)',
          ...(!isDesktop && { paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }),
        }}
        onClick={(e) => e.stopPropagation()}
        {...(!isDesktop ? swipeHandlers : {})}
      >
        {!isDesktop && (
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--border-color)' }} />
        )}
        {modalContent}
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onConfirm={() => { setShowConfirm(false); handleDelete() }}
        onCancel={() => setShowConfirm(false)}
        title={t('taskDetail.confirmTitle')}
        message={t('taskDetail.confirmMessage')}
      />
    </div>,
    document.body
  )
}
