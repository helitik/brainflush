import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../hooks/useStore'
import { useLanguage } from '../../hooks/useLanguage'
import { SyncStatus } from '../sync/SyncStatus'
import { TabEditor } from '../tabs/TabEditor'

export function Header({ onMenuToggle, onSyncClick }) {
  const { t } = useLanguage()
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const showArchive = useStore((s) => s.showArchive)
  const setShowArchive = useStore((s) => s.setShowArchive)
  const [showEditor, setShowEditor] = useState(false)

  const pinnedTabs = tabs
    .filter((tab) => tab.pinnedOrder != null)
    .sort((a, b) => a.pinnedOrder - b.pinnedOrder)

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14 border-b"
      style={{
        background: 'var(--bg-header)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Hamburger — always visible */}
      <button
        onClick={onMenuToggle}
        className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
        aria-label={t('header.menu')}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo — clickable on all screen sizes */}
      <h1
        className="flex items-center gap-1.5 shrink-0 select-none cursor-pointer"
        onClick={onMenuToggle}
      >
        <img src="/brainflush-logo.png" alt="" className="w-7 h-7 object-contain rounded-md p-0.5" style={{ background: '#19408f' }} />
        <span className="text-lg font-extrabold tracking-tight leading-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <span style={{ color: '#19408f' }}>Brain</span>
          <span style={{ color: '#3b82f6' }}>flush</span>
        </span>
      </h1>

      {/* Desktop pinned tabs */}
      <div className="hidden md:flex items-center gap-1 flex-1 min-w-0 ml-4 overflow-x-auto no-scrollbar">
        {pinnedTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0 hover:brightness-95 dark:hover:brightness-110"
            style={{
              background:
                tab.id === activeTabId ? 'var(--color-primary-500)15' : 'transparent',
              color:
                tab.id === activeTabId
                  ? 'var(--color-primary-600)'
                  : 'var(--text-secondary)',
            }}
          >
            <span>{tab.emoji || '📋'}</span>
            <span>{tab.name}</span>
          </button>
        ))}

        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
          style={{ color: 'var(--text-muted)' }}
          title={t('drawer.addProject')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {showEditor && createPortal(
        <TabEditor tab={null} onClose={() => setShowEditor(false)} />,
        document.body
      )}

      <div className="flex items-center gap-1 ml-auto">
        {/* Dev seed (hidden in production) */}
        {import.meta.env.DEV && (
          <button
            onClick={() => useStore.getState().seedTestData()}
            className="hidden md:flex p-2 rounded-lg transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
            style={{ color: 'var(--text-muted)' }}
            title={t('header.seedData')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </button>
        )}

        {/* Sync status */}
        <SyncStatus onClick={onSyncClick} />

        {/* Archive toggle */}
        <button
          onClick={() => setShowArchive(!showArchive)}
          className="p-2 rounded-lg transition-colors hover:bg-surface-200 dark:hover:bg-surface-700"
          style={{ color: showArchive ? 'var(--color-primary-500)' : 'var(--text-secondary)' }}
          title={showArchive ? t('header.backToBoard') : t('header.archives')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
      </div>
    </header>
  )
}
