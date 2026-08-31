
import { useState, useEffect, useCallback, useRef } from 'react'
import { Activity, Play, Square, Settings2, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

interface PingRecord {
  id: number
  latencyMs: number
  timestamp: string
  status: 'ok' | 'timeout' | 'elevated'
}

interface TargetConfig {
  label: string
  host: string
}

const TARGETS: TargetConfig[] = [
  { label: 'Google DNS', host: '8.8.8.8' },
  { label: 'Cloudflare DNS', host: '1.1.1.1' },
  { label: 'Gateway', host: '192.168.1.1' }
]

const MAX_RECORDS = 30
const INTERVAL_MS = 1000

function classifyLatency(ms: number): 'ok' | 'elevated' | 'timeout' {
  if (ms <= 0) return 'timeout'
  if (ms <= 60) return 'ok'
  return 'elevated'
}

function latencyColor(status: 'ok' | 'elevated' | 'timeout'): string {
  switch (status) {
    case 'ok':
      return 'text-accent-500'
    case 'elevated':
      return 'text-warning-500'
    case 'timeout':
      return 'text-danger-500'
  }
}

function latencyBarColor(status: 'ok' | 'elevated' | 'timeout'): string {
  switch (status) {
    case 'ok':
      return 'bg-accent-500'
    case 'elevated':
      return 'bg-warning-500'
    case 'timeout':
      return 'bg-danger-500'
  }
}

/**
 * Sparkline — renders a minimal inline SVG latency chart
 */
function PingSparkline({ records }: { records: PingRecord[] }): React.JSX.Element {
  const width = 600
  const height = 80
  const max = Math.max(...records.map((r) => r.latencyMs), 1)
  const padding = 4

  if (records.length < 2) {
    return (
      <div className="w-full h-20 flex items-center justify-center text-xs text-[var(--text-muted)]">
        Waiting for data...
      </div>
    )
  }

  const step = (width - padding * 2) / (records.length - 1)

  const points = records
    .map((r, i) => {
      const x = padding + i * step
      const y = padding + (1 - r.latencyMs / max) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-20"
      preserveAspectRatio="none"
      aria-label="Ping latency sparkline"
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={padding}
          y1={padding + frac * (height - padding * 2)}
          x2={width - padding}
          y2={padding + frac * (height - padding * 2)}
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-[var(--border-color)]"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <polyline
        points={`${padding},${height - padding} ${points} ${padding + (records.length - 1) * step},${height - padding}`}
        fill="url(#pingGrad)"
        fillOpacity="0.15"
        stroke="none"
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent, #10b981)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Latest point dot */}
      {records.length > 0 && (
        <circle
          cx={padding + (records.length - 1) * step}
          cy={padding + (1 - records[records.length - 1].latencyMs / max) * (height - padding * 2)}
          r="3"
          fill="var(--color-accent, #10b981)"
        />
      )}

      <defs>
        <linearGradient id="pingGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent, #10b981)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--color-accent, #10b981)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * PingMonitorPage — Simulates real-time ICMP-style latency probing with live stats.
 * Continuously polls the active target every second while monitoring is active.
 */
export function PingMonitorPage(): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [records, setRecords] = useState<PingRecord[]>([])
  const [selectedTarget, setSelectedTarget] = useState<TargetConfig>(TARGETS[0])
  const [showTargetPicker, setShowTargetPicker] = useState(false)
  const tickRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Simulate a ping round-trip via random jitter around a base latency
  const simulatePing = useCallback((): number => {
    const base = selectedTarget.host === '192.168.1.1' ? 2 : 14
    const jitter = Math.random() * 18 - 4
    const spike = Math.random() < 0.04 ? Math.random() * 200 : 0
    return Math.max(1, Math.round(base + jitter + spike))
  }, [selectedTarget.host])

  const runPollCycle = useCallback(() => {
    tickRef.current += 1
    const id = tickRef.current
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const ms = simulatePing()
    const status = classifyLatency(ms)
    const record: PingRecord = { id, latencyMs: ms, timestamp: now, status }

    setRecords((prev) => [...prev.slice(-(MAX_RECORDS - 1)), record])
  }, [simulatePing])

  const startMonitoring = useCallback(() => {
    setIsRunning(true)
    setRecords([])
    tickRef.current = 0
    timerRef.current = setInterval(runPollCycle, INTERVAL_MS)
  }, [runPollCycle])

  const stopMonitoring = useCallback(() => {
    setIsRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Restart timer if target changes while running
  useEffect(() => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(runPollCycle, INTERVAL_MS)
    }
  }, [isRunning, runPollCycle])

  // Stats
  const latest = records[records.length - 1] ?? null
  const validMs = records.filter((r) => r.status !== 'timeout').map((r) => r.latencyMs)
  const avgMs =
    validMs.length > 0 ? Math.round(validMs.reduce((a, b) => a + b, 0) / validMs.length) : null
  const minMs = validMs.length > 0 ? Math.min(...validMs) : null
  const maxMs = validMs.length > 0 ? Math.max(...validMs) : null
  const jitterMs =
    validMs.length > 1
      ? Math.round(
        Math.sqrt(validMs.reduce((acc, v) => acc + (v - (avgMs ?? 0)) ** 2, 0) / validMs.length)
      )
      : null
  const timeouts = records.filter((r) => r.status === 'timeout').length
  const lossRate = records.length > 0 ? Math.round((timeouts / records.length) * 100) : 0
  const stability =
    lossRate === 0 && (jitterMs ?? 0) < 10
      ? 'Excellent'
      : lossRate < 5 && (jitterMs ?? 0) < 25
        ? 'Good'
        : lossRate < 15
          ? 'Fair'
          : 'Unstable'

  const stabilityVariant =
    stability === 'Excellent' || stability === 'Good'
      ? 'accent'
      : stability === 'Fair'
        ? 'warning'
        : 'danger'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Real-time Ping Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Monitor connection responsiveness and ICMP echo response times
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Settings2 size={14} />}
              onClick={() => setShowTargetPicker((v) => !v)}
            >
              {selectedTarget.label}
            </Button>
            {showTargetPicker && (
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-xl py-1">
                {TARGETS.map((t) => (
                  <button
                    key={t.host}
                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${selectedTarget.host === t.host
                        ? 'text-accent-500 font-bold'
                        : 'text-[var(--text-primary)]'
                      }`}
                    onClick={() => {
                      setSelectedTarget(t)
                      setShowTargetPicker(false)
                      if (isRunning) stopMonitoring()
                    }}
                  >
                    <div>{t.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">{t.host}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {isRunning ? (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Square size={14} />}
              onClick={stopMonitoring}
            >
              Stop Monitor
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play size={14} />}
              onClick={startMonitoring}
            >
              Start Monitoring
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Latency */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Current Latency" icon={<Activity size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-2">
            {latest ? (
              <>
                <span
                  className={`text-5xl font-black tracking-tight font-mono ${latencyColor(latest.status)}`}
                >
                  {latest.latencyMs}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                  ms
                </span>
                <Badge
                  variant={
                    latest.status === 'ok'
                      ? 'accent'
                      : latest.status === 'elevated'
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                >
                  {latest.status === 'ok'
                    ? 'Good Response'
                    : latest.status === 'elevated'
                      ? 'High Latency'
                      : 'Timeout'}
                </Badge>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold text-[var(--text-muted)]">—</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">
                  {isRunning ? 'Probing...' : 'Not running'}
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stability */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Connection Stability" icon={<ShieldCheck size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
            {records.length > 0 ? (
              <>
                {lossRate === 0 ? (
                  <Wifi size={36} className="text-accent-500" />
                ) : (
                  <WifiOff size={36} className="text-danger-500" />
                )}
                <Badge variant={stabilityVariant} size="md">
                  {stability}
                </Badge>
                <div className="text-[10px] text-[var(--text-muted)] text-center">
                  {lossRate}% loss · {jitterMs ?? '—'} ms jitter
                </div>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-[var(--text-muted)]">Waiting...</span>
                <span className="text-xs text-[var(--text-secondary)] mt-1">
                  Start monitor to view status
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Target Info */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Target & Statistics" icon={<Settings2 size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Target Host</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {selectedTarget.host}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Scan Interval</span>
              <span className="font-semibold text-[var(--text-primary)]">{INTERVAL_MS} ms</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Average Ping</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {avgMs !== null ? `${avgMs} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Min / Max</span>
              <span className="font-mono text-[var(--text-secondary)]">
                {minMs !== null && maxMs !== null ? `${minMs} / ${maxMs} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Samples Recorded</span>
              <span className="font-semibold text-[var(--text-primary)]">{records.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sparkline telemetry */}
      <Card>
        <CardHeader
          title="Telemetry Stream"
          subtitle={`Live response latency timeline → ${selectedTarget.label} (${selectedTarget.host})`}
          icon={<Activity size={16} />}
        />
        <CardContent>
          {records.length === 0 ? (
            <div className="h-20 border border-[var(--border-color)] border-dashed rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)]">
              {isRunning
                ? 'Collecting telemetry data...'
                : 'Chart telemetry will load when monitor is started'}
            </div>
          ) : (
            <PingSparkline records={records} />
          )}
        </CardContent>
      </Card>

      {/* Probe log table */}
      <Card>
        <CardHeader
          title="Probe Log"
          subtitle={`Last ${MAX_RECORDS} ping measurements (newest first)`}
          icon={<Activity size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--surface-card)]">
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-semibold pr-4">#</th>
                  <th className="py-2.5 font-semibold pr-4">Timestamp</th>
                  <th className="py-2.5 font-semibold pr-4">Latency</th>
                  <th className="py-2.5 font-semibold pr-4">Status</th>
                  <th className="py-2.5 font-semibold">Bar</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--text-muted)]">
                      No probe records yet.
                    </td>
                  </tr>
                ) : (
                  [...records].reverse().map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border-color)]/40 last:border-0"
                    >
                      <td className="py-2 pr-4 text-[var(--text-muted)] font-mono">{r.id}</td>
                      <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">
                        {r.timestamp}
                      </td>
                      <td className={`py-2 pr-4 font-mono font-bold ${latencyColor(r.status)}`}>
                        {r.latencyMs} ms
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={
                            r.status === 'ok'
                              ? 'accent'
                              : r.status === 'elevated'
                                ? 'warning'
                                : 'danger'
                          }
                          size="sm"
                        >
                          {r.status === 'ok' ? 'OK' : r.status === 'elevated' ? 'High' : 'Timeout'}
                        </Badge>
                      </td>
                      <td className="py-2 w-28">
                        <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${latencyBarColor(r.status)}`}
                            style={{
                              width: `${Math.min(100, (r.latencyMs / 200) * 100)}%`
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
