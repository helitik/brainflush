import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useBackClose } from '../../hooks/useBackClose'
import { MoveTasksModal } from './MoveTasksModal'

export function ColumnHeader({ column, taskCount, dragHandleProps = null }) {
  const renameColumn = useStore((s) => s.renameColumn)
  const deleteColumn = useStore((s) => s.deleteColumn)
  const moveColumn = useStore((s) => s.moveColumn)
  const allColumns = useStore((s) => s.columns)
  const { t } = useLanguage()

  const { isFirst, isLast } = useMemo(() => {
    const tabCols = allColumns.filter((c) => c.tabId === column.tabId).sort((a, b) => a.order - b.order)
    const idx = tabCols.findIndex((c) => c.id === column.id)
    return { isFirst: idx === 0, isLast: idx === tabCols.length - 1 }
  }, [allColumns, column.id, column.tabId])

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showMoveAll, setShowMoveAll] = useState(false)

  useBackClose(confirmDelete, () => setConfirmDelete(false))

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== column.name) {
      renameColumn(column.id, trimmed)
    } else {
      setName(column.name)
    }
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 relative">
      {editing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') {
              setName(column.name)
              setEditing(false)
            }
          }}
          autoFocus
          className="flex-1 px-1.5 py-0.5 text-sm font-semibold rounded border outline-none"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--color-primary-500)',
            color: 'var(--text-primary)',
          }}
        />
      ) : (
        <button
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-left text-sm font-semibold truncate cursor-pointer rounded px-1.5 py-0.5 hover:bg-surface-100 dark:hover:bg-surface-800"
          style={{ color: 'var(--text-primary)', cursor: dragHandleProps ? 'grab' : undefined }}
          {...dragHandleProps}
        >
          {column.name}
        </button>
      )}

      <span
        className="text-xs font-medium px-1.5 py-0.5 rounded-full"
        style={{ background: 'var(--border-color)', color: 'var(--text-secondary)' }}
      >
        {taskCount}
      </span>

      {/* Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div
              className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg shadow-lg border py-1"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => {
                  setShowMenu(false)
                  setEditing(true)
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
                style={{ color: 'var(--text-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                {t('listHeader.rename')}
              </button>
              {!isFirst && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    moveColumn(column.id, -1)
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('listHeader.moveLeft')}
                </button>
              )}
              {!isLast && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    moveColumn(column.id, 1)
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {t('listHeader.moveRight')}
                </button>
              )}
              {taskCount > 0 && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowMoveAll(true)
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-700"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  {t('listHeader.moveAllTasks')}
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false)
                  setConfirmDelete(true)
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{ color: '#ef4444' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('listHeader.delete')}
              </button>
            </div>
          </>
        )}
      </div>

      <MoveTasksModal
        isOpen={showMoveAll}
        onClose={() => setShowMoveAll(false)}
        column={column}
        taskCount={taskCount}
      />

      {/* Delete confirmation modal */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'var(--bg-overlay)' }} onClick={() => setConfirmDelete(false)}>
          <div
            className="w-full max-w-xs rounded-xl shadow-lg overflow-hidden"
            style={{ background: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('listHeader.deleteTitle')}
              </h2>
              <button onClick={() => setConfirmDelete(false)} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {t('listHeader.deleteConfirmPrefix')} <strong>{column.name}</strong> {t('listHeader.deleteConfirmSuffix', taskCount)}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-800"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('listHeader.cancel')}
                </button>
                <button
                  onClick={() => deleteColumn(column.id)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90"
                  style={{ background: '#ef4444' }}
                >
                  {t('listHeader.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
