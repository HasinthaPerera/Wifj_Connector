import { useState } from 'react'
import {
  Settings,
  Shield,
  Bell,
  RefreshCw,
  Palette,
  Database,
  Clock,
  ChevronDown
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, ThemeManagerPanel } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Local toggle for general preferences
───────────────────────────────────────────────────────────── */

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  description: string
  active: boolean
  onToggle: () => void
  id: string
}

function ToggleRow({
  icon,
  label,
  description,
  active,
  onToggle,
  id
}: ToggleRowProps): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-color)] last:border-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)]">{icon}</div>
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>
        </div>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={active}
        onClick={onToggle}
        className={`
          relative flex-shrink-0 mt-0.5
          w-9 h-5 rounded-full cursor-pointer
          transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          ${active ? 'bg-primary-500' : 'bg-surface-200 dark:bg-surface-700'}
        `.trim()}
        aria-label={`${active ? 'Disable' : 'Enable'} ${label}`}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm
            transition-transform duration-200
            ${active ? 'translate-x-4' : 'translate-x-0'}
          `.trim()}
        />
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Interval selector row
───────────────────────────────────────────────────────────── */

interface IntervalRowProps {
  label: string
  value: number
  options: { value: number; label: string }[]
  onChange: (v: number) => void
  id: string
}

function IntervalRow({ label, value, options, onChange, id }: IntervalRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-color)] last:border-0">
      <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="
            appearance-none pr-6 pl-2.5 py-1 rounded-lg text-xs font-medium
            bg-[var(--bg-input)] border border-[var(--border-color)]
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
          className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Settings Page
───────────────────────────────────────────────────────────── */

export function SettingsPage(): React.JSX.Element {
  // General preferences state (local — would wire to IPC in production)
  const [alerts, setAlerts] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [startOnBoot, setStartOnBoot] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [retentionDays, setRetentionDays] = useState(30)

  const refreshOptions = [
    { value: 10, label: '10 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' }
  ]

  const retentionOptions = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' }
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Application Settings</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Manage appearance, alerts, refresh behaviour, and data retention
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Appearance & Theme ─────────────────────────── */}
        <Card padding="md">
          <CardHeader
            title="Appearance &amp; Theme"
            subtitle="Customise look, feel, and accent colour"
            icon={<Palette size={15} />}
          />
          <CardContent>
            <ThemeManagerPanel inline />
          </CardContent>
        </Card>

        {/* ── Right column ───────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {/* General Preferences */}
          <Card padding="md">
            <CardHeader
              title="General Preferences"
              subtitle="Notifications and startup behaviour"
              icon={<Shield size={15} />}
            />
            <CardContent className="divide-y-0">
              <ToggleRow
                id="settings-toggle-alerts"
                icon={<Bell size={14} />}
                label="System Alerts"
                description="Show native notifications for network events"
                active={alerts}
                onToggle={() => setAlerts((v) => !v)}
              />
              <ToggleRow
                id="settings-toggle-autorefresh"
                icon={<RefreshCw size={14} />}
                label="Auto Refresh"
                description="Automatically poll network statistics"
                active={autoRefresh}
                onToggle={() => setAutoRefresh((v) => !v)}
              />
              <ToggleRow
                id="settings-toggle-startup"
                icon={<Settings size={14} />}
                label="Launch at Login"
                description="Start SmartWiFi AI when you log in"
                active={startOnBoot}
                onToggle={() => setStartOnBoot((v) => !v)}
              />
            </CardContent>
          </Card>

          {/* Data & Refresh Intervals */}
          <Card padding="md">
            <CardHeader
              title="Monitoring &amp; Data"
              subtitle="Refresh frequency and history retention"
              icon={<Database size={15} />}
            />
            <CardContent>
              <IntervalRow
                id="settings-refresh-interval"
                label="Refresh Interval"
                value={refreshInterval}
                options={refreshOptions}
                onChange={setRefreshInterval}
              />
              <IntervalRow
                id="settings-retention-days"
                label="Data Retention"
                value={retentionDays}
                options={retentionOptions}
                onChange={setRetentionDays}
              />
              <div className="pt-3 flex items-center gap-2 text-[var(--text-muted)]">
                <Clock size={12} />
                <span className="text-[11px]">
                  Historical data older than {retentionDays} days will be purged automatically.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card padding="md" variant="outlined">
            <CardHeader
              title="Reset &amp; Clear"
              subtitle="Irreversible actions — proceed with caution"
              icon={<Shield size={15} />}
            />
            <CardContent className="flex flex-wrap gap-2">
              <Button id="settings-clear-history" variant="ghost" size="sm">
                Clear History
              </Button>
              <Button id="settings-reset-prefs" variant="ghost" size="sm">
                Reset Preferences
              </Button>
              <Button id="settings-clear-cache" variant="danger" size="sm">
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
