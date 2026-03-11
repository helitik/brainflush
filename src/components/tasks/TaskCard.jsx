import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { useTaskImages } from '../../hooks/useImages'

export function ImageCell({ img, className, style }) {
  if (img.url) {
    return <img src={img.url} alt="" draggable={false} className={className} style={style} />
  }
  // Error state — show broken image icon (no pulse)
  if (img.error) {
    return (
      <div
        className={`${className} flex items-center justify-center`}
        style={{ ...style, background: 'var(--bg-column)' }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={1.5} style={{ opacity: 0.3 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
    )
  }
  // Loading placeholder
  return (
    <div
      className={`${className} flex items-center justify-center animate-pulse`}
      style={{ ...style, background: 'var(--bg-column)' }}
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={1.5} style={{ opacity: 0.4 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
    </div>
  )
}

function formatRelativeTime(timestamp, language) {
  const now = Date.now()
  const diff = timestamp - now
  if (diff <= 0) return { label: language === 'fr' ? 'En retard' : 'Overdue', overdue: false }
  const minutes = Math.ceil(diff / 60000)
  if (minutes <= 1) return { label: '< 1m', overdue: false }
  if (minutes < 60) return { label: `${minutes}m`, overdue: false }
  const hours = Math.round(diff / 3600000)
  if (hours < 24) return { label: `${hours}h`, overdue: false }
  const days = Math.round(diff / 86400000)
  if (days === 1) return { label: language === 'fr' ? 'Demain' : 'Tomorrow', overdue: false }
  return { label: `${days}d`, overdue: false }
}

// Module-level height cache — survives component remounts during cross-column drag
const cardHeights = new Map()

export function TaskCard({ task, onOpenDetail, isHighlighted }) {
  const archiveTask = useStore((s) => s.archiveTask)
  const restoreTask = useStore((s) => s.restoreTask)
  const justArchivedIds = useStore((s) => s.justArchivedIds)
  const { language, t } = useLanguage()
  const isJustArchived = task.archived && justArchivedIds.includes(task.id)
  const hasReminder = task.reminderAt && !task.archived
  const reminderInfo = hasReminder ? formatRelativeTime(task.reminderAt, language) : null
  const hasImages = task.images?.length > 0
  const taskImages = useTaskImages(hasImages ? task.images : [])

  const firstUrl = useMemo(() => {
    const m = task.text.match(/https?:\/\/\S+/)
    return m ? m[0] : null
  }, [task.text])

  const sortableData = useMemo(() => ({ type: 'task', task }), [task])
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id: task.id, data: sortableData, disabled: isJustArchived ? { draggable: true } : false })

  // Measure card height for the drop placeholder (stored in module-level Map)
  const nodeRef = useRef(null)
  const setRef = useCallback((node) => {
    setNodeRef(node)
    nodeRef.current = node
    if (node) cardHeights.set(task.id, node.offsetHeight)
  }, [setNodeRef, task.id])

  // Re-measure when card resizes (images decode, text reflow, etc.)
  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    const ro = new ResizeObserver(() => {
      cardHeights.set(task.id, node.offsetHeight)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [task.id, isDragging])

  // Track if card was ever part of a sort — prevents animate-fade-in replay on drag end
  const [wasSorting, setWasSorting] = useState(false)
  if (isSorting && !wasSorting) setWasSorting(true)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }

  // When dragging, this element IS the drop placeholder — sortable positions it correctly
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="mb-1.5">
        <div
          className="rounded-lg border-2 border-dashed"
          style={{ height: cardHeights.get(task.id) || 40, borderColor: 'var(--color-primary-500)', background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)' }}
        />
      </div>
    )
  }

  const imageCount = hasImages ? taskImages.length : 0

  return (
    <div
      ref={setRef}
      style={style}
      className={`relative overflow-hidden rounded-lg mb-1.5${!isSorting && !wasSorting ? ' animate-fade-in' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        className={`relative rounded-lg transition-shadow group hover:shadow-md${isHighlighted ? ' animate-highlight-pulse' : ''}${!isJustArchived ? ' cursor-pointer' : ''}`}
        style={{
          background: isJustArchived ? 'color-mix(in srgb, var(--bg-card) 85%, black)' : 'var(--bg-card)',
          boxShadow: isJustArchived ? 'none' : 'var(--shadow-sm)',
        }}
        onClick={isJustArchived ? undefined : () => onOpenDetail?.(task)}
      >
        {/* Image grid — Google Keep style */}
        {imageCount > 0 && (
          <div style={isJustArchived ? { opacity: 0.4 } : undefined}>
            {imageCount === 1 && (
              <div className="w-full overflow-hidden rounded-t-lg" style={{ maxHeight: 180 }}>
                <ImageCell img={taskImages[0]} className="w-full object-cover" style={{ maxHeight: 180, height: taskImages[0].url ? undefined : 140 }} />
              </div>
            )}
            {imageCount === 2 && (
              <div className="flex gap-0.5 overflow-hidden rounded-t-lg" style={{ height: 140 }}>
                <ImageCell img={taskImages[0]} className="w-1/2 object-cover" />
                <ImageCell img={taskImages[1]} className="w-1/2 object-cover" />
              </div>
            )}
            {imageCount === 3 && (
              <div className="flex gap-0.5 overflow-hidden rounded-t-lg" style={{ height: 160 }}>
                <ImageCell img={taskImages[0]} className="w-2/3 object-cover" />
                <div className="w-1/3 flex flex-col gap-0.5">
                  <ImageCell img={taskImages[1]} className="flex-1 w-full object-cover min-h-0" />
                  <ImageCell img={taskImages[2]} className="flex-1 w-full object-cover min-h-0" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content row: checkbox + text + indicators */}
        <div className="flex items-start gap-2 p-3">
          {/* Check / archive / undo button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isJustArchived) {
                restoreTask(task.id)
              } else {
                archiveTask(task.id)
              }
              if (navigator.vibrate) navigator.vibrate(10)
            }}
            className="mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors group/check hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            style={isJustArchived
              ? { borderColor: 'var(--color-primary-500)', background: 'var(--color-primary-500)' }
              : { borderColor: 'var(--border-hover)' }
            }
            title={isJustArchived ? t('taskCard.undo') : t('taskCard.archive')}
          >
            <svg
              className={isJustArchived ? 'w-3 h-3 opacity-100' : 'w-3 h-3 opacity-0 group-hover/check:opacity-100 transition-opacity'}
              fill="none" viewBox="0 0 24 24"
              stroke={isJustArchived ? 'white' : 'var(--color-primary-500)'}
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          {/* Text */}
          {task.text ? (
            <span
              className={`flex-1 text-sm select-none min-w-0 break-words whitespace-pre-line ${isJustArchived ? '' : 'cursor-pointer'}`}
              style={isJustArchived
                ? { color: 'var(--text-primary)', textDecoration: 'line-through', opacity: 0.5, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
                : { color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
              }
            >
              {task.text}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          {/* Reminder indicator */}
          {reminderInfo && (
            <span
              className="mt-0.5 shrink-0 flex items-center gap-0.5 text-xs"
              style={{ color: reminderInfo.overdue ? '#ef4444' : 'var(--text-muted)' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {reminderInfo.label}
            </span>
          )}

          {/* External link icon */}
          {firstUrl && !isJustArchived && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.open(firstUrl, '_blank', 'noopener')
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0 p-0.5 rounded opacity-40 md:opacity-0 md:group-hover:opacity-60 hover:!opacity-100 transition-opacity"
              title={firstUrl}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
