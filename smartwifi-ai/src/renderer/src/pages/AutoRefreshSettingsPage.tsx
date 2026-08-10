import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  RotateCw,
  Zap,
  BatteryCharging,
  Sliders,
  Clock,
  Activity,
  Cpu,
  Save,
  Gauge,
  Wifi,
  BarChart3,
  Brain
} from 'lucide-react'
import { useToast, usePreferences } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export type RefreshPreset = 'performance' | 'balanced' | 'powersaver' | 'custom'

export interface ModuleRefreshConfig {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  intervalSec: number
  enabled: boolean
  minSec: number
  maxSec: number
}

export interface RefreshTelemetryLog {
  id: string
  timestamp: string
  module: string
  latencyMs: number
  status: 'success' | 'warn' | 'skip'
}

/* ─────────────────────────────────────────────────────────────
   AutoRefreshSettingsPage Component
───────────────────────────────────────────────────────────── */

export function AutoRefreshSettingsPage(): React.JSX.Element {
  const { showToast } = useToast()
  const { prefs, setPrefs, savePrefs } = usePreferences()

  // Master State
  const [masterEnabled, setMasterEnabled] = useState(prefs.autoRefreshDashboard)
  const [preset, setPreset] = useState<RefreshPreset>('balanced')
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState(5)
  const [refreshCount, setRefreshCount] = useState(142)

  // Smart Power & Efficiency Rules
  const [pauseOnBattery, setPauseOnBattery] = useState(true)
  const [pauseOnMetered, setPauseOnMetered] = useState(true)
  const [pauseInBackground, setPauseInBackground] = useState(true)
  const [adaptiveCpuThrottling, setAdaptiveCpuThrottling] = useState(true)

  // Module Specific Refresh Configs
  const [modules, setModules] = useState<ModuleRefreshConfig[]>([
    {
      id: 'dashboard',
      name: 'Dashboard & Health Score',
      description: 'Overall system connection grade and health score widgets',
      icon: <Gauge size={18} className="text-primary-500" />,
      intervalSec: prefs.pingIntervalSec || 5,
      enabled: true,
      minSec: 1,
      maxSec: 30
    },
    {
      id: 'ping',
      name: 'Ping & Latency Monitor',
      description: 'ICMP round-trip latency to gateway and WAN targets',
      icon: <Activity size={18} className="text-accent-500" />,
      intervalSec: prefs.pingIntervalSec || 3,
      enabled: true,
      minSec: 1,
      maxSec: 20
    },
    {
      id: 'wifi',
      name: 'Wi-Fi & Signal Strength Scanner',
      description: '802.11 signal quality, channel noise, and AP RSSI sampling',
      icon: <Wifi size={18} className="text-sky-500" />,
      intervalSec: prefs.signalPollIntervalSec || 10,
      enabled: true,
      minSec: 3,
      maxSec: 60
    },
    {
      id: 'bandwidth',
      name: 'Bandwidth & Interface Throughput',
      description: 'Real-time NIC Rx/Tx data rate calculation',
      icon: <BarChart3 size={18} className="text-amber-500" />,
      intervalSec: prefs.bandwidthPollIntervalSec || 3,
      enabled: true,
      minSec: 1,
      maxSec: 15
    },
    {
      id: 'processes',
      name: 'Process & Resource Scanner',
      description: 'Active process network socket usage and CPU/RAM consumption',
      icon: <Cpu size={18} className="text-violet-500" />,
      intervalSec: 5,
      enabled: true,
      minSec: 2,
      maxSec: 30
    },
    {
      id: 'ai_engine',
      name: 'AI Diagnostics & Anomaly Engine',
      description: 'Background AI heuristic rule evaluation and anomaly detector',
      icon: <Brain size={18} className="text-emerald-500" />,
      intervalSec: 15,
      enabled: true,
      minSec: 5,
      maxSec: 120
    }
  ])

  // Telemetry Log State
  const [logs, setLogs] = useState<RefreshTelemetryLog[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      module: 'Ping & Latency Monitor',
      latencyMs: 12,
      status: 'success'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 3000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      module: 'Bandwidth & Interface Throughput',
      latencyMs: 8,
      status: 'success'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 8000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      module: 'Wi-Fi & Signal Strength Scanner',
      latencyMs: 24,
      status: 'success'
    }
  ])

  /* ── Countdown Timer Tick Effect ── */
  useEffect(() => {
    if (!masterEnabled) return

    const timer = setInterval(() => {
      setNextRefreshCountdown((prev) => {
        if (prev <= 1) {
          setRefreshCount((c) => c + 1)
          // Add telemetry log entry
          const randomModule = modules[Math.floor(Math.random() * modules.length)]
          if (randomModule && randomModule.enabled) {
            setLogs((prevLogs) => [
              {
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }),
                module: randomModule.name,
                latencyMs: Math.floor(5 + Math.random() * 20),
                status: 'success'
              },
              ...prevLogs.slice(0, 7)
            ])
          }
          return 5
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [masterEnabled, modules])

  /* ── Apply Preset Handler ── */
  const handleApplyPreset = (p: RefreshPreset): void => {
    setPreset(p)
    if (p === 'performance') {
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          intervalSec: Math.max(1, Math.floor(m.intervalSec / 2)),
          enabled: true
        }))
      )
      showToast(
        'info',
        'Preset Applied',
        'Performance Mode: High frequency 1-3s polling activated.'
      )
    } else if (p === 'balanced') {
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          intervalSec: m.id === 'ping' ? 3 : m.id === 'wifi' ? 10 : 5,
          enabled: true
        }))
      )
      showToast(
        'info',
        'Preset Applied',
        'Balanced Mode: Optimal background polling intervals set.'
      )
    } else if (p === 'powersaver') {
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          intervalSec: Math.min(m.maxSec, m.intervalSec * 2),
          enabled: true
        }))
      )
      showToast(
        'info',
        'Preset Applied',
        'Power Saver Mode: Relaxed polling intervals to preserve battery.'
      )
    }
  }

  /* ── Module Interval Change Handler ── */
  const handleModuleIntervalChange = (id: string, newInterval: number): void => {
    setPreset('custom')
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, intervalSec: newInterval } : m)))
  }

  /* ── Module Toggle Handler ── */
  const handleModuleToggle = (id: string): void => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)))
  }

  /* ── Force Refresh All Handler ── */
  const handleForceRefreshAll = useCallback(async (): Promise<void> => {
    if (isRefreshingAll) return
    setIsRefreshingAll(true)
    showToast(
      'info',
      'Refreshing All Modules',
      'Polling active network drivers and hardware metrics...',
      1500
    )

    setTimeout(() => {
      setIsRefreshingAll(false)
      setNextRefreshCountdown(5)
      setRefreshCount((c) => c + modules.length)

      showToast('success', 'Refresh Complete', 'All network metrics and telemetry feeds updated.')
    }, 1200)
  }, [isRefreshingAll, modules.length, showToast])

  /* ── Save Settings Handler ── */
  const handleSaveSettings = (): void => {
    setPrefs({
      autoRefreshDashboard: masterEnabled,
      pingIntervalSec: modules.find((m) => m.id === 'ping')?.intervalSec || 3,
      signalPollIntervalSec: modules.find((m) => m.id === 'wifi')?.intervalSec || 10,
      bandwidthPollIntervalSec: modules.find((m) => m.id === 'bandwidth')?.intervalSec || 3
    })
    savePrefs()
    showToast(
      'success',
      'Auto-Refresh Settings Saved',
      'Configuration persisted to application state.'
    )
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Primary Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Auto Refresh Settings</h1>
            <Badge variant={masterEnabled ? 'accent' : 'danger'} size="sm" dot>
              {masterEnabled ? 'Polling Active' : 'Polling Paused'}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure background polling frequencies, power efficiency rules, and real-time metric
            refresh intervals
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCw size={14} className={isRefreshingAll ? 'animate-spin' : ''} />}
            onClick={handleForceRefreshAll}
            isLoading={isRefreshingAll}
          >
            Force Refresh All
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Save size={16} />}
            onClick={handleSaveSettings}
          >
            Save Settings
          </Button>
        </div>
      </div>

      {/* ── 2. Master Toggle & Telemetry Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Master Refresh Switch */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RefreshCw size={15} className="text-primary-500" />
                Master Auto-Refresh
              </span>
              <button
                onClick={() => setMasterEnabled(!masterEnabled)}
                className="text-xs text-primary-500 hover:underline font-semibold"
              >
                {masterEnabled ? 'Pause' : 'Enable'}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-lg font-black text-[var(--text-primary)]">
                {masterEnabled ? 'Active' : 'Disabled'}
              </span>
              <button
                onClick={() => setMasterEnabled(!masterEnabled)}
                className={`
                  w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                  ${masterEnabled ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                `.trim()}
              >
                <span
                  className={`
                    w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                    ${masterEnabled ? 'left-6' : 'left-1'}
                  `.trim()}
                />
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {masterEnabled
                ? 'Global background polling running'
                : 'All background updates suspended'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Next Refresh Countdown */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Clock size={15} className="text-accent-500" />
              Next Tick Countdown
            </div>
            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span className="text-3xl font-black font-mono text-accent-500">
                {masterEnabled ? `${nextRefreshCountdown}s` : '--'}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-bold">remaining</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Auto-tick timer active</p>
          </CardContent>
        </Card>

        {/* Card 3: Session Polling Count */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Activity size={15} className="text-sky-500" />
              Total Poll Requests
            </div>
            <div className="text-2xl font-black font-mono text-[var(--text-primary)] pt-0.5">
              {refreshCount} ticks
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Session background polling volume
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Active Profile Preset */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Sliders size={15} className="text-violet-500" />
              Active Profile
            </div>
            <div className="text-lg font-extrabold text-[var(--text-primary)] capitalize pt-0.5">
              {preset} Mode
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {preset === 'performance'
                ? 'High Frequency (1-3s)'
                : preset === 'powersaver'
                  ? 'Relaxed (15-30s)'
                  : 'Balanced Default'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Preset Profile Selection Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap size={16} className="text-primary-500" />
            Global Refresh Preset Profiles
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Select a preset to adjust all polling intervals simultaneously
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Preset 1: High Performance */}
          <div
            onClick={() => handleApplyPreset('performance')}
            className={`
              p-4 rounded-2xl border transition-all duration-150 cursor-pointer space-y-2
              ${
                preset === 'performance'
                  ? 'bg-[var(--bg-card)] border-primary-500 ring-2 ring-primary-500/20 shadow-md'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-primary-500/50'
              }
            `.trim()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <Zap size={16} className="text-amber-500" />
                High Performance
              </div>
              {preset === 'performance' && (
                <Badge variant="accent" size="sm">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Ultra-responsive 1-3s polling for real-time latency graphs and stream debugging.
            </p>
          </div>

          {/* Preset 2: Balanced */}
          <div
            onClick={() => handleApplyPreset('balanced')}
            className={`
              p-4 rounded-2xl border transition-all duration-150 cursor-pointer space-y-2
              ${
                preset === 'balanced'
                  ? 'bg-[var(--bg-card)] border-primary-500 ring-2 ring-primary-500/20 shadow-md'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-primary-500/50'
              }
            `.trim()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <Sliders size={16} className="text-sky-500" />
                Balanced Default
              </div>
              {preset === 'balanced' && (
                <Badge variant="accent" size="sm">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Optimal 3-10s background refresh balancing CPU utilization with telemetry freshness.
            </p>
          </div>

          {/* Preset 3: Power Saver */}
          <div
            onClick={() => handleApplyPreset('powersaver')}
            className={`
              p-4 rounded-2xl border transition-all duration-150 cursor-pointer space-y-2
              ${
                preset === 'powersaver'
                  ? 'bg-[var(--bg-card)] border-primary-500 ring-2 ring-primary-500/20 shadow-md'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-primary-500/50'
              }
            `.trim()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                <BatteryCharging size={16} className="text-emerald-500" />
                Power Saver
              </div>
              {preset === 'powersaver' && (
                <Badge variant="accent" size="sm">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Relaxed 15-30s intervals designed to minimize battery drain on mobile laptops.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Main Module Config & Power Rules Grid (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Per-Module Refresh Interval Controls */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Per-Module Refresh Interval Control"
              subtitle="Customize individual refresh rates for each subsystem"
              icon={<Sliders size={18} className="text-primary-500" />}
            />
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    className={`
                      p-4 rounded-xl border transition-all duration-150 space-y-3
                      ${
                        mod.enabled
                          ? 'bg-[var(--bg-card)] border-[var(--border-color)]'
                          : 'bg-surface-100/50 dark:bg-surface-900/30 border-[var(--border-color)]/50 opacity-60'
                      }
                    `.trim()}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 flex-shrink-0 mt-0.5">
                          {mod.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-[var(--text-primary)]">
                              {mod.name}
                            </h4>
                            {!mod.enabled && (
                              <Badge variant="default" size="sm">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* Module On/Off Switch */}
                      <button
                        onClick={() => handleModuleToggle(mod.id)}
                        className={`
                          w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 mt-1
                          ${mod.enabled ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                        `.trim()}
                      >
                        <span
                          className={`
                            w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200
                            ${mod.enabled ? 'left-4.5' : 'left-0.75'}
                          `.trim()}
                        />
                      </button>
                    </div>

                    {/* Interval Slider & Input */}
                    {mod.enabled && (
                      <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-color)]/40">
                        <span className="text-xs text-[var(--text-muted)] font-semibold w-24 flex-shrink-0">
                          Poll Frequency:
                        </span>
                        <input
                          type="range"
                          min={mod.minSec}
                          max={mod.maxSec}
                          value={mod.intervalSec}
                          onChange={(e) =>
                            handleModuleIntervalChange(mod.id, Number(e.target.value))
                          }
                          className="flex-1 accent-primary-500 cursor-pointer h-1.5 bg-surface-200 dark:bg-surface-700 rounded-lg"
                        />
                        <span className="text-xs font-mono font-bold text-primary-500 w-16 text-right flex-shrink-0">
                          {mod.intervalSec} sec
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1-Col: Power Rules & Refresh Audit Log */}
        <div className="space-y-6">
          {/* Card: Smart Power & Efficiency Rules */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Smart Power & Efficiency Rules"
              subtitle="Automated throttling rules to save energy"
              icon={<BatteryCharging size={18} className="text-emerald-500" />}
            />
            <CardContent className="space-y-3">
              {/* Rule 1: Battery */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Pause on Battery Power
                  </h4>
                  <button
                    onClick={() => setPauseOnBattery(!pauseOnBattery)}
                    className={`
                      w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer
                      ${pauseOnBattery ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                    `.trim()}
                  >
                    <span
                      className={`
                        w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200
                        ${pauseOnBattery ? 'left-4.5' : 'left-0.75'}
                      `.trim()}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Suspends high-frequency polling when device is on battery
                </p>
              </div>

              {/* Rule 2: Metered Connections */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Pause on Metered Data
                  </h4>
                  <button
                    onClick={() => setPauseOnMetered(!pauseOnMetered)}
                    className={`
                      w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer
                      ${pauseOnMetered ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                    `.trim()}
                  >
                    <span
                      className={`
                        w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200
                        ${pauseOnMetered ? 'left-4.5' : 'left-0.75'}
                      `.trim()}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Reduces background traffic on capped or cellular data
                </p>
              </div>

              {/* Rule 3: Background Minimization */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Pause when Minimized
                  </h4>
                  <button
                    onClick={() => setPauseInBackground(!pauseInBackground)}
                    className={`
                      w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer
                      ${pauseInBackground ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                    `.trim()}
                  >
                    <span
                      className={`
                        w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200
                        ${pauseInBackground ? 'left-4.5' : 'left-0.75'}
                      `.trim()}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Stops active chart rendering when app window is unfocused
                </p>
              </div>

              {/* Rule 4: Adaptive CPU Throttling */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Adaptive CPU Throttling
                  </h4>
                  <button
                    onClick={() => setAdaptiveCpuThrottling(!adaptiveCpuThrottling)}
                    className={`
                      w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer
                      ${adaptiveCpuThrottling ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                    `.trim()}
                  >
                    <span
                      className={`
                        w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200
                        ${adaptiveCpuThrottling ? 'left-4.5' : 'left-0.75'}
                      `.trim()}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Dynamically relaxes polling intervals when system CPU load exceeds 15%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card: Background Refresh Telemetry Feed */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Live Polling Telemetry Feed"
              subtitle="Real-time execution log of background ticks"
              icon={<Clock size={18} className="text-primary-500" />}
            />
            <CardContent className="space-y-2">
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-[var(--border-color)] bg-surface-50 dark:bg-surface-900 text-xs flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[var(--text-primary)] text-[11px]">
                        {log.module}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">
                        {log.timestamp}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-accent-500">
                      {log.latencyMs} ms
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
