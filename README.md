<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brainflush-logo.png">
    <img src="public/brainflush-logo.png" alt="Brainflush logo" width="200" style="background: #19408f; border-radius: 16px; padding: 16px;">
  </picture>
</p>

<h1 align="center">Brainflush</h1>

<p align="center">
  <strong>Minimalist brain dump task manager</strong><br>
  Organize your thoughts into tabs, columns, and tasks — offline-first, privacy-focused, and installable.
</p>

---

## Features

- **Tabs / Columns / Tasks** — hierarchical organization with emoji-labeled tabs
- **Drag & drop** — reorder tasks within and across columns (@dnd-kit)
- **Mobile-first swipe navigation** — swipe between columns on mobile, horizontal scroll on desktop
- **Theme** — light, dark, and system modes via CSS custom properties
- **i18n** — English and French, auto-detected from browser locale
- **Cloud sync** — GitHub Gist and Google Drive (appData scope), zero-trust (no server sees your data)
- **Offline-first PWA** — installable, works without network via Workbox service worker
- **Archive system** — soft-archive with strikethrough, restore or permanently delete
- **Onboarding flow** — guided first-run experience

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| State | Zustand (persisted to localStorage) |
| Drag & Drop | @dnd-kit (core + sortable) |
| Animations | Motion (Framer Motion) |
| PWA | vite-plugin-pwa + Workbox |
| Deployment | Cloudflare Pages |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/helitik/brainflush.git
cd brainflush

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
cp .dev.vars.example .dev.vars   # only needed for npm run dev:full (OAuth)

# Start the dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth App client ID (for Gist sync) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (for Drive appData sync) |
| `VITE_ALLOWED_HOST` | Allowed host for tunneling (e.g. ngrok) — dev only |

Cloud sync is optional. The app works fully offline without any env vars configured.

### Cloudflare Pages Functions (`.dev.vars`)

When running `npm run dev:full` (wrangler), the OAuth callback functions need server-side secrets. Copy `.dev.vars.example` to `.dev.vars` and fill in the values:

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins for CORS (optional) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run dev:full` | Dev server with Cloudflare Pages Functions (wrangler) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── App.jsx                 # Root component, DnD context, swipe navigation
├── main.jsx                # Entry point
├── index.css               # Global styles, CSS variables, Tailwind
├── assets/                 # Static assets
├── components/
│   ├── columns/            # Column display + task list
│   ├── layout/             # Header, Drawer, AppContent
│   ├── onboarding/         # First-run onboarding flow
│   ├── shared/             # Reusable UI components
│   ├── sync/               # SyncStatus, SyncSettings
│   ├── tabs/               # Tab bar + tab management
│   └── tasks/              # TaskCard, AddTaskSheet, ArchiveView
├── hooks/                  # useStore, useTheme, useLanguage, useSync, etc.
├── i18n/                   # Translation strings (EN/FR)
├── lib/                    # Utilities (uuid)
└── sync/                   # Sync engine, PKCE, providers (GitHub, Google)

functions/
└── api/                    # Cloudflare Pages Functions (OAuth callbacks)
```

## Cloud Sync Setup

Cloud sync uses OAuth to store data in **your own** GitHub Gist or Google Drive — no intermediate server ever sees your tasks.

### GitHub Gist

1. Create a [GitHub OAuth App](https://github.com/settings/developers)
2. Set the callback URL to `https://<your-domain>/`
3. Add the client ID to `VITE_GITHUB_CLIENT_ID`
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Cloudflare Pages environment variables (used by the token exchange function)

### Google Drive

1. Create a [Google Cloud OAuth 2.0 Client](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URIs for your domain
3. Enable the Google Drive API
4. Add the client ID to `VITE_GOOGLE_CLIENT_ID`

## Deployment

The project is designed for **Cloudflare Pages**:

```bash
# Build for production
npm run build

# The `dist/` output and `functions/` directory deploy together on Cloudflare Pages
```

The `functions/api/` directory contains Cloudflare Pages Functions that handle the GitHub OAuth code-to-token exchange. Configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in your Cloudflare Pages project settings.

## License

MIT
