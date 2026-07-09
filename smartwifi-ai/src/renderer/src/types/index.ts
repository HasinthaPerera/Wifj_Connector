/** Supported application themes */
export type Theme = 'light' | 'dark' | 'system'

/** Navigation item used in sidebar */
export interface NavigationItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: string | number
}

/** Navigation section grouping related items */
export interface NavigationSection {
  id: string
  title: string
  items: NavigationItem[]
}

/** Core application settings persisted to storage */
export interface AppSettings {
  theme: Theme
  sidebarCollapsed: boolean
  refreshInterval: number
  notifications: boolean
  dataRetentionDays: number
}

/** Wi-Fi connection information */
export interface WifiInfo {
  ssid: string
  bssid: string
  signalStrength: number
  frequency: number
  channel: number
  security: string
  linkSpeed: number
}

/** Network interface information */
export interface NetworkInfo {
  name: string
  ipAddress: string
  macAddress: string
  gateway: string
  dns: string[]
  subnet: string
  type: 'wifi' | 'ethernet' | 'other'
  isConnected: boolean
}

/** Speed test result */
export interface SpeedTestResult {
  id: string
  timestamp: number
  downloadSpeed: number
  uploadSpeed: number
  ping: number
  jitter: number
  server: string
}

/** Ping monitor entry */
export interface PingEntry {
  timestamp: number
  latency: number
  host: string
  status: 'success' | 'timeout' | 'error'
  packetLoss: number
}

/** Wi-Fi health score breakdown */
export interface HealthScore {
  overall: number
  signalQuality: number
  connectionStability: number
  speedPerformance: number
  latencyScore: number
  securityScore: number
}

/** Notification item */
export interface AppNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: number
  read: boolean
}

/** Chart data point for time-series */
export interface TimeSeriesDataPoint {
  timestamp: number
  value: number
  label?: string
}
