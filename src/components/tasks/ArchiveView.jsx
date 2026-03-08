import { useMemo, useRef, useState } from 'react'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useBackClose } from '../../hooks/useBackClose'
import { ConfirmModal } from '../shared/ConfirmModal'

export function ArchiveView() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)
  const allTasks = useStore((s) => s.tasks)
  const allColumns = useStore((s) => s.columns)
  const restoreTask = useStore((s) => s.restoreTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const setShowArchive = useStore((s) => s.setShowArchive)
  const { language, t } = useLanguage()

  useBackClose(true, () => setShowArchive(false))

  const [confirmId, setConfirmId] = useState(null)

  const tabGroups = useMemo(() => {
    const sortedTabs = [...tabs].sort((a, b) => a.order - b.order)
    return sortedTabs.map((tab) => {
      const colIds = allColumns.filter((c) => c.tabId === tab.id).map((c) => c.id)
      const tasks = allTasks
        .filter(
          (t) =>
            t.archived &&
            (colIds.includes(t.columnId) || colIds.includes(t.originalColumnId))
        )
        .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0))
      return { tab, tasks }
    })
  }, [tabs, allColumns, allTasks])

  // Mobile swipe state
  const initialIndex = useMemo(() => {
    const sortedTabs = [...tabs].sort((a, b) => a.order - b.order)
    const idx = sortedTabs.findIndex((t) => t.id === activeTabId)
    return idx >= 0 ? idx : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [mobileTabIndex, setMobileTabIndex] = useState(initialIndex)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const swipeOffset = useRef(0)
  const [, forceRender] = useState(0)

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeOffset.current = 0
  }

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault()
      swipeOffset.current = dx
      forceRender((n) => n + 1)
    }
  }

  const handleTouchEnd = () => {
    const threshold = 60
    if (swipeOffset.current < -threshold && mobileTabIndex < tabGroups.length - 1) {
      setMobileTabIndex((i) => i + 1)
    } else if (swipeOffset.current > threshold && mobileTabIndex > 0) {
      setMobileTabIndex((i) => i - 1)
    }
    swipeOffset.current = 0
    touchStartX.current = null
    touchStartY.current = null
    forceRender((n) => n + 1)
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getColumnName = (colId) => {
    const col = allColumns.find((c) => c.id === colId)
    return col?.name || t('archive.unknownList')
  }

  const renderTaskCard = (task) => (
    <div
      key={task.id}
      className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm line-through opacity-60" style={{ color: 'var(--text-primary)' }}>
          {task.text}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('archive.meta', formatDate(task.archivedAt), getColumnName(task.originalColumnId))}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => restoreTask(task.id)}
          className="p-2.5 rounded-xl transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
          style={{ color: 'var(--color-primary-500)' }}
          title={t('archive.restore')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={() => setConfirmId(task.id)}
          className="p-2.5 rounded-xl transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          style={{ color: '#ef4444' }}
          title={t('archive.deletePermanently')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )

  const renderEmptyState = () => (
    <div className="text-center py-16">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        {/* Open box, empty */}
        <path d="M10 22l8-10h20l8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="10" y="22" width="36" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 22h12a2 2 0 012 2v2a2 2 0 002 2h4a2 2 0 002-2v-2a2 2 0 012-2h12" stroke="currentColor" strokeWidth="1.5" />
        {/* Cute face inside box */}
        <circle cx="23" cy="35" r="1.5" fill="currentColor" />
        <circle cx="33" cy="35" r="1.5" fill="currentColor" />
        <path d="M25 39c1.2 1.2 4.8 1.2 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Sparkle */}
        <path d="M46 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="var(--color-primary-400)" />
        {/* Cobweb hint */}
        <path d="M4 14c3 2 5 6 5 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        <path d="M4 14c5 0 9 3 11 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      </svg>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('archive.empty')}</p>
    </div>
  )

  const renderTabTasks = (tasks) => (
    tasks.length === 0 ? renderEmptyState() : (
      <div className="space-y-2">
        {tasks.map(renderTaskCard)}
      </div>
    )
  )

  const renderTabColumn = ({ tab, tasks }) => (
    <div key={tab.id}>
      <h3 className="text-sm font-semibold mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>
        {tab.emoji} {tab.name}
      </h3>
      {renderTabTasks(tasks)}
    </div>
  )

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 md:p-6 pb-2 md:pb-2 shrink-0">
        <button
          onClick={() => setShowArchive(false)}
          className="p-1.5 rounded-lg transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('archive.title')}</h2>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-x-auto overflow-y-auto gap-4 p-6 pt-4 items-start">
        {tabGroups.map(({ tab, tasks }) => (
          <div
            key={tab.id}
            className="w-80 shrink-0 rounded-xl p-4"
            style={{ background: 'var(--bg-column)' }}
          >
            {renderTabColumn({ tab, tasks })}
          </div>
        ))}
      </div>

      {/* Mobile layout — same structure as App.jsx swipe container */}
      <div
        className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 min-h-0">
          <div
            className="flex h-full"
            style={{
              transform: `translateX(calc(-${mobileTabIndex * 100}% + ${swipeOffset.current}px))`,
              transition: swipeOffset.current !== 0 ? 'none' : 'transform 0.3s ease',
            }}
          >
            {tabGroups.map(({ tab, tasks }) => (
              <div key={tab.id} className="w-full shrink-0 h-full p-3 flex flex-col">
                <h3 className="text-sm font-semibold mb-3 px-1 shrink-0" style={{ color: 'var(--text-secondary)' }}>
                  {tab.emoji} {tab.name}
                </h3>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {renderTabTasks(tasks)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        {tabGroups.length > 1 && (
          <div className="shrink-0 flex justify-center gap-1.5 pt-0 pb-3">
            {tabGroups.map(({ tab }, i) => (
              <button
                key={tab.id}
                onClick={() => setMobileTabIndex(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === mobileTabIndex ? 'var(--color-primary-500)' : 'var(--border-color)',
                  transform: i === mobileTabIndex ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={() => { deleteTask(confirmId); setConfirmId(null) }}
        onCancel={() => setConfirmId(null)}
        title={t('archive.confirmTitle')}
        message={t('archive.confirmMessage')}
      />
    </>
  )
}
