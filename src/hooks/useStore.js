import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '../lib/uuid'
import { en, fr } from '../i18n/translations'

const langs = { en, fr }
const t = (lang, key) => langs[lang]?.[key] ?? langs.en[key] ?? key

const TAB_WIDTH = 64
const CENTER_WIDTH = 64

export function getMaxPinnedTabs() {
  if (typeof window === 'undefined') return 4
  return Math.max(2, Math.floor((window.innerWidth - CENTER_WIDTH) / TAB_WIDTH))
}

function createDefaultColumns(tabId, lang = 'en') {
  return [
    { id: generateId(), tabId, name: t(lang, 'default.colToday'), order: 0 },
    { id: generateId(), tabId, name: t(lang, 'default.colThisWeek'), order: 1 },
    { id: generateId(), tabId, name: t(lang, 'default.colLater'), order: 2 },
  ]
}

function createDefaultData() {
  const lang = (navigator.language || 'en').startsWith('fr') ? 'fr' : 'en'
  const persoId = generateId()
  const proId = generateId()
  return {
    tabs: [
      { id: persoId, name: t(lang, 'default.tabPersonal'), emoji: '🏠', order: 0, pinnedOrder: 0 },
      { id: proId, name: t(lang, 'default.tabWork'), emoji: '💼', order: 1, pinnedOrder: 1 },
    ],
    columns: [...createDefaultColumns(persoId, lang), ...createDefaultColumns(proId, lang)],
    tasks: [],
    activeTabId: persoId,
    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    language: lang,
    showArchive: false,
  }
}

// Middleware: auto-set localModifiedAt on every mutation, unless _skipTimestamp is set
// If the updater function returns the same state reference, skip the timestamp (no-op)
const autoTimestamp = (config) => (rawSet, get, api) =>
  config(
    (partial, replace) => {
      if (typeof partial === 'function') {
        rawSet((state) => {
          const result = partial(state)
          if (result === state) return state
          if (result?._skipTimestamp) {
            const { _skipTimestamp, ...rest } = result
            return rest
          }
          return { ...result, localModifiedAt: Date.now() }
        }, replace)
      } else if (partial?._skipTimestamp) {
        const { _skipTimestamp, ...rest } = partial
        rawSet(rest, replace)
      } else {
        rawSet({ ...partial, localModifiedAt: Date.now() }, replace)
      }
    },
    get,
    api
  )

export const useStore = create(
  persist(
    autoTimestamp((set) => ({
      ...createDefaultData(),
      justArchivedIds: [],

      // --- Sync fields (persisted) ---
      syncProvider: null,
      lastSyncedAt: null,
      localModifiedAt: null,

      // --- Onboarding ---
      hasCompletedOnboarding: false,

      // --- Sync fields (transient) ---
      lastSyncCompletedAt: null,
      syncStatus: 'idle',
      syncError: null,
      pendingRemoteData: null,
      disconnectedProvider: null,

      // --- Tabs ---
      setActiveTab: (id) => set((s) => {
        if (s.activeTabId === id && !s.showArchive) return s
        return { activeTabId: id, showArchive: false, _skipTimestamp: true }
      }),

      addTab: (name, emoji = '') => {
        const id = generateId()
        set((s) => {
          const cols = createDefaultColumns(id, s.language)
          const pinnedCount = s.tabs.filter((t) => t.pinnedOrder != null).length
          const pinnedOrder = pinnedCount < getMaxPinnedTabs() ? pinnedCount : null
          return {
            tabs: [...s.tabs, { id, name, emoji, order: s.tabs.length, pinnedOrder }],
            columns: [...s.columns, ...cols],
            activeTabId: id,
            showArchive: false,
          }
        })
        return id
      },

      renameTab: (id, name, emoji) =>
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === id ? { ...t, name, ...(emoji !== undefined && { emoji }) } : t
          ),
        })),

      deleteTab: (id) =>
        set((s) => {
          const remaining = s.tabs.filter((t) => t.id !== id)
          const colIds = s.columns.filter((c) => c.tabId === id).map((c) => c.id)
          // Re-compact pinnedOrder after removal
          const pinned = remaining.filter((t) => t.pinnedOrder != null).sort((a, b) => a.pinnedOrder - b.pinnedOrder)
          const pinnedMap = new Map(pinned.map((t, i) => [t.id, i]))
          return {
            tabs: remaining.map((t) => ({ ...t, pinnedOrder: pinnedMap.has(t.id) ? pinnedMap.get(t.id) : null })),
            columns: s.columns.filter((c) => c.tabId !== id),
            tasks: s.tasks.filter((t) => !colIds.includes(t.columnId)),
            activeTabId:
              s.activeTabId === id ? (remaining[0]?.id ?? null) : s.activeTabId,
          }
        }),

      pinTab: (id) =>
        set((s) => {
          const pinnedCount = s.tabs.filter((t) => t.pinnedOrder != null).length
          if (pinnedCount >= getMaxPinnedTabs()) return s
          const tab = s.tabs.find((t) => t.id === id)
          if (!tab || tab.pinnedOrder != null) return s
          return {
            tabs: s.tabs.map((t) => (t.id === id ? { ...t, pinnedOrder: pinnedCount } : t)),
          }
        }),

      unpinTab: (id) =>
        set((s) => {
          const tab = s.tabs.find((t) => t.id === id)
          if (!tab || tab.pinnedOrder == null) return s
          const updated = s.tabs.map((t) => (t.id === id ? { ...t, pinnedOrder: null } : t))
          // Re-compact
          const pinned = updated.filter((t) => t.pinnedOrder != null).sort((a, b) => a.pinnedOrder - b.pinnedOrder)
          const pinnedMap = new Map(pinned.map((t, i) => [t.id, i]))
          return {
            tabs: updated.map((t) => ({ ...t, pinnedOrder: pinnedMap.has(t.id) ? pinnedMap.get(t.id) : null })),
          }
        }),

      // --- Columns ---
      addColumn: (tabId, name) => {
        const id = generateId()
        set((s) => {
          const tabCols = s.columns.filter((c) => c.tabId === tabId)
          return {
            columns: [
              ...s.columns,
              { id, tabId, name, order: tabCols.length },
            ],
          }
        })
        return id
      },

      renameColumn: (id, name) =>
        set((s) => ({
          columns: s.columns.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      deleteColumn: (id) =>
        set((s) => ({
          columns: s.columns.filter((c) => c.id !== id),
          tasks: s.tasks.filter((t) => t.columnId !== id),
        })),

      reorderColumns: (tabId, orderedIds) =>
        set((s) => ({
          columns: s.columns.map((c) => {
            if (c.tabId !== tabId) return c
            const idx = orderedIds.indexOf(c.id)
            return idx >= 0 ? { ...c, order: idx } : c
          }),
        })),

      moveColumn: (id, direction) =>
        set((s) => {
          const col = s.columns.find((c) => c.id === id)
          if (!col) return s
          const tabCols = s.columns
            .filter((c) => c.tabId === col.tabId)
            .sort((a, b) => a.order - b.order)
          const idx = tabCols.findIndex((c) => c.id === id)
          const targetIdx = idx + direction
          if (targetIdx < 0 || targetIdx >= tabCols.length) return s
          // Swap orders
          const orderedIds = tabCols.map((c) => c.id)
          ;[orderedIds[idx], orderedIds[targetIdx]] = [orderedIds[targetIdx], orderedIds[idx]]
          return {
            columns: s.columns.map((c) => {
              if (c.tabId !== col.tabId) return c
              const newOrder = orderedIds.indexOf(c.id)
              return newOrder >= 0 ? { ...c, order: newOrder } : c
            }),
          }
        }),

      // --- Tasks ---
      addTask: (columnId, text) => {
        const id = generateId()
        set((s) => {
          const colTasks = s.tasks.filter(
            (t) => t.columnId === columnId && !t.archived
          )
          return {
            tasks: [
              ...s.tasks,
              {
                id,
                columnId,
                text,
                archived: false,
                archivedAt: null,
                originalColumnId: null,
                createdAt: Date.now(),
                order: colTasks.length,
                reminderAt: null,
                reminderFired: false,
              },
            ],
          }
        })
        return id
      },

      editTask: (id, text) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, text } : t)),
        })),

      archiveTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  archived: true,
                  archivedAt: Date.now(),
                  originalColumnId: t.columnId,
                }
              : t
          ),
          justArchivedIds: [...s.justArchivedIds, id],
        })),

      restoreTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id)
          if (!task) return s
          const colExists = s.columns.some((c) => c.id === task.originalColumnId)
          const tab = s.tabs.find((t) => t.id === s.activeTabId)
          const fallbackCol = tab
            ? s.columns
                .filter((c) => c.tabId === tab.id)
                .sort((a, b) => a.order - b.order)[0]
            : null
          const targetCol = colExists ? task.originalColumnId : fallbackCol?.id
          if (!targetCol) return s
          return {
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    archived: false,
                    archivedAt: null,
                    columnId: targetCol,
                    originalColumnId: null,
                  }
                : t
            ),
            justArchivedIds: s.justArchivedIds.filter((i) => i !== id),
          }
        }),

      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          justArchivedIds: s.justArchivedIds.filter((i) => i !== id),
        })),

      moveAllTasks: (fromColumnId, toColumnId) =>
        set((s) => {
          const targetCount = s.tasks.filter((t) => t.columnId === toColumnId && !t.archived).length
          return {
            tasks: s.tasks.map((t) => {
              if (t.columnId === fromColumnId && !t.archived) {
                return { ...t, columnId: toColumnId, order: targetCount + t.order }
              }
              return t
            }),
          }
        }),

      moveTask: (taskId, toColumnId, newIndex) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === taskId)
          if (!task) return s

          const otherTasks = s.tasks.filter(
            (t) => t.id !== taskId && t.columnId === toColumnId && !t.archived
          )
          otherTasks.sort((a, b) => a.order - b.order)
          otherTasks.splice(newIndex, 0, { ...task, columnId: toColumnId })

          const updatedIds = new Map(
            otherTasks.map((t, i) => [t.id, { columnId: toColumnId, order: i }])
          )

          const hasChanges = s.tasks.some((t) => {
            const update = updatedIds.get(t.id)
            return update && (t.columnId !== update.columnId || t.order !== update.order)
          })
          if (!hasChanges) return s

          return {
            tasks: s.tasks.map((t) => {
              const update = updatedIds.get(t.id)
              if (update) return { ...t, ...update }
              return t
            }),
          }
        }),

      // --- Reminders ---
      setReminder: (id, reminderAt) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, reminderAt, reminderFired: false } : t
          ),
        })),

      clearReminder: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, reminderAt: null, reminderFired: false } : t
          ),
        })),

      markReminderFired: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, reminderFired: true } : t
          ),
        })),

      // --- Archives ---
      setShowArchive: (show) => set((s) => {
        if (s.showArchive === show) return s
        return { showArchive: show, _skipTimestamp: true }
      }),

      // --- Theme ---
      setTheme: (theme) => set((s) => {
        if (s.theme === theme) return s
        return { theme }
      }),

      // --- Onboarding ---
      completeOnboarding: () => set({ hasCompletedOnboarding: true, _skipTimestamp: true }),

      // --- Language ---
      setLanguage: (language) => set((s) => {
        if (s.language === language) return s
        return { language }
      }),

      // --- Sync actions ---
      setSyncProvider: (provider) => set({ syncProvider: provider, _skipTimestamp: true }),
      setSyncStatus: (status, error = null) =>
        set({ syncStatus: status, syncError: error, _skipTimestamp: true }),
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts, _skipTimestamp: true }),
      setLastSyncCompletedAt: () => set({ lastSyncCompletedAt: Date.now(), _skipTimestamp: true }),
      setPendingRemoteData: (envelope) => set({ pendingRemoteData: envelope, _skipTimestamp: true }),
      setDisconnectedProvider: (provider) => set({ disconnectedProvider: provider, _skipTimestamp: true }),
      replaceData: (data) =>
        set({
          tabs: data.tabs,
          columns: data.columns,
          tasks: data.tasks,
          activeTabId: data.activeTabId,
          theme: data.theme,
          language: data.language,
          showArchive: data.showArchive ?? false,
          _skipTimestamp: true,
        }),

      // --- Dev seed ---
      seedTestData: () => set((s) => {
        const l = s.language
        const t1 = generateId(), t2 = generateId(), t3 = generateId(), t4 = generateId(), t5 = generateId()
        const c1a = generateId(), c1b = generateId(), c1c = generateId(), c1d = generateId()
        const c2a = generateId(), c2b = generateId(), c2c = generateId(), c2d = generateId()
        const c3a = generateId(), c3b = generateId(), c3c = generateId()
        const c4a = generateId(), c4b = generateId(), c4c = generateId()
        const c5a = generateId(), c5b = generateId(), c5c = generateId(), c5d = generateId()
        const task = (columnId, text, order) => ({
          id: generateId(), columnId, text, archived: false,
          archivedAt: null, originalColumnId: null, createdAt: Date.now(), order,
        })
        return {
          tabs: [
            { id: t1, name: t(l, 'default.tabPersonal'), emoji: '🏠', order: 0, pinnedOrder: 0 },
            { id: t2, name: t(l, 'default.tabWork'), emoji: '💼', order: 1, pinnedOrder: 1 },
            { id: t3, name: t(l, 'seed.tabSideProject'), emoji: '🚀', order: 2, pinnedOrder: 2 },
            { id: t4, name: t(l, 'seed.tabFitness'), emoji: '💪', order: 3, pinnedOrder: 3 },
            { id: t5, name: t(l, 'seed.tabLearning'), emoji: '📚', order: 4, pinnedOrder: null },
          ],
          columns: [
            { id: c1a, tabId: t1, name: t(l, 'default.colToday'), order: 0 },
            { id: c1b, tabId: t1, name: t(l, 'default.colThisWeek'), order: 1 },
            { id: c1c, tabId: t1, name: t(l, 'default.colLater'), order: 2 },
            { id: c1d, tabId: t1, name: t(l, 'seed.colSomeday'), order: 3 },
            { id: c2a, tabId: t2, name: t(l, 'seed.colUrgent'), order: 0 },
            { id: c2b, tabId: t2, name: t(l, 'seed.colInProgress'), order: 1 },
            { id: c2c, tabId: t2, name: t(l, 'seed.colBacklog'), order: 2 },
            { id: c2d, tabId: t2, name: t(l, 'seed.colDone'), order: 3 },
            { id: c3a, tabId: t3, name: t(l, 'seed.colMVP'), order: 0 },
            { id: c3b, tabId: t3, name: t(l, 'seed.colNiceToHave'), order: 1 },
            { id: c3c, tabId: t3, name: t(l, 'seed.colShipped'), order: 2 },
            { id: c4a, tabId: t4, name: t(l, 'default.colThisWeek'), order: 0 },
            { id: c4b, tabId: t4, name: t(l, 'seed.colRoutine'), order: 1 },
            { id: c4c, tabId: t4, name: t(l, 'seed.colGoals'), order: 2 },
            { id: c5a, tabId: t5, name: t(l, 'seed.colInProgress'), order: 0 },
            { id: c5b, tabId: t5, name: t(l, 'seed.colUpNext'), order: 1 },
            { id: c5c, tabId: t5, name: t(l, 'seed.colBacklog'), order: 2 },
            { id: c5d, tabId: t5, name: t(l, 'seed.colCompleted'), order: 3 },
          ],
          tasks: [
            // Personal — Today
            task(c1a, 'Buy groceries (milk, eggs, bread, avocados)', 0),
            task(c1a, 'Call dentist for appointment', 1),
            task(c1a, 'Fix leaky kitchen faucet', 2),
            task(c1a, 'Pick up dry cleaning', 3),
            task(c1a, 'Reply to landlord email', 4),
            task(c1a, 'Water the plants', 5),
            task(c1a, 'Cook dinner — try new pasta recipe', 6),
            // Personal — This week
            task(c1b, 'Clean garage', 0),
            task(c1b, 'Plan weekend trip to the coast', 1),
            task(c1b, 'Schedule car inspection', 2),
            task(c1b, 'Return Amazon package', 3),
            task(c1b, 'Organize closet', 4),
            task(c1b, 'Backup phone photos to NAS', 5),
            task(c1b, 'Buy birthday gift for Sarah', 6),
            task(c1b, 'Fix bathroom shelf', 7),
            // Personal — Later
            task(c1c, 'Read "Atomic Habits"', 0),
            task(c1c, 'Learn guitar chords', 1),
            task(c1c, 'Repaint bedroom', 2),
            task(c1c, 'Research new phone plans', 3),
            task(c1c, 'Sort through old photos', 4),
            task(c1c, 'Set up home server', 5),
            // Personal — Someday
            task(c1d, 'Plan Japan trip', 0),
            task(c1d, 'Learn to surf', 1),
            task(c1d, 'Build a bookshelf from scratch', 2),
            task(c1d, 'Start a vegetable garden', 3),
            task(c1d, 'Get scuba diving certification', 4),

            // Work — Urgent
            task(c2a, 'Fix production login bug — users can\'t reset password', 0),
            task(c2a, 'Review PR #234 (auth refactor)', 1),
            task(c2a, 'Prepare slides for Monday standup', 2),
            task(c2a, 'Reply to client about timeline', 3),
            task(c2a, 'Hotfix: rate limiter blocking valid requests', 4),
            // Work — In progress
            task(c2b, 'Update API documentation for v3 endpoints', 0),
            task(c2b, 'Implement user avatar upload', 1),
            task(c2b, 'Write migration script for new schema', 2),
            task(c2b, 'Add Sentry error tracking to payments', 3),
            task(c2b, 'Pair with Alex on caching layer', 4),
            task(c2b, 'Design new onboarding flow wireframes', 5),
            // Work — Backlog
            task(c2c, 'Refactor auth module to use JWT refresh tokens', 0),
            task(c2c, 'Add unit tests for utils (>80% coverage)', 1),
            task(c2c, 'Migrate CI/CD to GitHub Actions', 2),
            task(c2c, 'Setup Grafana monitoring dashboard', 3),
            task(c2c, 'Evaluate Turborepo for monorepo migration', 4),
            task(c2c, 'Add E2E tests for checkout flow', 5),
            task(c2c, 'Research SSO integration (Okta / Auth0)', 6),
            task(c2c, 'Upgrade Node.js to v22 LTS', 7),
            task(c2c, 'Audit npm dependencies for vulnerabilities', 8),
            task(c2c, 'Document deployment runbook', 9),
            // Work — Done
            task(c2d, 'Setup staging environment', 0),
            task(c2d, 'Implement dark mode for dashboard', 1),
            task(c2d, 'Fix timezone bug in reports', 2),
            task(c2d, 'Add Slack webhook for deploy notifications', 3),

            // Side Project — MVP
            task(c3a, 'Landing page design & copy', 0),
            task(c3a, 'Auth flow (Google OAuth + magic link)', 1),
            task(c3a, 'Deploy to Vercel with preview branches', 2),
            task(c3a, 'Core CRUD API for projects', 3),
            task(c3a, 'Real-time collaboration with Yjs', 4),
            task(c3a, 'Stripe integration for subscriptions', 5),
            task(c3a, 'Email templates (welcome, reset, invoice)', 6),
            task(c3a, 'Setup Resend for transactional emails', 7),
            // Side Project — Nice to have
            task(c3b, 'Dark mode with system preference sync', 0),
            task(c3b, 'PWA offline support with sync queue', 1),
            task(c3b, 'Export to CSV / JSON', 2),
            task(c3b, 'Keyboard shortcuts (Vim-style)', 3),
            task(c3b, 'Activity log / audit trail', 4),
            task(c3b, 'Custom themes & branding', 5),
            task(c3b, 'Zapier / Make integration', 6),
            task(c3b, 'AI-powered task suggestions', 7),
            task(c3b, 'Mobile app (React Native)', 8),
            // Side Project — Shipped
            task(c3c, 'Setup repo, Vite, Tailwind, ESLint', 0),
            task(c3c, 'Database schema design (Drizzle + Postgres)', 1),
            task(c3c, 'CI pipeline with tests + lint', 2),
            task(c3c, 'Basic component library', 3),

            // Fitness — This week
            task(c4a, 'Monday: Upper body (bench, rows, OHP)', 0),
            task(c4a, 'Tuesday: 5K morning run', 1),
            task(c4a, 'Wednesday: Legs (squats, lunges, RDL)', 2),
            task(c4a, 'Thursday: Rest day — stretching & yoga', 3),
            task(c4a, 'Friday: Full body HIIT circuit', 4),
            task(c4a, 'Saturday: Long run (10K)', 5),
            task(c4a, 'Sunday: Active recovery — swimming', 6),
            // Fitness — Routine
            task(c4b, 'Meal prep Sundays (chicken, rice, veggies)', 0),
            task(c4b, 'Track macros in MyFitnessPal', 1),
            task(c4b, 'Take creatine daily', 2),
            task(c4b, 'Sleep 8h — no screens after 10pm', 3),
            task(c4b, '10 min morning mobility routine', 4),
            task(c4b, 'Drink 3L water daily', 5),
            // Fitness — Goals
            task(c4c, 'Bench press: 100kg by June', 0),
            task(c4c, 'Run half marathon in under 1:45', 1),
            task(c4c, 'Body fat under 15%', 2),
            task(c4c, 'Do 10 strict pull-ups', 3),
            task(c4c, 'Touch toes (hamstring flexibility)', 4),

            // Learning — In progress
            task(c5a, 'Rust course — Chapter 8: Error handling', 0),
            task(c5a, 'Read "Designing Data-Intensive Applications" Ch.5', 1),
            task(c5a, 'Exercism: complete 5 Rust exercises', 2),
            task(c5a, 'Build CLI tool in Rust (file deduplicator)', 3),
            // Learning — Up next
            task(c5b, 'Three.js fundamentals — 3D on the web', 0),
            task(c5b, 'Stanford CS229 — Machine Learning lectures', 1),
            task(c5b, 'Learn Figma for devs', 2),
            task(c5b, 'WebAssembly crash course', 3),
            task(c5b, 'Read "The Pragmatic Programmer"', 4),
            task(c5b, 'Docker deep dive — networking & volumes', 5),
            // Learning — Backlog
            task(c5c, 'Category theory for programmers', 0),
            task(c5c, 'Nand2Tetris (build a computer from scratch)', 1),
            task(c5c, 'Learn Zig language basics', 2),
            task(c5c, 'Distributed systems — Raft consensus', 3),
            task(c5c, 'Compilers — write a toy interpreter', 4),
            task(c5c, 'Learn Blender for 3D modeling', 5),
            task(c5c, 'Kubernetes the hard way', 6),
            task(c5c, 'Read "Structure and Interpretation of Computer Programs"', 7),
            // Learning — Completed
            task(c5d, 'JavaScript: The Good Parts', 0),
            task(c5d, 'Go tour + build REST API', 1),
            task(c5d, 'SQL fundamentals (window functions, CTEs)', 2),
            task(c5d, 'Git internals — plumbing commands', 3),
            task(c5d, 'TypeScript generics deep dive', 4),
            task(c5d, 'React 19 — new features & server components', 5),
          ],
          activeTabId: t1,
          showArchive: false,
          justArchivedIds: [],
        }
      }),

      clearAllData: () => {
        set(() => ({
          ...createDefaultData(),
          justArchivedIds: [],
          syncProvider: null,
          lastSyncedAt: null,
          localModifiedAt: null,
          syncStatus: 'idle',
          syncError: null,
          pendingRemoteData: null,
        }))
        // persist middleware re-writes synchronously on set() — remove so app
        // behaves like a fresh install (will re-persist on next user action)
        localStorage.removeItem('brainflush-data')
      },
    })),
    {
      name: 'brainflush-data',
      version: 7,
      migrate: (persisted, version) => {
        if (version < 2 && persisted.theme === 'system') {
          persisted.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        if (version < 3 && persisted.tabs) {
          const sorted = [...persisted.tabs].sort((a, b) => a.order - b.order)
          persisted.tabs = persisted.tabs.map((tab) => {
            const idx = sorted.indexOf(tab)
            return { ...tab, pinnedOrder: idx < getMaxPinnedTabs() ? idx : null }
          })
        }
        if (version < 4) {
          persisted.language = (navigator.language || 'en').startsWith('fr') ? 'fr' : 'en'
        }
        if (version < 5) {
          persisted.syncProvider = null
          persisted.lastSyncedAt = null
          persisted.localModifiedAt = null
        }
        if (version < 6) {
          persisted.hasCompletedOnboarding = true
        }
        if (version < 7 && persisted.tasks) {
          persisted.tasks = persisted.tasks.map((t) => ({
            ...t,
            reminderAt: t.reminderAt ?? null,
            reminderFired: t.reminderFired ?? false,
          }))
        }
        return persisted
      },
      partialize: (state) => {
        const { justArchivedIds, lastSyncCompletedAt, syncStatus, syncError, pendingRemoteData, disconnectedProvider, ...persisted } = state
        return persisted
      },
    }
  )
)
