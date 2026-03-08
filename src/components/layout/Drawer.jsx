import { useState, useEffect } from 'react'
import { useStore, getMaxPinnedTabs } from '../../hooks/useStore'
import { stopSyncEngine, clearBase, providers } from '../../sync/syncEngine'
import { useTheme } from '../../hooks/useTheme'
import { useLanguage } from '../../hooks/useLanguage'
import { useBackClose } from '../../hooks/useBackClose'
import { TabEditor } from '../tabs/TabEditor'

function useMaxPinnedTabs() {
  const [max, setMax] = useState(getMaxPinnedTabs)
  useEffect(() => {
    const onResize = () => setMax(getMaxPinnedTabs())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return max
}

export function Drawer({ open, onClose, onSyncClick }) {
  const tabs = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const pinTab = useStore((s) => s.pinTab)
  const unpinTab = useStore((s) => s.unpinTab)
  const showArchive = useStore((s) => s.showArchive)
  const setShowArchive = useStore((s) => s.setShowArchive)
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage, t } = useLanguage()
  const maxPinned = useMaxPinnedTabs()
  const pinnedCount = tabs.filter((t) => t.pinnedOrder != null).length

  const [editingTab, setEditingTab] = useState(null)
  const [showTabEditor, setShowTabEditor] = useState(false)

  useBackClose(showTabEditor, () => { setShowTabEditor(false); setEditingTab(null) })


  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 transition-opacity"
          style={{ background: 'var(--bg-overlay)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 h-[100dvh] z-50 w-72 transform transition-transform duration-200 ease-out flex flex-col"
        style={{
          background: 'var(--bg-header)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="flex items-center gap-1.5">
            <img src="/brainflush-logo.png" alt="" className="w-7 h-7 object-contain rounded-md p-0.5" style={{ background: '#19408f' }} />
            <span className="text-lg font-extrabold tracking-tight leading-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              <span style={{ color: '#19408f' }}>Brain</span>
              <span style={{ color: '#3b82f6' }}>flush</span>
            </span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs list */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('drawer.projects')}
            </span>
          </div>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer hover:brightness-95 dark:hover:brightness-110"
              style={{
                background: tab.id === activeTabId ? 'var(--color-primary-500)11' : 'transparent',
                color: tab.id === activeTabId ? 'var(--color-primary-500)' : 'var(--text-primary)',
              }}
              onClick={() => {
                setActiveTab(tab.id)
                setShowArchive(false)
                onClose()
              }}
            >
              <span className="text-lg">{tab.emoji || '📋'}</span>
              <span className="flex-1 font-medium truncate">{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (tab.pinnedOrder != null) {
                    unpinTab(tab.id)
                  } else {
                    pinTab(tab.id)
                  }
                }}
                className="p-1 rounded opacity-60 hover:opacity-100 disabled:opacity-30"
                disabled={tab.pinnedOrder == null && pinnedCount >= maxPinned}
                style={{ color: tab.pinnedOrder != null ? 'var(--color-primary-500)' : 'var(--text-muted)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={tab.pinnedOrder != null ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l-4 4-4-1-3 3 4 4-2 6 6-2 4 4 3-3-1-4 4-4z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingTab(tab)
                  setShowTabEditor(true)
                  onClose()
                }}
                className="p-1 rounded opacity-60 hover:opacity-100"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add tab */}
          <button
            onClick={() => {
              setEditingTab(null)
              setShowTabEditor(true)
              onClose()
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">{t('drawer.addProject')}</span>
          </button>
        </div>

        {/* Bottom actions */}
        <div className="border-t py-2" style={{ borderColor: 'var(--border-color)' }}>
          {import.meta.env.DEV && (
            <>
              <button
                onClick={() => {
                  useStore.getState().seedTestData()
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span className="font-medium">{t('drawer.seedData')}</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm(t('drawer.clearDataConfirm'))) {
                    stopSyncEngine()
                    const providerName = useStore.getState().syncProvider
                    if (providerName && providers[providerName]) {
                      providers[providerName].disconnect()
                    }
                    clearBase()
                    useStore.getState().clearAllData()
                    onClose()
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
                style={{ color: '#ef4444' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="font-medium">{t('drawer.clearData')}</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              setShowArchive(!showArchive)
              onClose()
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: showArchive ? 'var(--color-primary-500)' : 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="font-medium">{t('drawer.archives')}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {theme === 'dark' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              )}
            </svg>
            <span className="font-medium">{theme === 'dark' ? t('drawer.themeDark') : t('drawer.themeLight')}</span>
          </button>

          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="font-medium">{t('drawer.language')}: {language.toUpperCase()}</span>
          </button>

          <button
            onClick={() => { onSyncClick?.(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.35 10.04A7.49 7.49 0 0012 4a7.49 7.49 0 00-6.65 4.04A5.99 5.99 0 001 14a6 6 0 006 6h10a5 5 0 001.35-9.96z" />
            </svg>
            <span className="font-medium">{t('drawer.cloudSync')}</span>
          </button>
        </div>
      </div>

      {/* Tab Editor Modal */}
      {showTabEditor && (
        <TabEditor
          tab={editingTab}
          onClose={() => {
            setShowTabEditor(false)
            setEditingTab(null)
          }}
        />
      )}
    </>
  )
}
