import React, { useState } from 'react'
import {
  Bell,
  Settings,
  Download,
  RotateCcw,
  Save,
  CheckCircle2,
  ChevronDown,
  Activity,
  ShieldAlert,
  MonitorSmartphone,
  Ruler
} from 'lucide-react'
import { usePreferences, useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'
import type { UserPreferences } from '@/context'

/* ─────────────────────────────────────────────────────────────
   Local sub-components
───────────────────────────────────────────────────────────── */

interface SectionProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}

function PrefSection({ icon, title, subtitle, children }: SectionProps): React.JSX.Element {
  return (
    <Card className="border-[var(--border-color)] shadow-card">
      <CardHeader title={title} subtitle={subtitle} icon={icon} />
      <CardContent className="space-y-1">{children}</CardContent>
    </Card>
  )
}

/* ── Toggle row ── */

interface ToggleRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange
}: ToggleRowProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-color)]/60 last:border-0">
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative flex-shrink-0 mt-0.5 w-10 h-5.5 rounded-full cursor-pointer
          transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          ${checked ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700'}
        `.trim()}
        aria-label={`${checked ? 'Disable' : 'Enable'} ${label}`}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${checked ? 'translate-x-4.5' : 'translate-x-0'}
          `.trim()}
        />
      </button>
    </div>
  )
}

/* ── Number input row ── */

interface NumberRowProps {
  id: string
  label: string
  description: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  onChange: (v: number) => void
}

function NumberRow({
  id,
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange
}: NumberRowProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-color)]/60 last:border-0">
      <div className="flex-1">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v >= min && v <= max) onChange(v)
          }}
          className="
            w-20 px-2 py-1 rounded-lg text-xs font-mono font-semibold text-center
            bg-[var(--bg-card)] border border-[var(--border-color)]
            text-[var(--text-primary)]
            focus:outline-none focus:ring-2 focus:ring-primary-500
            transition-colors duration-150
          "
        />
        <span className="text-[11px] text-[var(--text-muted)] font-medium w-8">{unit}</span>
      </div>
    </div>
  )
}

/* ── Select row ── */

interface SelectRowProps<T extends string> {
  id: string
  label: string
  description: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

function SelectRow<T extends string>({
  id,
  label,
  description,
  value,
  options,
  onChange
}: SelectRowProps<T>): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-color)]/60 last:border-0">
      <div className="flex-1">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="relative flex-shrink-0">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="
            appearance-none pl-2.5 pr-7 py-1.5 rounded-lg text-xs font-semibold
            bg-[var(--bg-card)] border border-[var(--border-color)]
            text-[var(--text-primary)] cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary-500
            transition-colors duration-150
          "
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={11}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main UserPreferencesPage
───────────────────────────────────────────────────────────── */

export function UserPreferencesPage(): React.JSX.Element {
  const { prefs, setPrefs, resetPrefs, isDirty, savePrefs } = usePreferences()
  const { showToast } = useToast()
  const [savedFlash, setSavedFlash] = useState(false)

  const p = (key: keyof UserPreferences) => (value: unknown) =>
    setPrefs({ [key]: value } as Partial<UserPreferences>)

  const handleSave = (): void => {
    savePrefs()
    setSavedFlash(true)
    showToast('success', 'Preferences Saved', 'All user preferences have been persisted.')
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const handleReset = (): void => {
    resetPrefs()
    showToast('info', 'Preferences Reset', 'Reverted to factory default preferences.')
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Save/Reset actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">User Preferences</h1>
            {isDirty && (
              <Badge variant="warning" size="sm">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Personalise monitoring intervals, alert thresholds, display density, and export defaults
            — all persisted locally on your device
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            id="prefs-reset"
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={handleReset}
            disabled={!isDirty}
          >
            Reset
          </Button>
          <Button
            id="prefs-save"
            variant="primary"
            size="md"
            leftIcon={
              savedFlash ? (
                <CheckCircle2 size={16} className="text-accent-300" />
              ) : (
                <Save size={16} />
              )
            }
            onClick={handleSave}
            isLoading={false}
          >
            {savedFlash ? 'Saved!' : 'Save Preferences'}
          </Button>
        </div>
      </div>

      {/* ── 2. Two-Column Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">
          {/* Monitoring Intervals */}
          <PrefSection
            icon={<Activity size={16} className="text-primary-500" />}
            title="Monitoring Intervals"
            subtitle="How often each metric is polled from the system"
          >
            <NumberRow
              id="prefs-ping-interval"
              label="Ping Monitor Interval"
              description="Frequency of ICMP round-trip measurements"
              value={prefs.pingIntervalSec}
              min={1}
              max={60}
              unit="sec"
              onChange={p('pingIntervalSec')}
            />
            <NumberRow
              id="prefs-signal-interval"
              label="Signal Strength Poll Interval"
              description="How often wireless signal quality is sampled"
              value={prefs.signalPollIntervalSec}
              min={5}
              max={120}
              step={5}
              unit="sec"
              onChange={p('signalPollIntervalSec')}
            />
            <NumberRow
              id="prefs-bandwidth-interval"
              label="Bandwidth Poll Interval"
              description="Rate at which network interface throughput is measured"
              value={prefs.bandwidthPollIntervalSec}
              min={1}
              max={30}
              unit="sec"
              onChange={p('bandwidthPollIntervalSec')}
            />
            <NumberRow
              id="prefs-retention"
              label="Data Retention Period"
              description="Historical records older than this are automatically purged"
              value={prefs.dataRetentionDays}
              min={7}
              max={365}
              unit="days"
              onChange={p('dataRetentionDays')}
            />
          </PrefSection>

          {/* Alert Thresholds */}
          <PrefSection
            icon={<ShieldAlert size={16} className="text-danger-500" />}
            title="Alert Thresholds"
            subtitle="Trigger boundaries that activate network warning notifications"
          >
            <NumberRow
              id="prefs-latency-threshold"
              label="Latency Alert Threshold"
              description="Notify when average ping response exceeds this value"
              value={prefs.latencyAlertThresholdMs}
              min={10}
              max={500}
              step={5}
              unit="ms"
              onChange={p('latencyAlertThresholdMs')}
            />
            <NumberRow
              id="prefs-packet-loss-threshold"
              label="Packet Loss Alert Threshold"
              description="Trigger warning when packet drop rate exceeds this value"
              value={prefs.packetLossAlertPct}
              min={1}
              max={50}
              unit="%"
              onChange={p('packetLossAlertPct')}
            />
            <NumberRow
              id="prefs-jitter-threshold"
              label="Jitter Alert Threshold"
              description="Fire alert when ping variance (jitter) exceeds this value"
              value={prefs.jitterAlertThresholdMs}
              min={1}
              max={100}
              unit="ms"
              onChange={p('jitterAlertThresholdMs')}
            />
          </PrefSection>

          {/* Units */}
          <PrefSection
            icon={<Ruler size={16} className="text-sky-500" />}
            title="Display Units"
            subtitle="Units used across metric cards, charts, and export data"
          >
            <SelectRow
              id="prefs-latency-unit"
              label="Latency Display Unit"
              description="Unit for ping and jitter values throughout the app"
              value={prefs.latencyUnit}
              options={[
                { value: 'ms', label: 'Milliseconds (ms)' },
                { value: 'auto', label: 'Auto (adaptive)' }
              ]}
              onChange={p('latencyUnit')}
            />
            <SelectRow
              id="prefs-bandwidth-unit"
              label="Bandwidth Display Unit"
              description="Unit for upload/download throughput values"
              value={prefs.bandwidthUnit}
              options={[
                { value: 'Mbps', label: 'Megabits per second (Mbps)' },
                { value: 'MB/s', label: 'Megabytes per second (MB/s)' },
                { value: 'auto', label: 'Auto (adaptive)' }
              ]}
              onChange={p('bandwidthUnit')}
            />
          </PrefSection>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">
          {/* Notifications */}
          <PrefSection
            icon={<Bell size={16} className="text-accent-500" />}
            title="Notification Preferences"
            subtitle="Control which system events produce OS-level notifications"
          >
            <ToggleRow
              id="prefs-system-alerts"
              label="Enable System Alerts"
              description="Show Windows native desktop notification banners for network events"
              checked={prefs.enableSystemAlerts}
              onChange={p('enableSystemAlerts')}
            />
            <ToggleRow
              id="prefs-sound-chimes"
              label="Audible Alert Chimes"
              description="Play a subtle chime when critical network events are detected"
              checked={prefs.enableSoundChimes}
              onChange={p('enableSoundChimes')}
            />
            <ToggleRow
              id="prefs-autotune-notif"
              label="Auto-Tune Execution Logs"
              description="Notify when background AI rule engine applies automatic socket tuning"
              checked={prefs.enableAutoTuneNotif}
              onChange={p('enableAutoTuneNotif')}
            />
            <ToggleRow
              id="prefs-alert-disconnect"
              label="Alert on Disconnection"
              description="Immediately notify when the Wi-Fi adapter loses its SSID association"
              checked={prefs.alertOnDisconnect}
              onChange={p('alertOnDisconnect')}
            />
            <ToggleRow
              id="prefs-alert-latency"
              label="Alert on Latency Spike"
              description="Trigger notification when ping exceeds the configured threshold above"
              checked={prefs.alertOnLatencySpike}
              onChange={p('alertOnLatencySpike')}
            />
          </PrefSection>

          {/* Startup & Behavior */}
          <PrefSection
            icon={<Settings size={16} className="text-violet-500" />}
            title="Startup & Application Behavior"
            subtitle="Control how SmartWiFi AI starts up and runs in the background"
          >
            <ToggleRow
              id="prefs-launch-login"
              label="Launch at Login"
              description="Automatically start SmartWiFi AI when Windows boots"
              checked={prefs.launchAtLogin}
              onChange={p('launchAtLogin')}
            />
            <ToggleRow
              id="prefs-minimize-tray"
              label="Minimize to System Tray"
              description="Keep app running in the background tray when the window is closed"
              checked={prefs.minimizeToTray}
              onChange={p('minimizeToTray')}
            />
            <ToggleRow
              id="prefs-auto-refresh"
              label="Auto-Refresh Dashboard"
              description="Continuously update dashboard metric cards without manual reload"
              checked={prefs.autoRefreshDashboard}
              onChange={p('autoRefreshDashboard')}
            />
            <ToggleRow
              id="prefs-remember-page"
              label="Remember Last Page"
              description="Reopen the same page that was active when the app was closed"
              checked={prefs.rememberLastPage}
              onChange={p('rememberLastPage')}
            />
          </PrefSection>

          {/* Display */}
          <PrefSection
            icon={<MonitorSmartphone size={16} className="text-emerald-500" />}
            title="Display & Visual Settings"
            subtitle="Chart style, UI density, and animation preferences"
          >
            <SelectRow
              id="prefs-density"
              label="Interface Density"
              description="Controls spacing and padding density throughout the app"
              value={prefs.displayDensity}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable (default)' },
                { value: 'spacious', label: 'Spacious' }
              ]}
              onChange={p('displayDensity')}
            />
            <SelectRow
              id="prefs-chart-style"
              label="Default Chart Style"
              description="Visual rendering style for all network metric charts"
              value={prefs.chartStyle}
              options={[
                { value: 'area', label: 'Filled Area Chart' },
                { value: 'line', label: 'Line Chart' },
                { value: 'bar', label: 'Bar Chart' }
              ]}
              onChange={p('chartStyle')}
            />
            <ToggleRow
              id="prefs-animations"
              label="Enable UI Animations"
              description="Smooth micro-animations for transitions, toasts, and card reveals"
              checked={prefs.showAnimations}
              onChange={p('showAnimations')}
            />
            <ToggleRow
              id="prefs-sidebar-collapsed"
              label="Sidebar Collapsed by Default"
              description="Start the app with the navigation sidebar in collapsed icon-only mode"
              checked={prefs.sidebarCollapsedByDefault}
              onChange={p('sidebarCollapsedByDefault')}
            />
          </PrefSection>

          {/* Export Defaults */}
          <PrefSection
            icon={<Download size={16} className="text-amber-500" />}
            title="Export Defaults"
            subtitle="Default settings for history and report export operations"
          >
            <SelectRow
              id="prefs-export-format"
              label="Default Export Format"
              description="Format used when exporting history or diagnostic reports"
              value={prefs.defaultExportFormat}
              options={[
                { value: 'json', label: 'JSON (structured)' },
                { value: 'csv', label: 'CSV (spreadsheet)' }
              ]}
              onChange={p('defaultExportFormat')}
            />
            <ToggleRow
              id="prefs-export-timestamps"
              label="Include Timestamps in Export"
              description="Append ISO-8601 timestamps to each row in exported data files"
              checked={prefs.includeTimestampsInExport}
              onChange={p('includeTimestampsInExport')}
            />
          </PrefSection>
        </div>
      </div>

      {/* ── 3. Bottom Save / Reset Bar (sticky convenience) ── */}
      {isDirty && (
        <div className="sticky bottom-4 z-10">
          <div className="mx-auto max-w-xl flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-[var(--bg-card)] border border-primary-500/40 shadow-xl backdrop-blur-sm">
            <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse flex-shrink-0" />
              You have unsaved preference changes
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Discard
              </Button>
              <Button
                id="prefs-save-bottom"
                variant="primary"
                size="sm"
                leftIcon={<Save size={14} />}
                onClick={handleSave}
              >
                Save Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
