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
