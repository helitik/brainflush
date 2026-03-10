import { useEffect } from 'react'
import { useStore } from './useStore'
import { tabsToSlugs, findTabBySlug } from '../lib/slugify'

/**
 * Resolve URL pathname → active tab synchronously, before React renders.
 * Must be called at module level (like OAuth IIFE in App.jsx).
 */
export function resolveUrlTab() {
  const pathname = window.location.pathname
  if (pathname === '/' || pathname.startsWith('/auth/')) return

  const slug = pathname.replace(/^\//, '').replace(/\/$/, '')
  if (!slug) return

  const state = useStore.getState()
  const tabId = findTabBySlug(slug, state.tabs)
  if (tabId) {
    state.setActiveTab(tabId)
  }
}

/**
 * Reactively update URL when active tab or tab names change.
 * Uses replaceState only — never pushState — to avoid conflicting with useBackClose.
 */
export function useUrlSync() {
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs = useStore((s) => s.tabs)

  useEffect(() => {
    if (!activeTabId || tabs.length === 0) return

    const slugMap = tabsToSlugs(tabs)
    const slug = slugMap.get(activeTabId)
    if (!slug) return

    const target = '/' + slug
    if (window.location.pathname !== target) {
      window.history.replaceState(history.state, '', target + window.location.search)
    }
  }, [activeTabId, tabs])
}
