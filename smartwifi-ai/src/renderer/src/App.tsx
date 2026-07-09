import { HashRouter, Routes, Route } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { DashboardPage } from '@/pages/DashboardPage'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<DashboardPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
