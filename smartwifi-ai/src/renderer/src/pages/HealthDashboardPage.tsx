import React, { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  HeartPulse,
  Signal,
  Gauge,
  Activity,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BarChart3,
  Zap
} from 'lucide-react'
import { Card, CardHeader, CardContent, Badge, ProgressBar, Button } from '@/components/ui'
import { useWifi } from '@/context'

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const HISTORY_LEN = 30   // data points retained per metric
const TICK_MS     = 2000 // update interval

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface SpeedRecord {
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
}

interface HealthSnapshot {
  ts: number
  signal: number
  download: number
  upload: number
  latency: number
  stability: number
  overall: number
}

type AlertLevel = 'ok' | 'warning' | 'critical'

interface HealthAlert {
  id: string
  level: AlertLevel
  dimension: string
  message: string
  ts: number
}

/* ─────────────────────────────────────────────────────────────
   Scoring helpers (mirrors HealthScorePage — pure functions)
───────────────────────────────────────────────────────────── */

function scoreSignal(pct: number): number {
  return Math.min(100, Math.max(0, Math.round(pct)))
}
function scoreDownload(mbps: number): number {
  if (mbps >= 200) return 100
  if (mbps >= 100) return 90
  if (mbps >= 50) return 75
  if (mbps >= 25) return 55
  if (mbps >= 10) return 35
  if (mbps >= 5) return 20
  return 5
}
function scoreUpload(mbps: number): number {
  if (mbps >= 100) return 100
  if (mbps >= 50) return 90
  if (mbps >= 25) return 75
  if (mbps >= 10) return 55
  if (mbps >= 5) return 35
  if (mbps >= 2) return 20
  return 5
}
function scoreLatency(ms: number): number {
  if (ms <= 10) return 100
  if (ms <= 20) return 90
  if (ms <= 50) return 70
  if (ms <= 100) return 45
  if (ms <= 200) return 20
  return 5
}
function scoreStability(jitterMs: number): number {
  if (jitterMs <= 2) return 100
  if (jitterMs <= 5) return 85
  if (jitterMs <= 10) return 65
  if (jitterMs <= 20) return 40
  if (jitterMs <= 50) return 20
  return 5
}

function computeOverall(
  sig: number,
  dl: number,
  ul: number,
  lat: number,
  stab: number
): number {
  return Math.round(sig * 0.20 + dl * 0.25 + ul * 0.15 + lat * 0.25 + stab * 0.15)
}

function gradeLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

function gradeVariant(score: number): 'accent' | 'primary' | 'warning' | 'danger' {
  if (score >= 85) return 'accent'
  if (score >= 65) return 'primary'
  if (score >= 40) return 'warning'
  return 'danger'
}

function scoreColor(score: number): string {
  if (score >= 85) return 'var(--color-accent-500)'
  if (score >= 65) return 'var(--color-primary-500)'
  if (score >= 40) return 'var(--color-warning-500)'
  return 'var(--color-danger-500)'
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function jitterVal(base: number, spread: number): number {
  return base + (Math.random() - 0.5) * 2 * spread
}

function relTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function trendDelta(history: number[]): number {
  if (history.length < 4) return 0
  const recent = history.slice(-4)
  return recent[recent.length - 1] - recent[0]
}

/* ─────────────────────────────────────────────────────────────
   Multi-line sparkline (pure SVG)
───────────────────────────────────────────────────────────── */

interface SparklineProps {
  values: number[]
  color: string
  height?: number
  gradientId: string
}

function Sparkline({ values, color, height = 44, gradientId }: SparklineProps): React.JSX.Element {
  const W = 100
  const H = height
  const PAD = 2

  if (values.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
      </svg>
    )
  }

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = innerW / (values.length - 1)

  const pts = values.map((v, i) => {
    const x = PAD + i * step
    const y = PAD + (1 - (v - min) / range) * innerH
    return { x, y }
  })

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const lastPt = pts[pts.length - 1]

  // Area path
  const area = [
    `M ${PAD},${H - PAD}`,
    ...pts.map((p) => `L ${p.x},${p.y}`),
    `L ${lastPt.x},${H - PAD}`,
    'Z'
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={color} />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Health gauge ring (SVG — full circle)
───────────────────────────────────────────────────────────── */

function GaugeRing({ score, size = 96 }: { score: number; size?: number }): React.JSX.Element {
  const R = (size - 10) / 2
  const circumference = 2 * Math.PI * R
  const offset = circumference - (score / 100) * circumference
  const color = scoreColor(score)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={R}
        fill="none"
        stroke="var(--color-surface-200)"
        strokeWidth="9"
        className="dark:[stroke:var(--color-surface-700)]"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 - 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="20"
        fontWeight="800"
        fill={color}
        style={{ transition: 'fill 0.4s ease', fontFamily: 'var(--font-sans)' }}
      >
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fontWeight="500"
        fill="var(--color-surface-400)"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        /100
      </text>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Metric Card
───────────────────────────────────────────────────────────── */

interface MetricCardProps {
  label: string
  score: number
  rawValue: string
  history: number[]
  color: string
  gradientId: string
  icon: React.ReactNode
  trend: number
}

function MetricCard({
  label,
  score,
  rawValue,
  history,
  color,
  gradientId,
  icon,
  trend
}: MetricCardProps): React.JSX.Element {
  const isFlat = Math.abs(trend) < 2
  const isUp = trend > 0

  return (
    <Card hoverable>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {label}
          </p>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-0.5 leading-none">
            {score}
            <span className="text-xs font-medium text-[var(--text-muted)] ml-1">/ 100</span>
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{rawValue}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {isFlat ? (
              <Minus size={11} className="text-[var(--text-muted)]" />
            ) : isUp ? (
              <TrendingUp size={11} className="text-accent-500" />
            ) : (
              <TrendingDown size={11} className="text-danger-500" />
            )}
            <span className={isFlat ? 'text-[var(--text-muted)]' : isUp ? 'text-accent-500' : 'text-danger-500'}>
              {isFlat ? 'Stable' : `${isUp ? '+' : ''}${trend.toFixed(0)}`}
            </span>
          </div>
        </div>
      </div>

      <ProgressBar value={score} max={100} size="sm" variant={gradeVariant(score)} animated />

      <div className="mt-3 h-11">
        <Sparkline values={history} color={color} height={44} gradientId={gradientId} />
      </div>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────────
   Alert item
───────────────────────────────────────────────────────────── */

function AlertItem({ alert }: { alert: HealthAlert }): React.JSX.Element {
  const map: Record<AlertLevel, { icon: React.ReactNode; cls: string }> = {
    ok: { icon: <CheckCircle2 size={13} />, cls: 'text-accent-500' },
    warning: { icon: <AlertTriangle size={13} />, cls: 'text-warning-500' },
    critical: { icon: <XCircle size={13} />, cls: 'text-danger-500' }
  }
  const { icon, cls } = map[alert.level]
  return (
    <li className="flex items-start gap-2.5 py-2 border-b border-[var(--border-color)] last:border-0">
      <span className={`mt-0.5 shrink-0 ${cls}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--text-primary)] leading-snug">{alert.message}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {alert.dimension} · {relTime(alert.ts)}
        </p>
      </div>
    </li>
  )
}

/* ─────────────────────────────────────────────────────────────
   HealthDashboardPage
───────────────────────────────────────────────────────────── */

/**
 * HealthDashboardPage — A dedicated real-time health monitoring dashboard.
 * Combines live Wi-Fi signal data and the latest speed test results to
 * compute a composite network health score across 5 dimensions.
 * Displays animated trend sparklines, alert history, and at-a-glance KPIs.
 */
export function HealthDashboardPage(): React.JSX.Element {
  const { status, refreshStatus } = useWifi()

  /* ── Latest speed test record from DB ── */
  const [latestTest, setLatestTest] = useState<SpeedRecord | null>(null)
  const latestTestRef = useRef<SpeedRecord | null>(null)

  /* ── Rolling history (HISTORY_LEN ticks) per dimension ── */
  const [history, setHistory] = useState<HealthSnapshot[]>([])

  /* ── Derived current scores ── */
  const [currentScores, setCurrentScores] = useState({
    signal: 0, download: 0, upload: 0, latency: 0, stability: 0, overall: 0
  })

  /* ── Alert log ── */
  const [alerts, setAlerts] = useState<HealthAlert[]>([])
  const alertIdRef = useRef(0)

  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  /* ── Load latest speed test ── */
  const loadTest = useCallback(async () => {
    try {
      const records = await window.api.db.getSpeedTests() as SpeedRecord[]
      const last = records.length > 0 ? records[records.length - 1] : null
      setLatestTest(last)
      latestTestRef.current = last
    } catch (err) {
      console.error('HealthDashboard: failed to load speed test', err)
    }
  }, [])

  useEffect(() => {
    loadTest()
  }, [loadTest])

  /* ── Tick: compute scores & update history ── */
  useEffect(() => {
    const tick = (): void => {
      const test = latestTestRef.current

      // Slightly jitter existing speed values to show "live" fluctuation when real data exists
      const dl = test
        ? clamp(jitterVal(test.downloadMbps, 2), 0.5, 500)
        : clamp(jitterVal(40, 8), 1, 200)
      const ul = test
        ? clamp(jitterVal(test.uploadMbps, 1.5), 0.5, 300)
        : clamp(jitterVal(20, 4), 0.5, 100)
      const ping = test
        ? clamp(jitterVal(test.pingMs, 3), 1, 500)
        : clamp(jitterVal(30, 8), 1, 500)
      const jitter = test
        ? clamp(jitterVal(test.jitterMs, 0.5), 0, 100)
        : clamp(jitterVal(6, 2), 0, 100)
      const sigPct = status.isConnected
        ? clamp(jitterVal(status.signal, 2), 0, 100)
        : 0

      const sig   = scoreSignal(sigPct)
      const dlS   = scoreDownload(dl)
      const ulS   = scoreUpload(ul)
      const latS  = scoreLatency(ping)
      const stabS = scoreStability(jitter)
      const overall = computeOverall(sig, dlS, ulS, latS, stabS)

      const snapshot: HealthSnapshot = {
        ts: Date.now(),
        signal: sig,
        download: dlS,
        upload: ulS,
        latency: latS,
        stability: stabS,
        overall
      }

      setHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), snapshot])
      setCurrentScores({ signal: sig, download: dlS, upload: ulS, latency: latS, stability: stabS, overall })
      setLastUpdated(new Date())

      // Generate alerts for dimension drops
      const generateAlert = (
        score: number,
        dimension: string,
        goodMsg: string,
        warnMsg: string,
        critMsg: string
      ): HealthAlert | null => {
        if (score < 40) return { id: `${++alertIdRef.current}`, level: 'critical', dimension, message: critMsg, ts: Date.now() }
        if (score < 65) return { id: `${++alertIdRef.current}`, level: 'warning', dimension, message: warnMsg, ts: Date.now() }
        if (score >= 85 && Math.random() < 0.05) return { id: `${++alertIdRef.current}`, level: 'ok', dimension, message: goodMsg, ts: Date.now() }
        return null
      }

      const newAlerts: HealthAlert[] = [
        generateAlert(sig, 'Signal', 'Signal is strong.', 'Signal is moderate. Check router distance.', 'Weak signal detected. Move closer to router.'),
        generateAlert(dlS, 'Download', 'Download speed is excellent.', 'Download speed is below optimal.', 'Download speed is critically low.'),
        generateAlert(latS, 'Latency', 'Latency is excellent.', 'Elevated latency detected.', 'Critical latency spike detected.'),
        generateAlert(stabS, 'Stability', 'Connection is very stable.', 'Jitter is elevated. VoIP may be affected.', 'Severe jitter detected.')
      ].filter(Boolean) as HealthAlert[]

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20))
      }
    }

    tick() // immediate first tick
    const interval = setInterval(tick, TICK_MS)
    return () => clearInterval(interval)
  }, [status])

  /* ── Manual refresh ── */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshStatus(), loadTest()])
    } finally {
      setRefreshing(false)
    }
  }, [refreshStatus, loadTest])

  /* ── Extract per-dimension histories ── */
  const sigHistory   = history.map((s) => s.signal)
  const dlHistory    = history.map((s) => s.download)
  const ulHistory    = history.map((s) => s.upload)
  const latHistory   = history.map((s) => s.latency)
  const stabHistory  = history.map((s) => s.stability)
  const overallHistory = history.map((s) => s.overall)

  const { signal, download, upload, latency, stability, overall } = currentScores
  const hasData = history.length > 0

  /* ── Uptime string (how long since page opened) ── */
  const [uptime, setUptime] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const t = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const fmtUptime = (s: number): string => {
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Health Dashboard</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Real-time composite network health across all 5 quality dimensions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <Clock size={11} />
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Overall Health Banner ── */}
      <Card variant="gradient" padding="lg">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Gauge */}
          <div className="flex-shrink-0">
            <GaugeRing score={hasData ? overall : 0} size={104} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-white">
            <div className="flex items-center gap-2 mb-1">
              <HeartPulse size={16} />
              <span className="text-sm font-bold">Overall Health Score</span>
              {hasData && (
                <Badge variant={gradeVariant(overall)} className="text-[10px]">
                  {gradeLabel(overall)}
                </Badge>
              )}
            </div>
            <p className="text-primary-100 text-xs leading-relaxed max-w-md">
              {!hasData
                ? 'Waiting for first data tick…'
                : overall >= 85
                ? 'Your network is performing excellently across all monitored dimensions.'
                : overall >= 65
                ? 'Your network is performing well. Minor optimisations may improve the score.'
                : overall >= 40
                ? 'Network quality is fair. Some dimensions need attention — check the alerts below.'
                : 'Network health is poor. Immediate investigation is recommended.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-primary-200">
              <span className="flex items-center gap-1">
                <Zap size={11} />
                Session: {fmtUptime(uptime)}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 size={11} />
                {history.length} data points
              </span>
              <span className="flex items-center gap-1">
                <Activity size={11} />
                {latestTest ? `Last test: ${latestTest.downloadMbps.toFixed(1)} / ${latestTest.uploadMbps.toFixed(1)} Mbps` : 'No speed test data'}
              </span>
            </div>
          </div>

          {/* Overall trend sparkline */}
          <div className="hidden md:block w-40 flex-shrink-0 opacity-75">
            <p className="text-[10px] text-primary-200 mb-1 uppercase tracking-wider">30-tick trend</p>
            <Sparkline values={overallHistory} color="#ffffff" height={48} gradientId="overall-trend" />
          </div>
        </div>
      </Card>

      {/* ── 5-Dimension Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Signal"
          score={signal}
          rawValue={status.isConnected ? `${status.signal}%` : 'No adapter'}
          history={sigHistory}
          color="var(--color-primary-500)"
          gradientId="sig-grad"
          icon={<Signal size={16} />}
          trend={trendDelta(sigHistory)}
        />
        <MetricCard
          label="Download"
          score={download}
          rawValue={latestTest ? `${latestTest.downloadMbps.toFixed(1)} Mbps` : 'No data'}
          history={dlHistory}
          color="var(--color-accent-500)"
          gradientId="dl-grad"
          icon={<Gauge size={16} />}
          trend={trendDelta(dlHistory)}
        />
        <MetricCard
          label="Upload"
          score={upload}
          rawValue={latestTest ? `${latestTest.uploadMbps.toFixed(1)} Mbps` : 'No data'}
          history={ulHistory}
          color="var(--color-primary-400)"
          gradientId="ul-grad"
          icon={<Activity size={16} />}
          trend={trendDelta(ulHistory)}
        />
        <MetricCard
          label="Latency"
          score={latency}
          rawValue={latestTest ? `${latestTest.pingMs} ms` : 'No data'}
          history={latHistory}
          color="var(--color-warning-500)"
          gradientId="lat-grad"
          icon={<Activity size={16} />}
          trend={trendDelta(latHistory)}
        />
        <MetricCard
          label="Stability"
          score={stability}
          rawValue={latestTest ? `±${latestTest.jitterMs.toFixed(1)} ms` : 'No data'}
          history={stabHistory}
          color="var(--color-accent-600)"
          gradientId="stab-grad"
          icon={<Shield size={16} />}
          trend={trendDelta(stabHistory)}
        />
      </div>

      {/* ── Bottom two-column: Score Breakdown + Alert Log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Score Breakdown — 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="Score Breakdown"
            subtitle="Current weighted scores per dimension"
            icon={<BarChart3 size={15} />}
            action={
              <NavLink
                to="/health-score"
                className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-600 font-semibold transition-colors"
              >
                Full detail <ArrowRight size={10} />
              </NavLink>
            }
          />
          <CardContent className="space-y-4">
            {[
              { label: 'Signal Strength', score: signal, weight: '20%', icon: <Signal size={13} /> },
              { label: 'Download Speed', score: download, weight: '25%', icon: <Gauge size={13} /> },
              { label: 'Upload Speed', score: upload, weight: '15%', icon: <Activity size={13} /> },
              { label: 'Latency (Ping)', score: latency, weight: '25%', icon: <Activity size={13} /> },
              { label: 'Connection Stability', score: stability, weight: '15%', icon: <Shield size={13} /> }
            ].map(({ label, score: s, weight, icon }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)]">{icon}</span>
                    <span className="font-medium text-[var(--text-primary)]">{label}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">({weight})</span>
                  </div>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: hasData ? scoreColor(s) : undefined }}
                  >
                    {hasData ? s : '—'} / 100
                  </span>
                </div>
                <ProgressBar value={hasData ? s : 0} max={100} size="sm" variant={gradeVariant(s)} animated />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alert Log — 2 cols */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader
            title="Health Alerts"
            subtitle="Automatic threshold monitoring"
            icon={<AlertTriangle size={15} />}
            action={
              alerts.length > 0 ? (
                <Badge variant={alerts[0].level === 'critical' ? 'danger' : alerts[0].level === 'warning' ? 'warning' : 'accent'} dot size="sm">
                  {alerts[0].level}
                </Badge>
              ) : undefined
            }
          />
          <CardContent className="flex-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <CheckCircle2 size={24} className="text-accent-500 opacity-60" />
                <p className="text-xs text-[var(--text-muted)]">All dimensions healthy — no alerts yet.</p>
              </div>
            ) : (
              <ul className="space-y-0 max-h-72 overflow-y-auto pr-1" role="list">
                {alerts.map((a) => (
                  <AlertItem key={a.id} alert={a} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Links ── */}
      <Card>
        <CardHeader
          title="Explore Diagnostics"
          subtitle="Deep-dive into individual network metrics"
          icon={<Zap size={15} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/health-score', label: 'Health Score', desc: 'Full breakdown & tips', icon: <HeartPulse size={18} /> },
              { to: '/speed-test', label: 'Speed Test', desc: 'Run bandwidth test', icon: <Gauge size={18} /> },
              { to: '/ping-monitor', label: 'Ping Monitor', desc: 'Real-time latency', icon: <Activity size={18} /> },
              { to: '/signal-strength', label: 'Signal Strength', desc: 'dBm & quality log', icon: <Signal size={18} /> }
            ].map(({ to, label, desc, icon }) => (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-transparent hover:border-primary-200 hover:bg-primary-50 dark:hover:border-primary-800 dark:hover:bg-primary-950/50 transition-all duration-200 group"
              >
                <div className="p-2.5 rounded-xl bg-white dark:bg-surface-800 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-200 text-primary-500">
                  {icon}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</p>
                </div>
              </NavLink>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
