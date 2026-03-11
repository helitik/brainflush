import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// --- Service Worker registration ---
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Dev mode: unregister any leftover SW to avoid stale cache issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const r of registrations) r.unregister()
    })
  } else {
    // Prod: register SW with update-via-cache bypass
    const hadController = !!navigator.serviceWorker.controller

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload when a new SW takes control, but not on first-ever install
      if (hadController) window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        // Periodic update check every 60 min (browser only checks on navigation)
        setInterval(() => registration.update(), 60 * 60 * 1000)
      })
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
