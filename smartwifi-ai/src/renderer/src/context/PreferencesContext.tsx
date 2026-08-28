/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type LatencyUnit = 'ms' | 'auto'
export type BandwidthUnit = 'Mbps' | 'MB/s' | 'auto'
export type DisplayDensity = 'compact' | 'comfortable' | 'spacious'
export type ChartStyle = 'line' | 'area' | 'bar'
export type ExportFormat = 'json' | 'csv'

export interface UserPreferences {
  /* ── Monitoring ── */
  pingIntervalSec: number
  signalPollIntervalSec: number
  bandwidthPollIntervalSec: number
  latencyAlertThresholdMs: number
  packetLossAlertPct: number
  jitterAlertThresholdMs: number
  dataRetentionDays: number

  /* ── Notifications ── */
  enableSystemAlerts: boolean
  enableSoundChimes: boolean
  enableAutoTuneNotif: boolean
  alertOnDisconnect: boolean
  alertOnLatencySpike: boolean

  /* ── Startup & Behavior ── */
  launchAtLogin: boolean
  minimizeToTray: boolean
  autoRefreshDashboard: boolean
  rememberLastPage: boolean

  /* ── Display ── */
  displayDensity: DisplayDensity
  chartStyle: ChartStyle
  showAnimations: boolean
  sidebarCollapsedByDefault: boolean

  /* ── Units ── */
  latencyUnit: LatencyUnit
  bandwidthUnit: BandwidthUnit

  /* ── Export ── */
  defaultExportFormat: ExportFormat
  includeTimestampsInExport: boolean
}

export interface PreferencesContextValue {
  prefs: UserPreferences
  setPrefs: (partial: Partial<UserPreferences>) => void
  resetPrefs: () => void
  isDirty: boolean
  savePrefs: () => void
}

/* ─────────────────────────────────────────────────────────────
   Defaults
───────────────────────────────────────────────────────────── */

export const DEFAULT_PREFERENCES: UserPreferences = {
  pingIntervalSec: 5,
  signalPollIntervalSec: 10,
  bandwidthPollIntervalSec: 3,
  latencyAlertThresholdMs: 45,
  packetLossAlertPct: 2,
  jitterAlertThresholdMs: 10,
  dataRetentionDays: 30,

  enableSystemAlerts: true,
  enableSoundChimes: true,
  enableAutoTuneNotif: true,
  alertOnDisconnect: true,
  alertOnLatencySpike: true,

  launchAtLogin: false,
  minimizeToTray: true,
  autoRefreshDashboard: true,
  rememberLastPage: true,

  displayDensity: 'comfortable',
  chartStyle: 'area',
  showAnimations: true,
  sidebarCollapsedByDefault: false,

  latencyUnit: 'ms',
  bandwidthUnit: 'Mbps',

  defaultExportFormat: 'json',
  includeTimestampsInExport: true
}

/* ─────────────────────────────────────────────────────────────
   Storage helpers
───────────────────────────────────────────────────────────── */

const PREFS_KEY = 'smartwifi-user-prefs'

function loadStoredPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFERENCES }
}

function persistPrefs(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage unavailable
  }
}

/* ─────────────────────────────────────────────────────────────
   Context
───────────────────────────────────────────────────────────── */

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [saved, setSaved] = useState<UserPreferences>(loadStoredPrefs)
  const [draft, setDraft] = useState<UserPreferences>(() => ({ ...saved }))

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const setPrefs = useCallback((partial: Partial<UserPreferences>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }, [])

  const savePrefs = useCallback(() => {
    setSaved(draft)
    persistPrefs(draft)
  }, [draft])

  const resetPrefs = useCallback(() => {
    setDraft({ ...DEFAULT_PREFERENCES })
  }, [])

  // Apply display density to <html> data attribute so CSS can react
  useEffect(() => {
    document.documentElement.setAttribute('data-density', draft.displayDensity)
  }, [draft.displayDensity])

  // Apply animation preference
  useEffect(() => {
    document.documentElement.setAttribute('data-animations', draft.showAnimations ? 'on' : 'off')
  }, [draft.showAnimations])

  return (
    <PreferencesContext.Provider value={{ prefs: draft, setPrefs, resetPrefs, isDirty, savePrefs }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
