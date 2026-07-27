import { lazy } from 'react'

export interface RouteConfig {
  path: string
  /** Lazy-loaded component to render for the route */
  component: React.LazyExoticComponent<() => React.JSX.Element>
  /** Optional breadcrumb or page title label */
  label: string
}

/**
 * Static route definitions for SmartWiFi AI application.
 * Employs named-export dynamic imports via React.lazy to enable efficient code splitting.
 */
export const routes: RouteConfig[] = [
  {
    path: '/',
    component: lazy(() => import('../pages').then((m) => ({ default: m.DashboardPage }))),
    label: 'Dashboard'
  },
  {
    path: '/wifi-info',
    component: lazy(() => import('../pages').then((m) => ({ default: m.WifiInfoPage }))),
    label: 'Wi-Fi Info'
  },
  {
    path: '/network-info',
    component: lazy(() => import('../pages').then((m) => ({ default: m.NetworkInfoPage }))),
    label: 'Network Info'
  },
  {
    path: '/speed-test',
    component: lazy(() => import('../pages').then((m) => ({ default: m.SpeedTestPage }))),
    label: 'Speed Test'
  },
  {
    path: '/ping-monitor',
    component: lazy(() => import('../pages').then((m) => ({ default: m.PingMonitorPage }))),
    label: 'Ping Monitor'
  },
  {
    path: '/jitter-monitor',
    component: lazy(() => import('../pages').then((m) => ({ default: m.JitterMonitorPage }))),
    label: 'Jitter Monitor'
  },
  {
    path: '/packet-loss',
    component: lazy(() => import('../pages').then((m) => ({ default: m.PacketLossPage }))),
    label: 'Packet Loss'
  },
  {
    path: '/signal-strength',
    component: lazy(() => import('../pages').then((m) => ({ default: m.SignalStrengthPage }))),
    label: 'Signal Strength'
  },
  {
    path: '/bandwidth',
    component: lazy(() => import('../pages').then((m) => ({ default: m.BandwidthPage }))),
    label: 'Bandwidth'
  },
  {
    path: '/latency-charts',
    component: lazy(() => import('../pages').then((m) => ({ default: m.LatencyChartsPage }))),
    label: 'Latency Charts'
  },
  {
    path: '/health-score',
    component: lazy(() => import('../pages').then((m) => ({ default: m.HealthScorePage }))),
    label: 'Health Score'
  },
  {
    path: '/health-dashboard',
    component: lazy(() => import('../pages').then((m) => ({ default: m.HealthDashboardPage }))),
    label: 'Health Dashboard'
  },
  {
    path: '/ai-diagnosis',
    component: lazy(() => import('../pages').then((m) => ({ default: m.AiDiagnosisPage }))),
    label: 'AI Diagnosis'
  },
  {
    path: '/optimization',
    component: lazy(() => import('../pages').then((m) => ({ default: m.OptimizationPage }))),
    label: 'Optimization'
  },
  {
    path: '/process-scanner',
    component: lazy(() => import('../pages').then((m) => ({ default: m.ProcessScannerPage }))),
    label: 'Process Scanner'
  },
  {
    path: '/history',
    component: lazy(() => import('../pages').then((m) => ({ default: m.HistoryPage }))),
    label: 'History'
  },
  {
    path: '/reports',
    component: lazy(() => import('../pages').then((m) => ({ default: m.ReportsPage }))),
    label: 'Reports'
  },
  {
    path: '/settings',
    component: lazy(() => import('../pages').then((m) => ({ default: m.SettingsPage }))),
    label: 'Settings'
  },
  {
    path: '/about',
    component: lazy(() => import('../pages').then((m) => ({ default: m.AboutPage }))),
    label: 'About'
  }
]
