# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brainflush is a minimalist task manager PWA. Users organize tasks into **tabs > columns > tasks**, with mobile-first swipe navigation and drag-and-drop reordering. Offline-first, privacy-focused (zero-trust sync), installable.

## Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run dev:full` — Dev server with Cloudflare Pages Functions (wrangler) — needed for OAuth callbacks
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build locally

## Stack

- React 19 + Vite 7 + Tailwind CSS 4 (via `@tailwindcss/vite`)
- Zustand with `persist` middleware for state management
- `@dnd-kit` for drag-and-drop (core + sortable)
- `motion` (Framer Motion) for animations
- `vite-plugin-pwa` + Workbox for offline/PWA support
- Cloudflare Pages for deployment (+ Pages Functions for OAuth)

## Architecture

### State — Single Zustand Store (`src/hooks/useStore.js`)

All app state lives in one persisted Zustand store (localStorage key: `brainflush-data`). Data model:
- **tabs** — top-level categories (id, name, emoji, order, pinnedOrder)
- **columns** — belong to a tab (id, tabId, name, order)
- **tasks** — belong to a column (id, columnId, text, order, archived, archivedAt, originalColumnId, createdAt)

**Persist version: 6.** Migrations in the store handle upgrades (v2: theme, v3: pinnedOrder, v4: language, v5: sync fields, v6: onboarding). Bump version and add migration when changing persisted shape.

**Transient state** (excluded via `partialize`): `justArchivedIds`, `syncStatus`, `syncError`, `pendingRemoteData`, `disconnectedProvider`. These reset on reload.

**Auto-timestamp middleware**: Every mutation auto-sets `localModifiedAt: Date.now()` to track changes for sync. Skip with `_skipTimestamp: true` in the partial (used by sync actions like `setSyncProvider`, `replaceData`).

### Theming (`src/hooks/useTheme.js` + `src/index.css`)

Theme cycles through light/dark/system. Dark mode is applied via `.dark` class on `<html>`. All colors use CSS custom properties (e.g., `--bg-card`, `--text-primary`, `--border-color`) defined in `:root` and `.dark` blocks. Components use inline `style={{ color: 'var(--text-primary)' }}` rather than Tailwind `dark:` variants.

### i18n (`src/i18n/translations.js` + `src/hooks/useLanguage.js`)

English and French. Flat key namespace (`'taskCard.archive'`), supports function values for interpolation/pluralization. `useLanguage()` returns `{ language, toggleLanguage, t }`. Fallback: `translations[lang][key] ?? translations.en[key] ?? key`. Auto-detected from `navigator.language` on first load.

### Desktop vs Mobile Rendering

**Critical**: Use `useIsDesktop()` hook (matchMedia 768px) for conditional rendering — **NOT** CSS `hidden`/`md:flex`. Reason: @dnd-kit registers droppables via hooks even in `display:none` containers, causing duplicate IDs and zero-rect measurements.

- **Desktop**: Horizontal scrollable column list with `SortableContext` for column reordering
- **Mobile**: Full-width single column with swipe navigation (`translateX` transforms), dot indicators

### Mobile Navigation

- **Swipe between columns**: Touch handlers in `App.jsx` manage `mobileColIndex`. Threshold 60px, direction lock after 10px delta. `isDragPending` ref blocks swipe during DnD touch sensor delay.
- **Back button closes overlays**: `useBackClose` hook (`src/hooks/useBackClose.js`) pushes `history.pushState()` entries when overlays open and intercepts `popstate` to close them. Global `navStack` ensures nested overlays close in LIFO order.
- **Bottom sheet for task creation**: `AddTaskSheet` is a mobile-only slide-up panel. Uses `onMouseDown={e => e.preventDefault()}` on interactive elements to prevent keyboard dismissal.

### Drag and Drop

**Sensors**: `MouseSensor` (NOT PointerSensor — avoids touch conflicts) with 5px distance, `TouchSensor` with 250ms delay / 8px tolerance.

**Multi-container pattern**: `liveTaskMap` (`{ [columnId]: [taskId, ...] }`) tracks live positions during drag. Updated in `handleDragOver` for cross-column moves, consumed by Column components as `liveTaskIds` prop.

**Collision detection**: Custom ref-based callback. Column drag uses pointer position for gap detection. Task drag uses `pointerWithin` → `rectIntersection` fallback, then drills to closest task. `recentlyMovedToNewContainer` ref prevents oscillation.

`overflow: clip` (not `hidden`) on `<html>` — avoids @dnd-kit scroll offset bug.

### Cloud Sync (`src/sync/`)

Two providers: **GitHub Gist** (private) and **Google Drive** (appData scope). Zero-trust — no server sees task data.

- **syncEngine.js** — Core engine: debounce 3s on changes, background poll every 60s, offline queue, auto-retry with exponential backoff
- **merge.js** — Three-way merge (base/local/remote) with LWW at field level. Base stored in `localStorage('brainflush-sync-base')`. Post-merge: orphan cleanup, order recompaction
- **providers/github.js** — OAuth code → Cloudflare Function → token. Stores in Gist API
- **providers/google.js** — PKCE flow. Auto-refreshes token 1 min before expiry. Files in `appDataFolder`
- **useSync.js** — React hook exposing `syncProvider`, `syncStatus`, `connect()`, `disconnect()`, `handleConflict()`

### Cloudflare Pages Functions (`functions/api/auth/`)

OAuth callback handlers for GitHub and Google. Exchange authorization code for tokens server-side (secrets never exposed to frontend). CORS validated against `ALLOWED_ORIGINS` env var.

**CF env vars**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_ORIGINS`
**Vite env vars**: `VITE_GITHUB_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`

### Modal Pattern

All modals (except mobile drawers: AddTaskSheet, TaskDetailModal) follow the same structure:

```jsx
{/* Overlay + centering */}
<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
  style={{ background: 'var(--bg-overlay)' }} onClick={onClose}>
  {/* Card — no padding, overflow-hidden clips rounded corners */}
  <div className="w-full max-w-sm rounded-xl shadow-lg overflow-hidden"
    style={{ background: 'var(--bg-card)' }} onClick={(e) => e.stopPropagation()}>
    {/* Header: title + X + border-b */}
    <div className="flex items-center justify-between px-5 py-4 border-b"
      style={{ borderColor: 'var(--border-color)' }}>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    {/* Content */}
    <div className="p-5">...</div>
  </div>
</div>
```

Invariants: card `overflow-hidden` (no padding on card), header `px-5 py-4 border-b`, content `p-5`, X button in header. Exception: SyncConflict has no X (forced choice).

### Key Patterns

- **Store mutations**: Spread to create new objects, return early if unchanged. Use `_skipTimestamp: true` for sync-related writes.
- **Event propagation**: `e.stopPropagation()` on card buttons to prevent drag triggers. `onPointerDown(e => e.stopPropagation())` on interactive elements inside draggables.
- **Haptic feedback**: `navigator.vibrate?.(20)` on drag start.
- **Safe area**: Bottom padding uses `calc(3.5rem + env(safe-area-inset-bottom, 0px))`.
- **Pinned tabs**: `getMaxPinnedTabs()` based on viewport width. New tabs auto-pin until limit reached.
