import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Wifi,
  Activity,
  Gauge,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Signal,
  Clock,
  Brain,
  Wrench,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react'
import { Card, CardHeader, CardContent, Badge, ProgressBar, StatCard } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Simulated network state (replaced by Electron IPC later)
───────────────────────────────────────────────────────────── */

interface NetworkState {
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  signalDbm: number
  signalPercent: number
  ssid: string
  bssid: string
  ipAddress: string
  gateway: string
  dns: string
  security: string
  channel: number
  band: string
  linkSpeedMbps: number
  isConnected: boolean
  // Health sub-scores 0–100
  healthOverall: number
  healthSignal: number
  healthStability: number
  healthSpeed: number
  healthLatency: number
  healthSecurity: number
}

/** Clamp a number to [min, max] */
const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max)

/** Add random jitter to a value */
const jitter = (base: number, spread: number): number => base + (Math.random() - 0.5) * 2 * spread

const INITIAL_STATE: NetworkState = {
  downloadMbps: 87.4,
  uploadMbps: 42.1,
  pingMs: 18,
  signalDbm: -52,
  signalPercent: 78,
  ssid: 'HomeNetwork_5G',
  bssid: 'A4:C3:F0:8B:2E:11',
  ipAddress: '192.168.1.105',
  gateway: '192.168.1.1',
  dns: '8.8.8.8, 8.8.4.4',
  security: 'WPA3-Personal',
  channel: 36,
  band: '5 GHz',
  linkSpeedMbps: 866,
  isConnected: true,
  healthOverall: 82,
  healthSignal: 78,
  healthStability: 91,
  healthSpeed: 85,
  healthLatency: 88,
  healthSecurity: 95
}

/* ─────────────────────────────────────────────────────────────
   Ping history sparkline (last 24 readings)
───────────────────────────────────────────────────────────── */

const SPARKLINE_SIZE = 24

function generateInitialPingHistory(): number[] {
  return Array.from({ length: SPARKLINE_SIZE }, () => clamp(jitter(22, 12), 5, 120))
}

/* ─────────────────────────────────────────────────────────────
   Recent events feed
───────────────────────────────────────────────────────────── */

interface NetworkEvent {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
  ts: number
}

const INITIAL_EVENTS: NetworkEvent[] = [
  {
    id: 'e1',
    type: 'success',
    message: 'Connected to HomeNetwork_5G (5 GHz)',
    ts: Date.now() - 1000 * 60 * 4
  },
  {
    id: 'e2',
    type: 'info',
    message: 'DNS resolved via 8.8.8.8 in 12 ms',
    ts: Date.now() - 1000 * 60 * 9
  },
  {
    id: 'e3',
    type: 'warning',
    message: 'Packet loss spike: 3.2% on last interval',
    ts: Date.now() - 1000 * 60 * 18
  },
  {
    id: 'e4',
    type: 'success',
    message: 'Speed test completed — 87.4 / 42.1 Mbps',
    ts: Date.now() - 1000 * 60 * 32
  },
  {
    id: 'e5',
    type: 'info',
    message: 'Gateway 192.168.1.1 responded in 1 ms',
    ts: Date.now() - 1000 * 60 * 55
  }
]

/* ─────────────────────────────────────────────────────────────
   Formatting helpers
───────────────────────────────────────────────────────────── */

function fmtMbps(v: number): string {
  return v >= 100 ? `${Math.round(v)}` : v.toFixed(1)
}

function fmtMs(v: number): string {
  return `${Math.round(v)}`
}

function relTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

/* ─────────────────────────────────────────────────────────────
   Circular health score ring (pure SVG)
───────────────────────────────────────────────────────────── */

interface HealthRingProps {
  score: number // 0–100
  size?: number
  strokeWidth?: number
}

function HealthRing({ score, size = 120, strokeWidth = 10 }: HealthRingProps): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const ringColor =
    score >= 80 ? '#10b981' : score >= 60 ? '#6366f1' : score >= 40 ? '#f59e0b' : '#ef4444'

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
  const labelColor =
    score >= 80
      ? 'text-accent-500'
      : score >= 60
        ? 'text-primary-500'
        : score >= 40
          ? 'text-warning-500'
          : 'text-danger-500'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-surface-100 dark:text-surface-800"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-[var(--text-primary)]">{score}</span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">/ 100</span>
        </div>
      </div>
      <span className={`text-xs font-bold ${labelColor}`}>{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Mini sparkline chart (pure SVG)
───────────────────────────────────────────────────────────── */

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
}

function Sparkline({
  data,
  width = 240,
  height = 56,
  color = '#6366f1'
}: SparklineProps): React.JSX.Element {
  if (data.length < 2) return <></>

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x},${y}`
  })

  const polyline = points.join(' ')

  // Area fill path
  const areaPath = [
    `M ${points[0]}`,
    ...points.slice(1).map((p) => `L ${p}`),
    `L ${width},${height}`,
    `L 0,${height}`,
    'Z'
  ].join(' ')

  const lastY = parseFloat(points[points.length - 1].split(',')[1])
  const lastX = width

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area */}
      <path d={areaPath} fill="url(#spark-fill)" />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest dot */}
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  )
}
/* ─────────────────────────────────────────────────────────────
   Quick action tile
───────────────────────────────────────────────────────────── */

interface QuickActionProps {
  to: string
  icon: React.ReactNode
  label: string
  description: string
  accent?: boolean
}

function QuickAction({
  to,
  icon,
  label,
  description,
  accent = false
}: QuickActionProps): React.JSX.Element {
  return (
    <NavLink
      to={to}
      className="
        flex flex-col items-center gap-2 p-4 rounded-xl
        bg-surface-50 dark:bg-surface-800/50
        border border-transparent
        hover:border-primary-200 hover:bg-primary-50
        dark:hover:border-primary-800 dark:hover:bg-primary-950/50
        transition-all duration-200 group
      "
    >
      <div
        className={`
          p-2.5 rounded-xl shadow-sm
          group-hover:shadow-md group-hover:scale-110
          transition-all duration-200
          ${accent ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-800'}
        `}
      >
        <span className={accent ? '' : 'text-primary-500'}>{icon}</span>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
    </NavLink>
  )
}

/* ─────────────────────────────────────────────────────────────
   Health metric row (label + progress bar)
───────────────────────────────────────────────────────────── */

interface HealthMetricProps {
  label: string
  value: number
}

function HealthMetric({ label, value }: HealthMetricProps): React.JSX.Element {
  const variant: 'accent' | 'primary' | 'warning' | 'danger' =
    value >= 80 ? 'accent' : value >= 60 ? 'primary' : value >= 40 ? 'warning' : 'danger'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
        <span
          className={`text-xs font-bold ${
            variant === 'accent'
              ? 'text-accent-500'
              : variant === 'primary'
                ? 'text-primary-500'
                : variant === 'warning'
                  ? 'text-warning-500'
                  : 'text-danger-500'
          }`}
        >
          {value}%
        </span>
      </div>
      <ProgressBar value={value} variant={variant} size="sm" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Event feed icon
───────────────────────────────────────────────────────────── */

function EventIcon({ type }: { type: NetworkEvent['type'] }): React.JSX.Element {
  switch (type) {
    case 'success':
      return <CheckCircle2 size={13} className="text-accent-500 flex-shrink-0 mt-0.5" />
    case 'warning':
      return <AlertTriangle size={13} className="text-warning-500 flex-shrink-0 mt-0.5" />
    case 'error':
      return <AlertCircle size={13} className="text-danger-500 flex-shrink-0 mt-0.5" />
    default:
      return <Info size={13} className="text-primary-500 flex-shrink-0 mt-0.5" />
  }
}

/* ─────────────────────────────────────────────────────────────
   Info row (label : value pair)
───────────────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-[var(--text-muted)] shrink-0">{label}</span>
      <span className="text-[11px] font-semibold text-[var(--text-primary)] text-right max-w-[55%] truncate">
        {value}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main DashboardPage
───────────────────────────────────────────────────────────── */

function DashboardPage(): React.JSX.Element {
  const [net, setNet] = useState<NetworkState>(INITIAL_STATE)
  const [pingHistory, setPingHistory] = useState<number[]>(generateInitialPingHistory)
  const [events] = useState<NetworkEvent[]>(INITIAL_EVENTS)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [dlTrend, setDlTrend] = useState(0)
  const [pingTrend, setPingTrend] = useState(0)

  /* Simulate live network metrics every 2 s */
  useEffect(() => {
    const interval = setInterval(() => {
      setNet((prev) => {
        const dl = clamp(jitter(prev.downloadMbps, 4), 20, 130)
        const ul = clamp(jitter(prev.uploadMbps, 2.5), 10, 80)
        const ping = clamp(jitter(prev.pingMs, 6), 5, 200)
        const sig = clamp(jitter(prev.signalPercent, 3), 30, 98)
        const sigDbm = Math.round(-100 + sig * 0.7)

        const healthSignal = clamp(Math.round(sig), 0, 100)
        const healthSpeed = clamp(Math.round((dl / 130) * 100), 0, 100)
        const healthLatency = clamp(Math.round(100 - ping * 0.5), 0, 100)
        const healthStability = clamp(jitter(prev.healthStability, 2), 60, 100)
        const healthSecurity = prev.healthSecurity
        const healthOverall = Math.round(
          (healthSignal + healthSpeed + healthLatency + healthStability + healthSecurity) / 5
        )

        // Compute trends against previous tick
        setDlTrend(dl - prev.downloadMbps)
        setPingTrend(prev.pingMs - ping) // positive = latency improved

        return {
          ...prev,
          downloadMbps: dl,
          uploadMbps: ul,
          pingMs: ping,
          signalPercent: Math.round(sig),
          signalDbm: sigDbm,
          healthOverall,
          healthSignal,
          healthStability: Math.round(healthStability),
          healthSpeed,
          healthLatency,
          healthSecurity
        }
      })

      setPingHistory((prev) => {
        const next = [...prev.slice(1)]
        next.push(clamp(jitter(prev[prev.length - 1], 8), 5, 120))
        return next
      })

      setLastUpdated(new Date())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-5">
      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <Card variant="gradient" padding="lg">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white mb-1">Network Dashboard</h1>
            <p className="text-primary-100 text-xs max-w-md leading-relaxed">
              Real-time AI-powered monitoring for{' '}
              <span className="font-semibold text-white">{net.ssid}</span>. Your connection is{' '}
              {net.healthOverall >= 80 ? 'performing excellently' : 'being actively monitored'}.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Badge variant="accent" dot>
              {net.isConnected ? 'Live' : 'Offline'}
            </Badge>
            <span className="text-[10px] text-primary-200 flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </span>
          </div>
        </div>
      </Card>

      {/* ── KPI Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Download"
          value={fmtMbps(net.downloadMbps)}
          unit="Mbps"
          icon={<ArrowDownRight size={18} />}
          trendValue={dlTrend}
          trendLabel={
            Math.abs(dlTrend) < 0.5
              ? 'Stable'
              : `${dlTrend > 0 ? '+' : ''}${dlTrend.toFixed(1)} Mbps`
          }
          colorClass="text-primary-600 dark:text-primary-400"
          bgClass="bg-primary-50 dark:bg-primary-950"
        />
        <StatCard
          title="Upload"
          value={fmtMbps(net.uploadMbps)}
          unit="Mbps"
          icon={<ArrowUpRight size={18} />}
          trendValue={0}
          trendLabel="Stable"
          colorClass="text-accent-600 dark:text-accent-400"
          bgClass="bg-accent-50 dark:bg-accent-950"
        />
        <StatCard
          title="Latency"
          value={fmtMs(net.pingMs)}
          unit="ms"
          icon={<Activity size={18} />}
          trendValue={pingTrend}
          trendLabel={
            Math.abs(pingTrend) < 1
              ? 'Stable'
              : `${pingTrend > 0 ? '↓' : '↑'}${Math.abs(pingTrend).toFixed(0)} ms`
          }
          colorClass="text-warning-600 dark:text-warning-400"
          bgClass="bg-warning-50 dark:bg-warning-950"
        />
        <StatCard
          title="Signal"
          value={`${net.signalPercent}`}
          unit="%"
          icon={<Signal size={18} />}
          trendValue={0}
          trendLabel={`${net.signalDbm} dBm`}
          colorClass="text-primary-600 dark:text-primary-400"
          bgClass="bg-primary-50 dark:bg-primary-950"
        />
      </div>

      {/* ── Main 3-column grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Network Health — 2 cols */}
        <Card className="lg:col-span-2" padding="none">
          <div className="p-5">
            <CardHeader
              title="Network Health"
              subtitle="Composite score from all network parameters"
              icon={<HeartPulse size={15} />}
              action={
                <Badge
                  variant={
                    net.healthOverall >= 80
                      ? 'accent'
                      : net.healthOverall >= 60
                        ? 'primary'
                        : net.healthOverall >= 40
                          ? 'warning'
                          : 'danger'
                  }
                  dot
                  size="sm"
                >
                  {net.healthOverall >= 80
                    ? 'Excellent'
                    : net.healthOverall >= 60
                      ? 'Good'
                      : net.healthOverall >= 40
                        ? 'Fair'
                        : 'Poor'}
                </Badge>
              }
            />
          </div>

          <div className="px-5 pb-5 flex flex-col sm:flex-row items-center gap-8">
            {/* Ring */}
            <div className="flex-shrink-0">
              <HealthRing score={net.healthOverall} size={128} strokeWidth={11} />
            </div>

            {/* Sub-metrics */}
            <div className="flex-1 w-full space-y-3.5">
              <HealthMetric label="Signal Quality" value={net.healthSignal} />
              <HealthMetric label="Connection Stability" value={net.healthStability} />
              <HealthMetric label="Speed Performance" value={net.healthSpeed} />
              <HealthMetric label="Latency Score" value={net.healthLatency} />
              <HealthMetric label="Security Score" value={net.healthSecurity} />
            </div>
          </div>

          {/* Ping sparkline */}
          <div className="px-5 pb-5 border-t border-[var(--border-color)] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Ping History
              </span>
              <span className="text-[11px] font-bold text-primary-500">{fmtMs(net.pingMs)} ms</span>
            </div>
            <div className="w-full overflow-hidden">
              <Sparkline data={pingHistory} width={600} height={52} color="#6366f1" />
            </div>
          </div>
        </Card>

        {/* Connection Info — 1 col */}
        <Card padding="none">
          <div className="p-5">
            <CardHeader
              title="Connection Info"
              subtitle="Active adapter properties"
              icon={<Wifi size={15} />}
              action={
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    net.isConnected ? 'bg-accent-500 animate-pulse-soft' : 'bg-danger-500'
                  }`}
                />
              }
            />
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-0.5 divide-y divide-[var(--border-color)]">
              <InfoRow label="Status" value={net.isConnected ? 'Connected' : 'Disconnected'} />
              <InfoRow label="SSID" value={net.ssid} />
              <InfoRow label="BSSID" value={net.bssid} />
              <InfoRow label="IP Address" value={net.ipAddress} />
              <InfoRow label="Gateway" value={net.gateway} />
              <InfoRow label="DNS" value={net.dns} />
              <InfoRow label="Security" value={net.security} />
              <InfoRow label="Channel / Band" value={`${net.channel} / ${net.band}`} />
              <InfoRow label="Link Speed" value={`${net.linkSpeedMbps} Mbps`} />
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Clock size={10} />
              <span>Refreshes every 2 s</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom 2-column grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick Actions — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Quick Actions"
            subtitle="Jump to common network tasks"
            icon={<Gauge size={15} />}
          />
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction
                to="/speed-test"
                icon={<Gauge size={20} />}
                label="Speed Test"
                description="Measure bandwidth"
                accent
              />
              <QuickAction
                to="/ping-monitor"
                icon={<Activity size={20} />}
                label="Ping Monitor"
                description="Track latency"
              />
              <QuickAction
                to="/ai-diagnosis"
                icon={<Brain size={20} />}
                label="AI Diagnosis"
                description="Detect issues"
              />
              <QuickAction
                to="/optimization"
                icon={<Wrench size={20} />}
                label="Optimization"
                description="Tune settings"
              />
              <QuickAction
                to="/signal-strength"
                icon={<Signal size={20} />}
                label="Signal Scan"
                description="Analyse dBm"
              />
              <QuickAction
                to="/wifi-info"
                icon={<Wifi size={20} />}
                label="Wi-Fi Info"
                description="Adapter details"
              />
              <QuickAction
                to="/health-score"
                icon={<HeartPulse size={20} />}
                label="Health Score"
                description="Full breakdown"
              />
              <QuickAction
                to="/network-info"
                icon={<Shield size={20} />}
                label="Network Info"
                description="LAN topology"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Events — 1 col */}
        <Card>
          <CardHeader
            title="Recent Events"
            subtitle="Latest network activity"
            icon={<Clock size={15} />}
            action={
              <NavLink
                to="/history"
                className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-600 font-semibold transition-colors"
              >
                View all
                <ExternalLink size={10} />
              </NavLink>
            }
          />
          <CardContent>
            <ul className="space-y-3" role="list">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-2.5 items-start">
                  <EventIcon type={ev.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-primary)] leading-snug">{ev.message}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{relTime(ev.ts)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { DashboardPage }
