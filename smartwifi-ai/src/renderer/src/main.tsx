import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, ToastProvider, WifiProvider, PreferencesProvider, NotificationProvider } from '@/context'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PreferencesProvider>
        <ToastProvider>
          <WifiProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </WifiProvider>
        </ToastProvider>
      </PreferencesProvider>
    </ThemeProvider>
  </StrictMode>
)
