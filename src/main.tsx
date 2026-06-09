import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
