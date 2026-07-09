import { HashRouter, Routes, Route } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import {
  DashboardPage,
  WifiInfoPage,
  NetworkInfoPage,
  SpeedTestPage,
  PingMonitorPage,
  PacketLossPage,
  SignalStrengthPage,
  BandwidthPage,
  HealthScorePage,
  AiDiagnosisPage,
  OptimizationPage,
  HistoryPage,
  ReportsPage,
  SettingsPage,
  AboutPage
} from '@/pages'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="wifi-info" element={<WifiInfoPage />} />
          <Route path="network-info" element={<NetworkInfoPage />} />
          <Route path="speed-test" element={<SpeedTestPage />} />
          <Route path="ping-monitor" element={<PingMonitorPage />} />
          <Route path="packet-loss" element={<PacketLossPage />} />
          <Route path="signal-strength" element={<SignalStrengthPage />} />
          <Route path="bandwidth" element={<BandwidthPage />} />
          <Route path="health-score" element={<HealthScorePage />} />
          <Route path="ai-diagnosis" element={<AiDiagnosisPage />} />
          <Route path="optimization" element={<OptimizationPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
