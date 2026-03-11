import { useMemo, useRef, useCallback, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { ColumnHeader } from './ColumnHeader'
import { TaskCard } from '../tasks/TaskCard'
import { TaskInput } from '../tasks/TaskInput'
import { useFileDrop, processFiles } from '../../hooks/useImages'
import { unprotectImage } from '../../lib/imageStore'
import { showToast } from '../../hooks/useToast'

export function Column({ column, onAddTask, liveTaskIds, onOpenDetail, highlightedTaskId, dragHandleProps = null }) {
  const allTasks = useStore((s) => s.tasks)
  const justArchivedIds = useStore((s) => s.justArchivedIds)
  const addTask = useStore((s) => s.addTask)
  const { t } = useLanguage()

  const handleFileDrop = useCallback(async (files) => {
    const { ids, errors } = await processFiles(files, 3)
    if (ids.length) {
      addTask(column.id, '', ids)
      ids.forEach((id) => unprotectImage(id))
    }
    if (errors.length) for (const err of new Set(errors)) showToast(t(`images.${err}`))
  }, [column.id, addTask, t])
  const { isDragOver: isFileOver, handlers: fileDropHandlers } = useFileDrop(handleFileDrop)

  const derivedTasks = useMemo(
    () => allTasks
      .filter((t) => t.columnId === column.id && (!t.archived || justArchivedIds.includes(t.id)))
      .sort((a, b) => a.order - b.order),
    [allTasks, column.id, justArchivedIds]
  )

  // During drag: render tasks in the order from liveTaskIds (includes cross-column moves)
  const tasks = useMemo(() => {
    if (!liveTaskIds) return derivedTasks
    return liveTaskIds.map((id) => allTasks.find((t) => t.id === id)).filter(Boolean)
  }, [liveTaskIds, derivedTasks, allTasks])

  const taskIds = useMemo(
    () => liveTaskIds || derivedTasks.map((t) => t.id),
    [liveTaskIds, derivedTasks]
  )

  const droppableData = useMemo(() => ({ type: 'column', column }), [column])
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: droppableData,
  })

  // Manual touch scroll — cards have touch-action:none (needed for drag),
  // so native scroll doesn't work on card touches. We handle it in JS with momentum.
  const scrollRef = useRef(null)
  const touchRef = useRef(null)
  const momentumRef = useRef(null)
  const isDraggingRef = useRef(false)
  useEffect(() => { isDraggingRef.current = !!liveTaskIds }, [liveTaskIds])

  const combinedRef = useCallback((node) => {
    setNodeRef(node)
    scrollRef.current = node
  }, [setNodeRef])

  const handleTouchStart = useCallback((e) => {
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current)
      momentumRef.current = null
    }
    const t = e.touches[0]
    if (!t) return
    touchRef.current = { startX: t.clientX, startY: t.clientY, lastY: t.clientY, lastTime: performance.now(), velocity: 0, locked: null }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!touchRef.current || !scrollRef.current || isDraggingRef.current) return
    const t = e.touches[0]
    if (!t) return

    // Lock direction after enough movement
    if (!touchRef.current.locked) {
      const dx = Math.abs(t.clientX - touchRef.current.startX)
      const dy = Math.abs(t.clientY - touchRef.current.startY)
      if (dx > 5 || dy > 5) {
        touchRef.current.locked = dy >= dx ? 'vertical' : 'horizontal'
      }
    }

    // Vertical scroll — stop propagation so swipe handler doesn't interfere
    if (touchRef.current.locked === 'vertical') {
      e.stopPropagation()
      const now = performance.now()
      const dy = touchRef.current.lastY - t.clientY
      const dt = now - touchRef.current.lastTime
      if (dt > 0) touchRef.current.velocity = dy / dt
      touchRef.current.lastY = t.clientY
      touchRef.current.lastTime = now
      scrollRef.current.scrollTop += dy
    }
    // Horizontal — let it propagate to the swipe handler
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!touchRef.current || !scrollRef.current || isDraggingRef.current) {
      touchRef.current = null
      return
    }
    const wasVertical = touchRef.current.locked === 'vertical'
    const el = scrollRef.current
    const v = touchRef.current.velocity
    touchRef.current = null

    // Stop propagation for vertical scroll to avoid triggering swipe forceRender
    if (wasVertical) e.stopPropagation()

    if (Math.abs(v) < 0.3) return
    let vel = v * 16
    const friction = 0.95
    const step = () => {
      if (Math.abs(vel) < 0.5) { momentumRef.current = null; return }
      el.scrollTop += vel
      vel *= friction
      momentumRef.current = requestAnimationFrame(step)
    }
    momentumRef.current = requestAnimationFrame(step)
  }, [])

  return (
    <div
      className="relative flex flex-col min-h-0 max-h-full rounded-xl w-full md:min-w-[280px] md:w-[320px] shrink-0 transition-colors"
      style={{
        background: 'var(--bg-column)',
      }}
      {...fileDropHandlers}
    >
      {isFileOver && (
        <div
          className="absolute inset-0 z-10 rounded-xl border-2 border-dashed flex items-center justify-center pointer-events-none"
          style={{ borderColor: 'var(--color-primary-500)', background: 'color-mix(in srgb, var(--color-primary-500) 10%, transparent)' }}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="var(--color-primary-500)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
      )}
      <ColumnHeader column={column} taskCount={tasks.filter((t) => !t.archived).length} dragHandleProps={dragHandleProps} />

      {/* Desktop task input */}
      <div className="hidden md:block">
        <TaskInput columnId={column.id} />
      </div>

      {/* Task list */}
      <div
        ref={combinedRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 pb-3"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} isHighlighted={task.id === highlightedTaskId} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              {/* Sleepy notepad */}
              <rect x="10" y="10" width="24" height="30" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <line x1="16" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <line x1="16" y1="26" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              {/* Closed eyes — zzZ */}
              <path d="M18 32c1 0 2-1 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M25 32c1 0 2-1 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              {/* Zzz */}
              <text x="36" y="16" fill="var(--color-primary-400)" fontSize="9" fontWeight="bold" fontFamily="system-ui">z</text>
              <text x="39" y="10" fill="var(--color-primary-300)" fontSize="7" fontWeight="bold" fontFamily="system-ui">z</text>
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('list.noTasks')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              {t('list.empty')}
            </p>
            {onAddTask && (
              <button
                onClick={onAddTask}
                className="md:hidden mt-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
                style={{ background: 'var(--color-primary-500)', color: 'white' }}
              >
                {t('list.addTask')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
