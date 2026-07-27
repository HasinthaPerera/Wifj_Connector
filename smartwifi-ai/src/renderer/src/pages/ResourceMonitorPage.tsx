import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  RefreshCw,
  Play,
  Square,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  Clock
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge, ProgressBar } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types (mirrors preload d.ts)
───────────────────────────────────────────────────────────── */

interface NetworkIO {
  name: string
  rxBytes: number
  txBytes: number
  rxKbps: number
  txKbps: number
}

interface ResourceSnapshot {
  timestamp: string
  cpuPercent: number
  ramUsedMb: number
  ramTotalMb: number
  ramPercent: number
  cpuCores: number
  cpuModel: string
  diskReadKbps: number
  diskWriteKbps: number
  network: NetworkIO[]
  platform: string
  uptimeSeconds: number
  isSimulated: boolean
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

/** How many samples to keep in the rolling window */
const WINDOW = 60
/** Poll interval while monitoring is active */
const INTERVAL_MS = 2000

/* ─────────────────────────────────────────────────────────────
   Formatters
───────────────────────────────────────────────────────────── */

function fmtMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

function fmtKbps(kbps: number): string {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`
  return `${kbps} KB/s`
}

function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

type MetricVariant = 'accent' | 'primary' | 'warning' | 'danger'

function usageVariant(pct: number): MetricVariant {
  if (pct < 50) return 'accent'
  if (pct < 75) return 'primary'
  if (pct < 90) return 'warning'
  return 'danger'
}

/* ─────────────────────────────────────────────────────────────
   Mini sparkline SVG (shared across metric panels)
───────────────────────────────────────────────────────────── */

interface SparklineProps {
  values: number[]
  color: string
  id: string
  height?: number
}

function Sparkline({ values, color, id, height = 48 }: SparklineProps): React.JSX.Element {
  const W = 300
  const H = height
  const PAD = 3

  if (values.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center text-[10px] text-[var(--text-muted)]"
        style={{ height: H }}
      >
        Collecting…
      </div>
    )
  }

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const min = 0
  const max = Math.max(...values, 1)
  const step = innerW / (values.length - 1)
  const yOf = (v: number): number => PAD + (1 - (v - min) / (max - min)) * innerH

  const pts = values.map((v, i) => `${PAD + i * step},${yOf(v)}`).join(' ')
  const lastX = PAD + (values.length - 1) * step
  const lastY = yOf(values[values.length - 1])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polyline
        points={`${PAD},${H - PAD} ${pts} ${lastX},${H - PAD}`}
        fill={`url(#${id})`}
        stroke="none"
      />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Live dot */}
      <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Metric Panel
   A reusable card section combining a large value + sparkline + ProgressBar.
───────────────────────────────────────────────────────────── */

interface MetricPanelProps {
  title: string
  value: string
  sub: string
  percent: number
  history: number[]
  color: string
  sparkId: string
  icon: React.ReactNode
  variant: MetricVariant
  extra?: React.ReactNode
}

function MetricPanel({
  title,
  value,
  sub,
  percent,
  history,
  color,
  sparkId,
  icon,
  variant,
  extra
}: MetricPanelProps): React.JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        icon={icon}
        action={
          <Badge variant={variant} size="sm" dot>
            {percent}%
          </Badge>
        }
      />
      <CardContent className="flex flex-col gap-3 flex-1">
        {/* Value display */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black tabular-nums leading-none" style={{ color }}>
            {value}
          </span>
          <span className="text-xs text-[var(--text-muted)] pb-0.5">{sub}</span>
        </div>

        {/* Progress bar */}
        <ProgressBar value={percent} max={100} size="md" variant={variant} animated />

        {/* Sparkline */}
        <div className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] overflow-hidden px-2 pt-1">
          <Sparkline values={history} color={color} id={sparkId} height={48} />
        </div>

        {extra && <div className="pt-1">{extra}</div>}
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────────
   Network IO row
───────────────────────────────────────────────────────────── */

function NetworkIORow({ iface }: { iface: NetworkIO }): React.JSX.Element {
  const total = iface.rxKbps + iface.txKbps
  const pct = Math.min(100, Math.round((total / 10240) * 100)) // scale ceiling 10 Mbps

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-primary)]">{iface.name}</span>
        <div className="flex items-center gap-3 font-mono text-[var(--text-secondary)]">
          <span className="flex items-center gap-0.5 text-accent-500">
            <ArrowDown size={10} />
            {fmtKbps(iface.rxKbps)}
          </span>
          <span className="flex items-center gap-0.5 text-primary-500">
            <ArrowUp size={10} />
            {fmtKbps(iface.txKbps)}
          </span>
        </div>
      </div>
      <ProgressBar value={pct} max={100} size="sm" variant="primary" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ResourceMonitorPage
───────────────────────────────────────────────────────────── */

/**
 * ResourceMonitorPage — Live system resource monitoring page.
 * Polls the main process every 2 s for CPU %, RAM %, Disk IO, and Network IO,
 * accumulating 60-sample rolling sparklines for each metric.
 */
export function ResourceMonitorPage(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<ResourceSnapshot | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Rolling history arrays (max WINDOW items each)
  const [cpuHistory,       setCpuHistory]       = useState<number[]>([])
  const [ramHistory,       setRamHistory]        = useState<number[]>([])
  const [diskReadHistory,  setDiskReadHistory]   = useState<number[]>([])
  const [diskWriteHistory, setDiskWriteHistory]  = useState<number[]>([])
  const [netRxHistory,     setNetRxHistory]      = useState<number[]>([])
  const [netTxHistory,     setNetTxHistory]      = useState<number[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  /* ── Fetch one snapshot and append to histories ── */
  const fetchSnapshot = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await window.api.getResources() as ResourceSnapshot
      setSnapshot(snap)
      setLastUpdated(new Date())

      const push = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, val: T) =>
        setter((prev) => [...prev.slice(-(WINDOW - 1)), val])

      push(setCpuHistory,       snap.cpuPercent)
      push(setRamHistory,       snap.ramPercent)
      push(setDiskReadHistory,  snap.diskReadKbps)
      push(setDiskWriteHistory, snap.diskWriteKbps)

      // Sum all network interfaces for global totals
      const totalRx = snap.network.reduce((s, n) => s + n.rxKbps, 0)
      const totalTx = snap.network.reduce((s, n) => s + n.txKbps, 0)
      push(setNetRxHistory, totalRx)
      push(setNetTxHistory, totalTx)
    } catch (err) {
      console.error('[ResourceMonitor] fetch failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Start polling ── */
  const start = useCallback(() => {
    setIsRunning(true)
    fetchSnapshot()
    timerRef.current = setInterval(fetchSnapshot, INTERVAL_MS)
  }, [fetchSnapshot])

  /* ── Stop polling ── */
  const stop = useCallback(() => {
    setIsRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /* ── Manual one-shot refresh ── */
  const refresh = useCallback(() => {
    fetchSnapshot()
  }, [fetchSnapshot])

  /* ── Auto-start and cleanup ── */
  useEffect(() => {
    start()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [start])

  /* ── Derived display values ── */
  const cpuColor  = 'var(--color-primary-500)'
  const ramColor  = 'var(--color-accent-500)'
  const diskColor = 'var(--color-warning-500)'

  const cpuVariant  = snapshot ? usageVariant(snapshot.cpuPercent) : 'primary'
  const ramVariant  = snapshot ? usageVariant(snapshot.ramPercent)  : 'accent'
  const diskPct     = snapshot
    ? Math.min(100, Math.round((snapshot.diskReadKbps + snapshot.diskWriteKbps) / 40960 * 100))
    : 0  // scale ceiling: 40 MB/s
  const diskVariant = usageVariant(diskPct)

  const totalNetKbps = snapshot?.network.reduce((s, n) => s + n.rxKbps + n.txKbps, 0) ?? 0
  const netPct       = Math.min(100, Math.round(totalNetKbps / 10240 * 100)) // 10 Mbps ceiling
  const netVariant: MetricVariant = netPct > 90 ? 'danger' : netPct > 60 ? 'warning' : 'primary'

  const formattedTime = lastUpdated?.toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) ?? '—'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Resource Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Live CPU, RAM, Disk, and Network usage with {WINDOW}-sample rolling charts
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {snapshot?.isSimulated && (
            <span className="text-[10px] text-warning-500 font-semibold italic">simulated data</span>
          )}
          <span className="text-xs text-[var(--text-muted)]">Updated {formattedTime}</span>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={refresh}
            disabled={loading || isRunning}
          >
            Refresh
          </Button>
          {isRunning ? (
            <Button variant="danger" size="sm" leftIcon={<Square size={14} />} onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button variant="primary" size="sm" leftIcon={<Play size={14} />} onClick={start}>
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* ── System info banner ── */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: <Cpu size={13} />,
              label: 'CPU',
              value: snapshot.cpuModel.length > 28 ? snapshot.cpuModel.slice(0, 28) + '…' : snapshot.cpuModel,
              color: cpuColor
            },
            {
              icon: <MemoryStick size={13} />,
              label: 'RAM',
              value: `${fmtMb(snapshot.ramUsedMb)} / ${fmtMb(snapshot.ramTotalMb)}`,
              color: ramColor
            },
            {
              icon: <Clock size={13} />,
              label: 'Uptime',
              value: fmtUptime(snapshot.uptimeSeconds),
              color: 'var(--color-accent-500)'
            },
            {
              icon: <Cpu size={13} />,
              label: 'Threads',
              value: `${snapshot.cpuCores} logical cores`,
              color: cpuColor
            }
          ].map(({ icon, label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card"
            >
              <span style={{ color }}>{icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main metric panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU */}
        <MetricPanel
          title="CPU Usage"
          value={`${snapshot?.cpuPercent ?? 0}%`}
          sub={`${snapshot?.cpuCores ?? 0} cores`}
          percent={snapshot?.cpuPercent ?? 0}
          history={cpuHistory}
          color={cpuColor}
          sparkId="cpu-spark"
          icon={<Cpu size={16} />}
          variant={cpuVariant}
          extra={
            <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--text-muted)]">
              <div>
                <p className="font-semibold uppercase tracking-wider">Peak</p>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {cpuHistory.length > 0 ? Math.max(...cpuHistory) : 0}%
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider">Avg</p>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {cpuHistory.length > 0
                    ? Math.round(cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider">Samples</p>
                <p className="font-mono font-bold text-[var(--text-primary)]">{cpuHistory.length}</p>
              </div>
            </div>
          }
        />

        {/* RAM */}
        <MetricPanel
          title="Memory Usage"
          value={snapshot ? fmtMb(snapshot.ramUsedMb) : '—'}
          sub={snapshot ? `of ${fmtMb(snapshot.ramTotalMb)}` : ''}
          percent={snapshot?.ramPercent ?? 0}
          history={ramHistory}
          color={ramColor}
          sparkId="ram-spark"
          icon={<MemoryStick size={16} />}
          variant={ramVariant}
          extra={
            <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--text-muted)]">
              <div>
                <p className="font-semibold uppercase tracking-wider">Used</p>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {snapshot ? fmtMb(snapshot.ramUsedMb) : '—'}
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider">Free</p>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {snapshot ? fmtMb(snapshot.ramTotalMb - snapshot.ramUsedMb) : '—'}
                </p>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider">Total</p>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {snapshot ? fmtMb(snapshot.ramTotalMb) : '—'}
                </p>
              </div>
            </div>
          }
        />

        {/* Disk IO */}
        <MetricPanel
          title="Disk I/O"
          value={snapshot ? fmtKbps(snapshot.diskReadKbps + snapshot.diskWriteKbps) : '—'}
          sub="total throughput"
          percent={diskPct}
          history={diskReadHistory.map((r, i) => r + (diskWriteHistory[i] ?? 0))}
          color={diskColor}
          sparkId="disk-spark"
          icon={<HardDrive size={16} />}
          variant={diskVariant}
          extra={
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5">
                <ArrowDown size={10} className="text-accent-500" />
                <div>
                  <p className="font-semibold uppercase tracking-wider">Read</p>
                  <p className="font-mono font-bold text-[var(--text-primary)]">
                    {snapshot ? fmtKbps(snapshot.diskReadKbps) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUp size={10} className="text-primary-500" />
                <div>
                  <p className="font-semibold uppercase tracking-wider">Write</p>
                  <p className="font-mono font-bold text-[var(--text-primary)]">
                    {snapshot ? fmtKbps(snapshot.diskWriteKbps) : '—'}
                  </p>
                </div>
              </div>
            </div>
          }
        />

        {/* Network IO */}
        <Card className="flex flex-col">
          <CardHeader
            title="Network I/O"
            icon={<Network size={16} />}
            action={
              <Badge variant={netVariant} size="sm" dot>
                {fmtKbps(totalNetKbps)}
              </Badge>
            }
          />
          <CardContent className="flex flex-col gap-3 flex-1">
            {/* Combined sparklines */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-accent-500 flex items-center gap-1">
                  <ArrowDown size={10} /> Download
                </p>
                <div className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] overflow-hidden px-2 pt-1">
                  <Sparkline
                    values={netRxHistory}
                    color="var(--color-accent-500)"
                    id="net-rx-spark"
                    height={40}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-primary-500 flex items-center gap-1">
                  <ArrowUp size={10} /> Upload
                </p>
                <div className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] overflow-hidden px-2 pt-1">
                  <Sparkline
                    values={netTxHistory}
                    color="var(--color-primary-500)"
                    id="net-tx-spark"
                    height={40}
                  />
                </div>
              </div>
            </div>

            {/* Per-adapter breakdown */}
            <div className="space-y-2.5 pt-1">
              {(snapshot?.network ?? []).filter((n) => n.rxKbps + n.txKbps > 0 || true).map((iface) => (
                <NetworkIORow key={iface.name} iface={iface} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Usage summary table ── */}
      <Card>
        <CardHeader
          title="Resource Summary"
          subtitle={`Last ${WINDOW}-sample window (${(WINDOW * INTERVAL_MS / 1000).toFixed(0)}s)`}
          icon={<ChevronUp size={16} />}
          action={
            <span className="text-xs text-[var(--text-muted)]">
              {isRunning ? (
                <span className="flex items-center gap-1 text-accent-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                  Live
                </span>
              ) : (
                'Paused'
              )}
            </span>
          }
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  {['Metric', 'Current', 'Min', 'Max', 'Avg', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="pb-2 pr-4 text-left font-semibold text-[var(--text-muted)] uppercase tracking-wider text-[10px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {[
                  {
                    name: 'CPU',
                    current: `${snapshot?.cpuPercent ?? 0}%`,
                    history: cpuHistory,
                    fmt: (v: number) => `${v}%`,
                    variant: cpuVariant
                  },
                  {
                    name: 'RAM',
                    current: `${snapshot?.ramPercent ?? 0}%`,
                    history: ramHistory,
                    fmt: (v: number) => `${v}%`,
                    variant: ramVariant
                  },
                  {
                    name: 'Disk Read',
                    current: snapshot ? fmtKbps(snapshot.diskReadKbps) : '—',
                    history: diskReadHistory,
                    fmt: (v: number) => fmtKbps(v),
                    variant: diskVariant
                  },
                  {
                    name: 'Disk Write',
                    current: snapshot ? fmtKbps(snapshot.diskWriteKbps) : '—',
                    history: diskWriteHistory,
                    fmt: (v: number) => fmtKbps(v),
                    variant: diskVariant
                  },
                  {
                    name: 'Net Download',
                    current: fmtKbps(snapshot?.network.reduce((s, n) => s + n.rxKbps, 0) ?? 0),
                    history: netRxHistory,
                    fmt: (v: number) => fmtKbps(v),
                    variant: netVariant
                  },
                  {
                    name: 'Net Upload',
                    current: fmtKbps(snapshot?.network.reduce((s, n) => s + n.txKbps, 0) ?? 0),
                    history: netTxHistory,
                    fmt: (v: number) => fmtKbps(v),
                    variant: netVariant
                  }
                ].map((row) => {
                  const min = row.history.length > 0 ? Math.min(...row.history) : 0
                  const max = row.history.length > 0 ? Math.max(...row.history) : 0
                  const avg = row.history.length > 0
                    ? Math.round(row.history.reduce((a, b) => a + b, 0) / row.history.length)
                    : 0
                  return (
                    <tr key={row.name} className="hover:bg-[var(--bg-input)] transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">{row.name}</td>
                      <td className="py-2.5 pr-4 font-mono font-bold text-[var(--text-primary)]">{row.current}</td>
                      <td className="py-2.5 pr-4 font-mono text-[var(--text-secondary)]">{row.fmt(min)}</td>
                      <td className="py-2.5 pr-4 font-mono text-[var(--text-secondary)]">{row.fmt(max)}</td>
                      <td className="py-2.5 pr-4 font-mono text-[var(--text-secondary)]">{row.fmt(avg)}</td>
                      <td className="py-2.5">
                        <Badge variant={row.variant} size="sm">
                          {row.variant === 'accent'   ? 'Normal'
                            : row.variant === 'primary'  ? 'Moderate'
                            : row.variant === 'warning'  ? 'High'
                            : 'Critical'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
