import React from 'react'
import { HashRouter } from 'react-router-dom'
import { AppRoutes } from '@/router'

/**
 * App — Main application layout wrapper.
 * Integrates HashRouter and maps to AppRoutes for full UI routing capability.
 */
function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App
