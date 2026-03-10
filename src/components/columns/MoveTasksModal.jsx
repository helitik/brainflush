import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useBackClose } from '../../hooks/useBackClose'

export function MoveTasksModal({ isOpen, onClose, column, taskCount }) {
  const tabs = useStore((s) => s.tabs)
  const allColumns = useStore((s) => s.columns)
  const moveAllTasks = useStore((s) => s.moveAllTasks)
  const { t } = useLanguage()

  const [tabId, setTabId] = useState(column.tabId)
  const [targetColumnId, setTargetColumnId] = useState('')

  useBackClose(isOpen, onClose)

  // Reset when modal opens or source tab changes
  const openTabId = isOpen ? column.tabId : null
  const [prevOpenTabId, setPrevOpenTabId] = useState(openTabId)
  if (openTabId !== prevOpenTabId) {
    setPrevOpenTabId(openTabId)
    if (isOpen) {
      setTabId(column.tabId)
      setTargetColumnId('')
    }
  }

  const columns = useMemo(() => {
    const tabCols = allColumns
      .filter((c) => c.tabId === tabId)
      .sort((a, b) => a.order - b.order)
    // Exclude source column when viewing source tab
    if (tabId === column.tabId) {
      return tabCols.filter((c) => c.id !== column.id)
    }
    return tabCols
  }, [allColumns, tabId, column.tabId, column.id])

  // Auto-select first column when columns change
  const firstColId = columns.length > 0 ? columns[0].id : ''
  const [prevFirstColId, setPrevFirstColId] = useState(firstColId)
  if (firstColId !== prevFirstColId) {
    setPrevFirstColId(firstColId)
    if (isOpen) {
      setTargetColumnId(firstColId)
    }
  }

  if (!isOpen) return null

  const handleMove = () => {
    if (!targetColumnId) return
    moveAllTasks(column.id, targetColumnId)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('moveTasks.title')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
        {/* Tab selector */}
        <label
          className="text-xs font-medium mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('moveTasks.project')}
        </label>
        <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={tab.id === tabId ? (el) => el?.scrollIntoView({ inline: 'center', block: 'nearest' }) : undefined}
              type="button"
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

        {/* Column selector */}
        <label
          className="text-xs font-medium mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('moveTasks.list')}
        </label>
        {columns.length > 0 ? (
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {columns.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setTargetColumnId(col.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 hover:opacity-80"
                style={{
                  background: col.id === targetColumnId ? 'var(--color-primary-500)' : 'var(--bg-column)',
                  color: col.id === targetColumnId ? 'white' : 'var(--text-secondary)',
                }}
              >
                {col.name}
              </button>
            ))}
          </div>
        ) : (
          <p
            className="text-xs mb-4 italic"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('moveTasks.noLists')}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('moveTasks.cancel')}
          </button>
          <button
            onClick={handleMove}
            disabled={!targetColumnId}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 hover:opacity-90"
            style={{ background: 'var(--color-primary-500)' }}
          >
            {t('moveTasks.submit', taskCount)}
          </button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
