import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingUp, Play, Square, Settings2, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface JitterRecord {
  id: number
  latencyMs: number
  jitterMs: number
  timestamp: string
  grade: 'excellent' | 'good' | 'fair' | 'poor'
}

interface TargetConfig {
  label: string
  host: string
  /** Base simulated RTT in ms */
  baseRtt: number
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const TARGETS: TargetConfig[] = [
  { label: 'Google DNS', host: '8.8.8.8', baseRtt: 14 },
  { label: 'Cloudflare DNS', host: '1.1.1.1', baseRtt: 11 },
  { label: 'Gateway', host: '192.168.1.1', baseRtt: 2 }
]

const MAX_RECORDS = 40
const INTERVAL_MS = 1000

/* ─────────────────────────────────────────────────────────────
   Pure helpers
───────────────────────────────────────────────────────────── */

function gradeJitter(jitterMs: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (jitterMs <= 5) return 'excellent'
  if (jitterMs <= 15) return 'good'
  if (jitterMs <= 30) return 'fair'
  return 'poor'
}

function gradeVariant(
  grade: 'excellent' | 'good' | 'fair' | 'poor'
): 'accent' | 'primary' | 'warning' | 'danger' {
  switch (grade) {
    case 'excellent':
      return 'accent'
    case 'good':
      return 'primary'
    case 'fair':
      return 'warning'
    case 'poor':
      return 'danger'
  }
}

function gradeLabel(grade: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (grade) {
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'fair':
      return 'Fair'
    case 'poor':
      return 'Poor'
  }
}

function jitterColor(grade: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (grade) {
    case 'excellent':
      return 'text-accent-500'
    case 'good':
      return 'text-primary-500'
    case 'fair':
      return 'text-warning-500'
    case 'poor':
      return 'text-danger-500'
  }
}

/* ─────────────────────────────────────────────────────────────
   Dual-trace SVG chart
   Renders latency (accent) and jitter (primary) on the same canvas.
───────────────────────────────────────────────────────────── */

interface DualTraceChartProps {
  records: JitterRecord[]
}

function DualTraceChart({ records }: DualTraceChartProps): React.JSX.Element {
  const W = 600
  const H = 100
  const PAD = 6

  if (records.length < 2) {
    return (
      <div className="w-full h-24 flex items-center justify-center text-xs text-[var(--text-muted)]">
        Collecting samples — chart populates after 2 probes...
      </div>
    )
  }

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const step = innerW / (records.length - 1)

  const maxLatency = Math.max(...records.map((r) => r.latencyMs), 1)
  const maxJitter = Math.max(...records.map((r) => r.jitterMs), 1)

  const latencyPoints = records
    .map((r, i) => {
      const x = PAD + i * step
      const y = PAD + (1 - r.latencyMs / maxLatency) * innerH
      return `${x},${y}`
    })
    .join(' ')

  const jitterPoints = records
    .map((r, i) => {
      const x = PAD + i * step
      const y = PAD + (1 - r.jitterMs / maxJitter) * innerH
      return `${x},${y}`
    })
    .join(' ')

  const lastIdx = records.length - 1
  const lastLatencyX = PAD + lastIdx * step
  const lastLatencyY = PAD + (1 - records[lastIdx].latencyMs / maxLatency) * innerH
  const lastJitterX = PAD + lastIdx * step
  const lastJitterY = PAD + (1 - records[lastIdx].jitterMs / maxJitter) * innerH

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-24"
      preserveAspectRatio="none"
      aria-label="Dual-trace jitter and latency chart"
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => (
        <line
          key={frac}
          x1={PAD}
          y1={PAD + frac * innerH}
          x2={W - PAD}
          y2={PAD + frac * innerH}
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-[var(--border-color)]"
          strokeDasharray="4 4"
        />
      ))}

      {/* Latency area */}
      <polyline
        points={`${PAD},${H - PAD} ${latencyPoints} ${PAD + lastIdx * step},${H - PAD}`}
        fill="url(#latGrad)"
        fillOpacity="0.12"
        stroke="none"
      />

      {/* Latency line */}
      <polyline
        points={latencyPoints}
        fill="none"
        stroke="var(--color-accent, #10b981)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Jitter area */}
      <polyline
        points={`${PAD},${H - PAD} ${jitterPoints} ${PAD + lastIdx * step},${H - PAD}`}
        fill="url(#jitGrad)"
        fillOpacity="0.12"
        stroke="none"
      />

      {/* Jitter line */}
      <polyline
        points={jitterPoints}
        fill="none"
        stroke="var(--color-primary, #6366f1)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="5 2"
      />

      {/* Live dots */}
      <circle cx={lastLatencyX} cy={lastLatencyY} r="3" fill="var(--color-accent, #10b981)" />
      <circle cx={lastJitterX} cy={lastJitterY} r="3" fill="var(--color-primary, #6366f1)" />

      <defs>
        <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent, #10b981)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-accent, #10b981)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Jitter simulation engine
   Uses RFC 3550 successive-difference method:
     J(i) = J(i−1) + (|D(i−1,i)| − J(i−1)) / 16
   where D(i−1,i) = latency[i] − latency[i−1]
───────────────────────────────────────────────────────────── */

interface SimEngine {
  prevLatency: number
  runningJitter: number
}

function makeEngine(baseRtt: number): SimEngine {
  return { prevLatency: baseRtt, runningJitter: 0 }
}

function tickEngine(
  engine: SimEngine,
  baseRtt: number
): { engine: SimEngine; latencyMs: number; jitterMs: number } {
  const jitterNoise = Math.random() * 18 - 4
  const spike = Math.random() < 0.05 ? Math.random() * 80 : 0
  const latencyMs = Math.max(1, Math.round(baseRtt + jitterNoise + spike))

  const diff = Math.abs(latencyMs - engine.prevLatency)
  const newJitter = engine.runningJitter + (diff - engine.runningJitter) / 16
  const jitterMs = Math.round(newJitter * 10) / 10

  return {
    engine: { prevLatency: latencyMs, runningJitter: newJitter },
    latencyMs,
    jitterMs: Math.round(jitterMs)
  }
}

/* ─────────────────────────────────────────────────────────────
   JitterMonitorPage
───────────────────────────────────────────────────────────── */

/**
 * JitterMonitorPage — Measures inter-packet delay variance in real time.
 * Applies RFC 3550 running jitter estimation (RTP RTCP formula) to a
 * simulated ping stream, displaying latency, jitter, a dual-trace chart,
 * and a scrollable per-probe log.
 */
export function JitterMonitorPage(): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [records, setRecords] = useState<JitterRecord[]>([])
  const [selectedTarget, setSelectedTarget] = useState<TargetConfig>(TARGETS[0])
  const [showTargetPicker, setShowTargetPicker] = useState(false)

  const tickRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const engineRef = useRef<SimEngine>(makeEngine(TARGETS[0].baseRtt))

  const runPollCycle = useCallback(() => {
    tickRef.current += 1
    const id = tickRef.current

    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const { engine, latencyMs, jitterMs } = tickEngine(engineRef.current, selectedTarget.baseRtt)
    engineRef.current = engine

    const grade = gradeJitter(jitterMs)
    const record: JitterRecord = { id, latencyMs, jitterMs, timestamp: now, grade }

    setRecords((prev) => [...prev.slice(-(MAX_RECORDS - 1)), record])
  }, [selectedTarget.baseRtt])

  const startMonitoring = useCallback(() => {
    setIsRunning(true)
    setRecords([])
    tickRef.current = 0
    engineRef.current = makeEngine(selectedTarget.baseRtt)
    timerRef.current = setInterval(runPollCycle, INTERVAL_MS)
  }, [runPollCycle, selectedTarget.baseRtt])

  const stopMonitoring = useCallback(() => {
    setIsRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  /* Restart interval when runPollCycle ref changes (target switch) */
  useEffect(() => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(runPollCycle, INTERVAL_MS)
    }
  }, [isRunning, runPollCycle])

  /* ── Derived statistics ── */
  const latest = records[records.length - 1] ?? null

  const jitterSamples = records.map((r) => r.jitterMs)
  const avgJitter =
    jitterSamples.length > 0
      ? Math.round(jitterSamples.reduce((a, b) => a + b, 0) / jitterSamples.length)
      : null
  const maxJitter = jitterSamples.length > 0 ? Math.max(...jitterSamples) : null
  const minJitter = jitterSamples.length > 0 ? Math.min(...jitterSamples) : null

  const latencySamples = records.map((r) => r.latencyMs)
  const avgLatency =
    latencySamples.length > 0
      ? Math.round(latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length)
      : null

  /* Stability label from latest jitter grade */
  const stabilityGrade: 'excellent' | 'good' | 'fair' | 'poor' | null = latest ? latest.grade : null

  /* Smooth-line grade for overall session (based on avgJitter) */
  const sessionGrade: 'excellent' | 'good' | 'fair' | 'poor' | null =
    avgJitter !== null ? gradeJitter(avgJitter) : null

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Jitter Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Measure inter-packet delay variance using RFC&nbsp;3550 running estimation
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* Target picker */}
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
              <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-xl py-1">
                {TARGETS.map((t) => (
                  <button
                    key={t.host}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-surface-100 dark:hover:bg-surface-800 ${
                      selectedTarget.host === t.host
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

          {/* Start / Stop */}
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

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Jitter */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Current Jitter" icon={<TrendingUp size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-2">
            {latest ? (
              <>
                <span
                  className={`text-5xl font-black tracking-tight font-mono ${jitterColor(latest.grade)}`}
                >
                  {latest.jitterMs}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                  ms jitter
                </span>
                <Badge variant={gradeVariant(latest.grade)} size="sm">
                  {gradeLabel(latest.grade)} Quality
                </Badge>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Latency: {latest.latencyMs} ms
                </span>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold text-[var(--text-muted)]">—</span>
                <span className="text-xs text-[var(--text-muted)] mt-1">
                  {isRunning ? 'Estimating jitter...' : 'Not running'}
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Session Stability */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Session Stability" icon={<ShieldCheck size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
            {sessionGrade !== null ? (
              <>
                {sessionGrade === 'excellent' || sessionGrade === 'good' ? (
                  <Wifi size={36} className="text-accent-500" />
                ) : (
                  <WifiOff size={36} className="text-danger-500" />
                )}
                <Badge variant={gradeVariant(sessionGrade)} size="md">
                  {gradeLabel(sessionGrade)}
                </Badge>
                <div className="text-[10px] text-[var(--text-muted)] text-center">
                  Session avg jitter: {avgJitter ?? '—'} ms
                </div>
                <div className="text-[10px] text-[var(--text-muted)] text-center">
                  Min {minJitter ?? '—'} ms · Max {maxJitter ?? '—'} ms
                </div>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-[var(--text-muted)]">Waiting...</span>
                <span className="text-xs text-[var(--text-secondary)] text-center">
                  Start monitor to evaluate session stability
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Target & Session Stats */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Target & Session Stats" icon={<Settings2 size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Target Host</span>
              <span className="font-semibold font-mono text-[var(--text-primary)]">
                {selectedTarget.host}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Probe Interval</span>
              <span className="font-semibold text-[var(--text-primary)]">{INTERVAL_MS} ms</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Avg Latency</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {avgLatency !== null ? `${avgLatency} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Avg Jitter</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {avgJitter !== null ? `${avgJitter} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Probes Recorded</span>
              <span className="font-semibold text-[var(--text-primary)]">{records.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Dual-trace chart ── */}
      <Card>
        <CardHeader
          title="Dual-Trace Telemetry"
          subtitle={`Latency (solid) vs Jitter (dashed) → ${selectedTarget.label} (${selectedTarget.host})`}
          icon={<TrendingUp size={16} />}
        />
        <CardContent>
          {/* Legend */}
          <div className="flex gap-6 mb-4 text-[10px] text-[var(--text-muted)] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-accent-500 inline-block rounded" />
              Latency (ms)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-6 h-0.5 bg-primary-500 inline-block rounded"
                style={{ borderTop: '2px dashed currentColor', height: 0 }}
              />
              Jitter (ms)
            </span>
          </div>

          {records.length === 0 ? (
            <div className="h-24 border border-[var(--border-color)] border-dashed rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)]">
              {isRunning ? 'Collecting telemetry data...' : 'Chart loads when monitor is started'}
            </div>
          ) : (
            <DualTraceChart records={records} />
          )}
        </CardContent>
      </Card>

      {/* ── Thresholds guide ── */}
      <Card>
        <CardHeader
          title="Jitter Quality Thresholds"
          subtitle="Industry-standard latency variance classification"
          icon={<ShieldCheck size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                {
                  range: '≤ 5 ms',
                  label: 'Excellent',
                  desc: 'Real-time VoIP / video',
                  grade: 'excellent'
                },
                { range: '6–15 ms', label: 'Good', desc: 'HD streaming / gaming', grade: 'good' },
                { range: '16–30 ms', label: 'Fair', desc: 'General browsing', grade: 'fair' },
                { range: '> 30 ms', label: 'Poor', desc: 'Audio / video artifacts', grade: 'poor' }
              ] as const
            ).map((t) => (
              <div
                key={t.grade}
                className={`rounded-xl p-3 border text-xs space-y-1 ${
                  stabilityGrade === t.grade
                    ? 'border-current ring-1 ring-current/20'
                    : 'border-[var(--border-color)]'
                } ${jitterColor(t.grade)}`}
              >
                <div className="font-black font-mono text-base">{t.range}</div>
                <div className="font-bold">{t.label}</div>
                <div className="text-[var(--text-muted)] text-[10px]">{t.desc}</div>
                {stabilityGrade === t.grade && (
                  <Badge variant={gradeVariant(t.grade)} size="sm" className="mt-1">
                    Current
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Probe log table ── */}
      <Card>
        <CardHeader
          title="Probe Log"
          subtitle={`Last ${MAX_RECORDS} jitter measurements (newest first)`}
          icon={<TrendingUp size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--surface-card)]">
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-semibold pr-4">#</th>
                  <th className="py-2.5 font-semibold pr-4">Timestamp</th>
                  <th className="py-2.5 font-semibold pr-4">Latency</th>
                  <th className="py-2.5 font-semibold pr-4">Jitter</th>
                  <th className="py-2.5 font-semibold pr-4">Grade</th>
                  <th className="py-2.5 font-semibold">Bar</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[var(--text-muted)]">
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
                      <td className="py-2 pr-4 font-mono text-[var(--text-secondary)]">
                        {r.latencyMs} ms
                      </td>
                      <td className={`py-2 pr-4 font-mono font-bold ${jitterColor(r.grade)}`}>
                        {r.jitterMs} ms
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={gradeVariant(r.grade)} size="sm">
                          {gradeLabel(r.grade)}
                        </Badge>
                      </td>
                      <td className="py-2 w-28">
                        <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              r.grade === 'excellent'
                                ? 'bg-accent-500'
                                : r.grade === 'good'
                                  ? 'bg-primary-500'
                                  : r.grade === 'fair'
                                    ? 'bg-warning-500'
                                    : 'bg-danger-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (r.jitterMs / 50) * 100)}%`
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
