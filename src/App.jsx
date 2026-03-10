import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  closestCenter,
  MeasuringStrategy,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useStore } from './hooks/useStore'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'
import { Header } from './components/layout/Header'
import { BottomBar } from './components/layout/BottomBar'
import { Drawer } from './components/layout/Drawer'
import { Column } from './components/columns/Column'
import { SortableColumn } from './components/columns/SortableColumn'
import { ColumnEditor } from './components/columns/ColumnEditor'
import { AddTaskSheet } from './components/tasks/AddTaskSheet'
import { ArchiveView } from './components/tasks/ArchiveView'
import { TaskDetailModal } from './components/tasks/TaskDetailModal'
import { useBackClose, useNavigationBack } from './hooks/useBackClose'
import { useIsDesktop } from './hooks/useIsDesktop'
import { useSyncEngine } from './hooks/useSync'
import { useReminderEngine } from './hooks/useReminders'
import { SyncSettings } from './components/sync/SyncSettings'
import { SyncConflict } from './components/sync/SyncConflict'
import { SyncReconnect } from './components/sync/SyncReconnect'
import { InstallBanner } from './components/layout/InstallBanner'
import { DataModal } from './components/shared/DataModal'
import { OnboardingModal } from './components/onboarding/OnboardingModal'
import { github } from './sync/providers/github'
import { google } from './sync/providers/google'

// Handle OAuth callbacks once at module load (before React StrictMode double-fires effects)
;(() => {
  const path = window.location.pathname
  const params = new URLSearchParams(window.location.search)

  if (path === '/auth/github/callback' && params.has('code')) {
    github.handleCallback(params)
      .then(() => {
        useStore.getState().setSyncProvider('github')
        window.history.replaceState({}, '', '/')
      })
      .catch((e) => {
        console.error('[sync] GitHub callback error:', e)
        window.history.replaceState({}, '', '/')
      })
  } else if (path === '/auth/google/callback' && params.has('code')) {
    google.handleCallback(params)
      .then((result) => {
        if (result?.needsConsent) {
          // No refresh_token returned (user already consented on another device).
          // Retry once with forced consent to get a refresh token for this device.
          google.startAuth(true)
          return
        }
        useStore.getState().setSyncProvider('google')
        window.history.replaceState({}, '', '/')
      })
      .catch((e) => {
        console.error('[sync] Google callback error:', e)
        window.history.replaceState({}, '', '/')
      })
  }

  // Notification click deep-link: store taskId for React to consume
  const taskIdParam = params.get('taskId')
  if (taskIdParam) {
    window.__pendingTaskId = taskIdParam
    window.history.replaceState({}, '', '/')
  }
})()

function App() {
  useTheme()
  useSyncEngine()
  useReminderEngine()
  const { t } = useLanguage()
  const isDesktop = useIsDesktop()

  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const allColumns = useStore((s) => s.columns)
  const tasks = useStore((s) => s.tasks)
  const justArchivedIds = useStore((s) => s.justArchivedIds)
  const columns = useMemo(
    () => allColumns.filter((c) => c.tabId === activeTabId).sort((a, b) => a.order - b.order),
    [allColumns, activeTabId]
  )
  const moveTask = useStore((s) => s.moveTask)
  const reorderColumns = useStore((s) => s.reorderColumns)
  const showArchive = useStore((s) => s.showArchive)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [addSheetColumnId, setAddSheetColumnId] = useState(null)
  const [showColumnEditor, setShowColumnEditor] = useState(false)
  const [showSyncSettings, setShowSyncSettings] = useState(false)
  const [showDataModal, setShowDataModal] = useState(false)
  const [activeTask, setActiveTask] = useState(null)
  const [detailTask, setDetailTask] = useState(null)
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)

  const hasCompletedOnboarding = useStore((s) => s.hasCompletedOnboarding)
  const [showOnboarding, setShowOnboarding] = useState(!hasCompletedOnboarding)

  // Live task-to-column mapping during drag (null when not dragging)
  const [liveTaskMap, setLiveTaskMap] = useState(null)
  const [activeColumnId, setActiveColumnId] = useState(null)

  const columnSortIds = useMemo(() => columns.map((c) => `col-sort-${c.id}`), [columns])

  // Intercept browser back to close overlays on mobile
  useBackClose(drawerOpen, () => setDrawerOpen(false))
  useBackClose(addSheetOpen, () => setAddSheetOpen(false))
  useBackClose(showColumnEditor, () => setShowColumnEditor(false))
  useBackClose(showSyncSettings, () => setShowSyncSettings(false))
  useBackClose(showDataModal, () => setShowDataModal(false))
  useBackClose(!!detailTask, () => setDetailTask(null))
  useBackClose(showOnboarding, () => { useStore.getState().completeOnboarding(); setShowOnboarding(false) })


  // Track tab changes for back navigation
  const restoreTab = useCallback((tabId) => {
    if (useStore.getState().tabs.some((t) => t.id === tabId)) {
      setActiveTab(tabId)
    }
  }, [setActiveTab])
  useNavigationBack(activeTabId, restoreTab)

  // Collision detection refs (official pattern to prevent oscillation)
  const lastOverId = useRef(null)
  const recentlyMovedToNewContainer = useRef(false)
  const liveTaskMapRef = useRef(null)
  const lastContainerMoveTime = useRef(0)
  const activeIdRef = useRef(null)

  // Sync refs after render for use in stable collision detection callback
  useEffect(() => {
    liveTaskMapRef.current = liveTaskMap
  }, [liveTaskMap])
  useEffect(() => {
    activeIdRef.current = activeTask?.id ?? null
  }, [activeTask])

  // Reset recentlyMovedToNewContainer after render (official @dnd-kit pattern)
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false
    })
  })

  // Mobile swipe state
  const [mobileColIndex, setMobileColIndex] = useState(0)
  const swipeRef = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const swipeOffsetRef = useRef(0)
  const [swipeOffsetPx, setSwipeOffsetPx] = useState(0)

  // Reset mobile column index when tab changes
  const [prevActiveTabId, setPrevActiveTabId] = useState(activeTabId)
  if (activeTabId !== prevActiveTabId) {
    setPrevActiveTabId(activeTabId)
    setMobileColIndex(0)
  }

  // Clamp mobile col index when columns change
  // columns.length is a valid index (the "Add column" panel)
  if (mobileColIndex > columns.length && columns.length > 0) {
    setMobileColIndex(columns.length)
  }

  // Follow viewed column when columns reorder
  const prevColumnsRef = useRef(columns)
  const mobileColIndexRef = useRef(mobileColIndex)
  useEffect(() => { mobileColIndexRef.current = mobileColIndex }, [mobileColIndex])

  useEffect(() => {
    const prev = prevColumnsRef.current
    prevColumnsRef.current = columns
    if (prev.length !== columns.length) return
    const prevCol = prev[mobileColIndexRef.current]
    if (!prevCol) return
    const newIdx = columns.findIndex((c) => c.id === prevCol.id)
    if (newIdx >= 0 && newIdx !== mobileColIndexRef.current) {
      setMobileColIndex(newIdx)
    }
  }, [columns])

  // Deep-link from notification click: navigate to task's tab/column and open detail
  useEffect(() => {
    const taskId = window.__pendingTaskId
    if (!taskId) return
    delete window.__pendingTaskId

    const state = useStore.getState()
    const task = state.tasks.find((t) => t.id === taskId)
    if (!task) return
    const column = state.columns.find((c) => c.id === task.columnId)
    if (!column) return

    setActiveTab(column.tabId)

    const tabCols = state.columns
      .filter((c) => c.tabId === column.tabId)
      .sort((a, b) => a.order - b.order)
    const colIdx = tabCols.findIndex((c) => c.id === column.id)

    // Defer column index update to after tab change render
    setTimeout(() => {
      if (colIdx >= 0) setMobileColIndex(colIdx)
      setHighlightedTaskId(task.id)
      setTimeout(() => setHighlightedTaskId(null), 5000)
    }, 100)
  }, [setActiveTab])

  // Listen for SW postMessage when notification is clicked while app is open
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== 'open-task') return
      const state = useStore.getState()
      const task = state.tasks.find((t) => t.id === event.data.taskId)
      if (!task) return
      const column = state.columns.find((c) => c.id === task.columnId)
      if (!column) return

      setActiveTab(column.tabId)
      const tabCols = state.columns
        .filter((c) => c.tabId === column.tabId)
        .sort((a, b) => a.order - b.order)
      const colIdx = tabCols.findIndex((c) => c.id === column.id)

      setTimeout(() => {
        if (colIdx >= 0) setMobileColIndex(colIdx)
        setHighlightedTaskId(task.id)
        setTimeout(() => setHighlightedTaskId(null), 5000)
      }, 100)
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [setActiveTab])

  // DnD sensors — mouse for desktop, touch for mobile
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )

  // Collision detection strategy (official @dnd-kit multi-container pattern)
  // Uses refs for stability — never recreated, always reads latest data
  const collisionDetectionStrategy = useCallback(
    (args) => {
      // Column drag — pointer-based: find which column gap the cursor is in
      if (activeIdRef.current?.startsWith('col-sort-')) {
        const colContainers = args.droppableContainers
          .filter((c) => String(c.id).startsWith('col-sort-'))
          .map((c) => {
            const rect = c.rect.current
            return rect ? { id: c.id, left: rect.left, right: rect.right, cx: rect.left + rect.width / 2 } : null
          })
          .filter(Boolean)
          .sort((a, b) => a.cx - b.cx)

        if (colContainers.length === 0) return []

        // Use pointer position to find the target
        const pointerX = args.pointerCoordinates?.x
        if (pointerX == null) return closestCenter(args)

        // Find the container whose center is closest to pointer, biased by direction
        // If pointer is left of a column's center → that column; if right → next column
        for (let i = 0; i < colContainers.length; i++) {
          if (pointerX < colContainers[i].cx) {
            return [{ id: colContainers[i].id }]
          }
        }
        // Pointer is past all columns — return the last one
        return [{ id: colContainers[colContainers.length - 1].id }]
      }

      const map = liveTaskMapRef.current
      if (!map) return closestCenter(args)

      // 1. Try pointerWithin first, fall back to rectIntersection
      const pointerIntersections = pointerWithin(args)
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args)
      let overId = intersections[0]?.id ?? null

      if (overId != null) {
        // 2. If over a column, drill down to closest task within it
        if (map[overId]) {
          const containerItems = map[overId]
          if (containerItems.length > 0) {
            overId =
              closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                  (container) =>
                    container.id !== overId &&
                    containerItems.includes(container.id)
                ),
              })[0]?.id ?? overId
          }
        }

        lastOverId.current = overId
        return [{ id: overId }]
      }

      // 3. Sticky fallback to prevent oscillation after container move
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeIdRef.current
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : []
    },
    []
  )

  const handleDragStart = useCallback(
    (event) => {
      const { active } = event

      // Column drag
      if (active.data.current?.type === 'column') {
        setActiveColumnId(active.data.current.columnId)
        activeIdRef.current = active.id
        return
      }

      const task = tasks.find((t) => t.id === active.id)
      setActiveTask(task || null)

      navigator.vibrate?.(20)

      // Build live task map from current state
      const taskMap = {}
      columns.forEach((col) => {
        taskMap[col.id] = tasks
          .filter(
            (t) =>
              t.columnId === col.id &&
              (!t.archived || justArchivedIds.includes(t.id))
          )
          .sort((a, b) => a.order - b.order)
          .map((t) => t.id)
      })
      setLiveTaskMap(taskMap)
      liveTaskMapRef.current = taskMap
      activeIdRef.current = task?.id ?? null
    },
    [tasks, columns, justArchivedIds]
  )

  // Move task between columns during drag (official multi-container pattern)
  const handleDragOver = useCallback(
    (event) => {
      const { active, over } = event
      if (!over) return

      // Column drag — SortableContext handles visual reordering
      if (active.data.current?.type === 'column') return

      const map = liveTaskMapRef.current
      if (!map) return

      const overId = over.id

      // Find active container
      const activeContainer = Object.keys(map).find((colId) =>
        map[colId].includes(active.id)
      )

      // Find over container
      let overContainer
      if (map[overId] !== undefined) {
        overContainer = overId
      } else {
        overContainer = Object.keys(map).find((colId) =>
          map[colId].includes(overId)
        )
      }

      if (!activeContainer || !overContainer || activeContainer === overContainer) return

      const now = Date.now()
      if (now - lastContainerMoveTime.current < 150) return
      lastContainerMoveTime.current = now

      setLiveTaskMap((prev) => {
        const activeItems = [...prev[activeContainer]]
        const overItems = [...prev[overContainer]]
        const activeIndex = activeItems.indexOf(active.id)

        let newIndex
        if (prev[overId] !== undefined) {
          // Over a column directly → append
          newIndex = overItems.length
        } else {
          const overIndex = overItems.indexOf(overId)
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height
          const modifier = isBelowOverItem ? 1 : 0
          newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length
        }

        recentlyMovedToNewContainer.current = true

        return {
          ...prev,
          [activeContainer]: activeItems.filter((id) => id !== active.id),
          [overContainer]: [
            ...overItems.slice(0, newIndex),
            activeItems[activeIndex],
            ...overItems.slice(newIndex),
          ],
        }
      })
    },
    []
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event

      // Column drag end
      if (active.data.current?.type === 'column') {
        setActiveColumnId(null)
        activeIdRef.current = null
        if (over && over.data.current?.type === 'column') {
          const activeColId = active.data.current.columnId
          const overColId = over.data.current.columnId
          if (activeColId !== overColId) {
            const currentIds = columns.map((c) => c.id)
            const oldIndex = currentIds.indexOf(activeColId)
            const newIndex = currentIds.indexOf(overColId)
            if (oldIndex >= 0 && newIndex >= 0) {
              reorderColumns(activeTabId, arrayMove(currentIds, oldIndex, newIndex))
            }
          }
        }
        return
      }

      setActiveTask(null)

      lastOverId.current = null
      activeIdRef.current = null
      lastContainerMoveTime.current = 0

      if (!over || !liveTaskMap) {
        setLiveTaskMap(null)
        liveTaskMapRef.current = null
        return
      }

      // Find active container in liveTaskMap
      const activeContainer = Object.keys(liveTaskMap).find((colId) =>
        liveTaskMap[colId].includes(active.id)
      )

      if (!activeContainer) {
        setLiveTaskMap(null)
        return
      }

      // Find over container
      let overContainer
      if (liveTaskMap[over.id] !== undefined) {
        overContainer = over.id
      } else {
        overContainer = Object.keys(liveTaskMap).find((colId) =>
          liveTaskMap[colId].includes(over.id)
        )
      }

      if (!overContainer) {
        setLiveTaskMap(null)
        return
      }

      const items = liveTaskMap[activeContainer]
      const activeIndex = items.indexOf(active.id)

      if (activeContainer === overContainer) {
        // Within-column reorder — only if position actually changed
        const overIndex = items.indexOf(over.id)
        if (overIndex >= 0 && activeIndex !== overIndex) {
          const newOrder = arrayMove(items, activeIndex, overIndex)
          moveTask(active.id, activeContainer, newOrder.indexOf(active.id))
        }
      } else {
        // Cross-column (onDragOver should have handled this, but commit position)
        moveTask(active.id, activeContainer, activeIndex >= 0 ? activeIndex : 0)
      }

      setLiveTaskMap(null)
      liveTaskMapRef.current = null
    },
    [liveTaskMap, moveTask, columns, activeTabId, reorderColumns]
  )

  const handleDragCancel = useCallback(() => {
    setActiveTask(null)
    setActiveColumnId(null)
    setLiveTaskMap(null)
    liveTaskMapRef.current = null
    lastOverId.current = null
    activeIdRef.current = null
    lastContainerMoveTime.current = 0
  }, [])

  // Mobile swipe handlers
  const handleMobileTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeOffsetRef.current = 0
  }

  const handleMobileTouchMove = (e) => {
    if (touchStartX.current === null || activeTask) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    // Only horizontal swipe
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault()
      swipeOffsetRef.current = dx
      setSwipeOffsetPx(dx)
    }
  }

  const handleMobileTouchEnd = () => {
    const hadOffset = swipeOffsetRef.current !== 0
    if (activeTask) {
      swipeOffsetRef.current = 0
      touchStartX.current = null
      touchStartY.current = null
      if (hadOffset) setSwipeOffsetPx(0)
      return
    }
    const threshold = 60
    if (swipeOffsetRef.current < -threshold && mobileColIndex < columns.length) {
      setMobileColIndex((i) => i + 1)
    } else if (swipeOffsetRef.current > threshold && mobileColIndex > 0) {
      setMobileColIndex((i) => i - 1)
    }
    swipeOffsetRef.current = 0
    touchStartX.current = null
    touchStartY.current = null
    if (hadOffset) setSwipeOffsetPx(0)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        onMenuToggle={() => setDrawerOpen(true)}
        onSyncClick={() => setShowSyncSettings(true)}
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSyncClick={() => setShowSyncSettings(true)} onDataClick={() => setShowDataModal(true)} />

      {showArchive ? (
        <ArchiveView />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {isDesktop ? (
            /* Desktop: horizontal scroll columns */
            <div className="flex flex-1 gap-4 p-4 overflow-x-auto overflow-y-hidden items-start">
              <SortableContext items={columnSortIds} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <SortableColumn key={col.id} column={col} liveTaskIds={liveTaskMap?.[col.id]} onOpenDetail={setDetailTask} highlightedTaskId={highlightedTaskId} />
                ))}
              </SortableContext>

              {/* Add column ghost card */}
              <button
                onClick={() => setShowColumnEditor(true)}
                className="flex flex-col items-center justify-center gap-3 py-10 px-10 rounded-xl shrink-0 transition-all duration-200 opacity-50 hover:opacity-100 hover:scale-[1.02] cursor-pointer"
                style={{
                  background: 'var(--bg-column)',
                  border: '2px dashed var(--border-color)',
                }}
              >
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ color: 'var(--text-muted)' }}>
                  <rect x="12" y="10" width="28" height="34" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="19" y="6" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="21" cy="28" r="1.5" fill="currentColor" />
                  <circle cx="31" cy="28" r="1.5" fill="currentColor" />
                  <path d="M22 34c1.5 2 7 2 8.5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M46 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="var(--color-primary-400)" />
                  <path d="M7 20l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="var(--color-primary-300)" />
                </svg>
                <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {t('app.addList')}
                </span>
              </button>
            </div>
          ) : (
            /* Mobile: swipeable single column */
            <div
              ref={swipeRef}
              className="flex-1 min-h-0 overflow-hidden flex flex-col"
              style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
              onTouchStart={handleMobileTouchStart}
              onTouchMove={handleMobileTouchMove}
              onTouchEnd={handleMobileTouchEnd}
            >
              <div className="flex-1 min-h-0">
                <div
                  className="flex h-full transition-transform duration-200 ease-out"
                  style={{
                    transform: `translateX(calc(-${mobileColIndex * 100}% + ${swipeOffsetPx}px))`,
                    transition: swipeOffsetPx !== 0 ? 'none' : undefined,
                  }}
                >
                  {columns.map((col) => (
                    <div key={col.id} className="w-full shrink-0 h-full p-3 flex flex-col">
                      <Column column={col} onAddTask={() => { setAddSheetColumnId(col.id); setAddSheetOpen(true) }} liveTaskIds={liveTaskMap?.[col.id]} onOpenDetail={setDetailTask} highlightedTaskId={highlightedTaskId} />
                    </div>
                  ))}
                  {/* Add column ghost card */}
                  <div className="w-full shrink-0 h-full p-3 flex items-center justify-center">
                    <button
                      onClick={() => setShowColumnEditor(true)}
                      className="flex flex-col items-center justify-center gap-3 px-10 py-10 rounded-xl active:scale-95 transition-transform"
                      style={{
                        background: 'var(--bg-column)',
                        border: '2px dashed var(--border-color)',
                      }}
                    >
                      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ color: 'var(--text-muted)' }}>
                        <rect x="12" y="10" width="28" height="34" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="19" y="6" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="21" cy="28" r="1.5" fill="currentColor" />
                        <circle cx="31" cy="28" r="1.5" fill="currentColor" />
                        <path d="M22 34c1.5 2 7 2 8.5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M46 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="var(--color-primary-400)" />
                        <path d="M7 20l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="var(--color-primary-300)" />
                      </svg>
                      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('app.addList')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dot indicators */}
              {columns.length > 1 && (
                <div className="shrink-0 flex justify-center gap-1.5 pt-0 pb-3">
                  {columns.map((col, i) => (
                    <button
                      key={col.id}
                      onClick={() => setMobileColIndex(i)}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{
                        background:
                          i === mobileColIndex
                            ? 'var(--color-primary-500)'
                            : 'var(--border-color)',
                        transform: i === mobileColIndex ? 'scale(1.3)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeColumnId ? (
                <div
                  className="rounded-xl md:min-w-[280px] md:w-[320px] opacity-90 pointer-events-none max-h-[70vh] overflow-hidden"
                  style={{
                    background: 'var(--bg-column)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                    border: '2px solid var(--color-primary-400)',
                  }}
                >
                  <Column
                    column={columns.find((c) => c.id === activeColumnId) || { id: activeColumnId, name: '' }}
                    onOpenDetail={() => {}}
                  />
                </div>
              ) : activeTask ? (
                <div className="opacity-90">
                  <div className="overflow-hidden rounded-lg">
                    <div
                      className="flex items-start gap-2 p-3 rounded-lg"
                      style={{ background: 'var(--bg-card)', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}
                    >
                      <span
                        className="flex-1 text-sm select-none min-w-0 break-words"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {activeTask.text}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}

      {/* Mobile bottom bar */}
      <BottomBar onAddTask={() => { setAddSheetColumnId(columns[mobileColIndex]?.id ?? null); setAddSheetOpen(true) }} />

      {/* Mobile add task bottom sheet */}
      <AddTaskSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} initialColumnId={addSheetColumnId} />

      {/* Column editor modal */}
      {showColumnEditor && (
        <ColumnEditor tabId={activeTabId} onClose={() => setShowColumnEditor(false)} />
      )}

      {/* Task detail modal */}
      {detailTask && (
        <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />
      )}

      {/* Sync settings modal */}
      {showSyncSettings && (
        <SyncSettings onClose={() => setShowSyncSettings(false)} />
      )}

      {/* Data export/import modal */}
      <DataModal isOpen={showDataModal} onClose={() => setShowDataModal(false)} />

      {/* Sync conflict dialog */}
      <SyncConflict />
      <SyncReconnect />
      <InstallBanner />

      {/* Onboarding modal */}
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}

export default App
