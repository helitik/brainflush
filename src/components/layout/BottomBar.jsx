import { useState, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'

function useLeftCapacity() {
  const calc = () => Math.floor((window.innerWidth / 2 - 32) / 64)
  const [capacity, setCapacity] = useState(calc)

  useEffect(() => {
    const onResize = () => setCapacity(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return capacity
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      setOpen(window.innerHeight - vv.height > 100)
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return open
}

export function BottomBar({ onAddTask }) {
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const keyboardOpen = useKeyboardOpen()

  const pinnedTabs = tabs
    .filter((t) => t.pinnedOrder != null)
    .sort((a, b) => a.pinnedOrder - b.pinnedOrder)

  const leftCapacity = useLeftCapacity()
  const leftTabs = pinnedTabs.slice(0, leftCapacity)
  const rightTabs = pinnedTabs.slice(leftCapacity)

  const renderTab = (tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className="relative flex flex-col items-center justify-center gap-0.5 w-16 transition-colors min-w-0 hover:bg-surface-200 dark:hover:bg-surface-700"
      style={{
        color: tab.id === activeTabId ? 'var(--color-primary-500)' : 'var(--text-muted)',
      }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all"
        style={{
          width: tab.id === activeTabId ? '2rem' : '0',
          background: 'var(--color-primary-500)',
        }}
      />
      <span className="text-base leading-none">{tab.emoji || '📋'}</span>
      <span className="text-[10px] font-medium truncate max-w-[64px]">
        {tab.name}
      </span>
    </button>
  )

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t safe-bottom transition-transform duration-200"
      style={{
        background: 'var(--bg-header)',
        borderColor: 'var(--border-color)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: keyboardOpen ? 'translateY(100%)' : undefined,
      }}
    >
      <div
        className="h-14 items-center"
        style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Left pinned tabs */}
        <div className="flex items-stretch justify-start h-full">
          {leftTabs.map(renderTab)}
        </div>

        {/* Center add button */}
        <div className="flex items-center justify-center px-2">
          <button
            onClick={onAddTask}
            className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full shadow-lg transition-transform active:scale-95 hover:opacity-90"
            style={{ background: 'var(--color-primary-500)' }}
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Right pinned tabs */}
        <div className="flex items-stretch justify-start h-full">
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </nav>
  )
}
