import { useState, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'

export function TaskCard({ task, onOpenDetail }) {
  const archiveTask = useStore((s) => s.archiveTask)
  const restoreTask = useStore((s) => s.restoreTask)
  const justArchivedIds = useStore((s) => s.justArchivedIds)
  const { t } = useLanguage()
  const isJustArchived = task.archived && justArchivedIds.includes(task.id)

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
  } = useSortable({ id: task.id, data: sortableData, disabled: isJustArchived })

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
          className="h-10 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--color-primary-500)', background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)' }}
        />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-lg mb-1.5${!isSorting && !wasSorting ? ' animate-fade-in' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        className="relative flex items-start gap-2 p-3 rounded-lg transition-shadow group hover:shadow-md"
        style={{
          background: isJustArchived ? 'color-mix(in srgb, var(--bg-card) 85%, black)' : 'var(--bg-card)',
          boxShadow: isJustArchived ? 'none' : 'var(--shadow-sm)',
        }}
      >
        {/* Check / archive / undo button (mobile only) */}
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
        <span
          onClick={isJustArchived ? undefined : () => onOpenDetail?.(task)}
          className={`flex-1 text-sm select-none min-w-0 break-words ${isJustArchived ? '' : 'cursor-pointer'}`}
          style={isJustArchived
            ? { color: 'var(--text-primary)', textDecoration: 'line-through', opacity: 0.5 }
            : { color: 'var(--text-primary)' }
          }
        >
          {task.text}
        </span>

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
  )
}
