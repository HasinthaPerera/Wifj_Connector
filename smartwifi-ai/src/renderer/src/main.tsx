import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, ToastProvider, WifiProvider } from '@/context'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <WifiProvider>
          <App />
        </WifiProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
)
