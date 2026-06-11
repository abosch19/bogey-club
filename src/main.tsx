import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { App } from '@/App'
import '@/app/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexClientProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexClientProvider>
  </React.StrictMode>,
)

// Register the PWA service worker (production only — avoids dev/HMR conflicts).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Reload once when a new service worker takes control (new deploy).
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(reg => reg.update())
      .catch(() => {})
  })
}
