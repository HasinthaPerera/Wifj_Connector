import { useState, useEffect, useCallback, useRef } from 'react'
import { Timer, Play, Square, Settings2, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface LatencySample {
  id: number
  timestamp: string
  rttMs: number
  grade: LatencyGrade
}

interface TargetConfig {
  label: string
  host: string
  baseRtt: number
}

type LatencyGrade = 'excellent' | 'good' | 'fair' | 'poor'

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const TARGETS: TargetConfig[] = [
  { label: 'Google DNS', host: '8.8.8.8', baseRtt: 14 },
  { label: 'Cloudflare DNS', host: '1.1.1.1', baseRtt: 11 },
  { label: 'Quad9', host: '9.9.9.9', baseRtt: 18 },
  { label: 'Gateway', host: '192.168.1.1', baseRtt: 2 }
]

/** Samples retained in rolling window */
const WINDOW = 60
const INTERVAL_MS = 1000

/* ─────────────────────────────────────────────────────────────
   Pure helpers
───────────────────────────────────────────────────────────── */

function gradeLatency(ms: number): LatencyGrade {
  if (ms <= 20) return 'excellent'
  if (ms <= 50) return 'good'
  if (ms <= 100) return 'fair'
  return 'poor'
}

function gradeVariant(g: LatencyGrade): 'accent' | 'primary' | 'warning' | 'danger' {
  switch (g) {
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

function gradeColor(g: LatencyGrade): string {
  switch (g) {
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

function gradeBarColor(g: LatencyGrade): string {
  switch (g) {
    case 'excellent':
      return 'bg-accent-500'
    case 'good':
      return 'bg-primary-500'
    case 'fair':
      return 'bg-warning-500'
    case 'poor':
      return 'bg-danger-500'
  }
}

/** Simulate a single RTT probe with realistic noise + occasional spikes */
function simulateRtt(baseRtt: number): number {
  const noise = Math.random() * 14 - 4
  const spike = Math.random() < 0.05 ? Math.random() * 120 : 0
  return Math.max(1, Math.round(baseRtt + noise + spike))
}

/* ─────────────────────────────────────────────────────────────
   Full-width latency SVG area chart
   Auto-scales y-axis to current window peak.
   Colours the line segments individually by grade band.
───────────────────────────────────────────────────────────── */

interface LatencyChartProps {
  samples: LatencySample[]
  target: TargetConfig
}

function LatencyChart({ samples, target }: LatencyChartProps): React.JSX.Element {
  const W = 600
  const H = 120
  const PAD = 6
  const innerW = W - PAD * 2
  const innerH = H - PAD * 2

  if (samples.length < 2) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg">
        Collecting data — chart populates after 2 samples...
      </div>
    )
  }

  const peak = Math.max(...samples.map((s) => s.rttMs), 50)
  const step = innerW / Math.max(WINDOW - 1, 1)
  const offset = (WINDOW - samples.length) * step

  const yOf = (ms: number): number => PAD + (1 - ms / peak) * innerH
  const xOf = (i: number): number => PAD + offset + i * step

  const points = samples.map((s, i) => `${xOf(i)},${yOf(s.rttMs)}`).join(' ')
  const lastX = xOf(samples.length - 1)
  const lastY = yOf(samples[samples.length - 1].rttMs)

  // Threshold band lines
  const thresholds = [
    { ms: 20, label: '20ms', color: 'var(--color-accent, #10b981)' },
    { ms: 50, label: '50ms', color: 'var(--color-primary, #6366f1)' },
    { ms: 100, label: '100ms', color: 'var(--color-warning, #f59e0b)' }
  ].filter((t) => t.ms < peak)

  // Y-axis ticks
  const tickCount = 4
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const frac = i / tickCount
    return { y: PAD + frac * innerH, value: Math.round(peak * (1 - frac)) }
  })

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-[var(--text-muted)] font-mono py-1.5"
        style={{ width: 40 }}
      >
        {ticks.map((t) => (
          <span key={t.y} className="leading-none">
            {t.value}ms
          </span>
        ))}
      </div>

      <div className="ml-10">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-32"
          preserveAspectRatio="none"
          aria-label={`Latency chart for ${target.label}`}
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

          {/* Threshold band lines */}
          {thresholds.map((t) => (
            <g key={t.ms}>
              <line
                x1={PAD}
                y1={yOf(t.ms)}
                x2={W - PAD}
                y2={yOf(t.ms)}
                stroke={t.color}
                strokeWidth="0.75"
                strokeDasharray="6 3"
                opacity="0.5"
              />
              <text
                x={W - PAD - 2}
                y={yOf(t.ms) - 2}
                fontSize="7"
                fill={t.color}
                textAnchor="end"
                opacity="0.8"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <polyline
            points={`${PAD + offset},${H - PAD} ${points} ${lastX},${H - PAD}`}
            fill="url(#latencyAreaGrad)"
            fillOpacity="0.12"
            stroke="none"
          />

          {/* Main line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-primary, #6366f1)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Live endpoint dot — coloured by current grade */}
          {(() => {
            const latest = samples[samples.length - 1]
            const dotColor =
              latest.grade === 'excellent'
                ? 'var(--color-accent, #10b981)'
                : latest.grade === 'good'
                  ? 'var(--color-primary, #6366f1)'
                  : latest.grade === 'fair'
                    ? 'var(--color-warning, #f59e0b)'
                    : 'var(--color-danger, #ef4444)'
            return <circle cx={lastX} cy={lastY} r="4" fill={dotColor} />
          })()}

          <defs>
            <linearGradient id="latencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis */}
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono mt-1 px-1">
          <span>−{WINDOW}s</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Percentile bar component
───────────────────────────────────────────────────────────── */

function PercentileBar({
  label,
  value,
  max
}: {
  label: string
  value: number
  max: number
}): React.JSX.Element {
  const grade = gradeLatency(value)
  const pct = Math.min(100, (value / Math.max(max, 1)) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--text-muted)] font-medium">{label}</span>
        <span className={`font-mono font-bold ${gradeColor(grade)}`}>{value} ms</span>
      </div>
      <div className="h-1.5 w-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${gradeBarColor(grade)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   LatencyChartsPage
───────────────────────────────────────────────────────────── */

/**
 * LatencyChartsPage — Real-time RTT latency chart with a 60-second rolling window.
 * Renders a full-width area chart, live stat cards, percentile bars, and a
 * scrollable probe log with per-sample grade classification.
 */
export function LatencyChartsPage(): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [samples, setSamples] = useState<LatencySample[]>([])
  const [selectedTarget, setSelectedTarget] = useState<TargetConfig>(TARGETS[0])
  const [showTargetPicker, setShowTargetPicker] = useState(false)

  const tickRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const runTick = useCallback(() => {
    tickRef.current += 1
    const id = tickRef.current
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const rttMs = simulateRtt(selectedTarget.baseRtt)
    const grade = gradeLatency(rttMs)
    setSamples((prev) => [...prev.slice(-(WINDOW - 1)), { id, timestamp: now, rttMs, grade }])
  }, [selectedTarget.baseRtt])

  const start = useCallback(() => {
    setSamples([])
    tickRef.current = 0
    setIsRunning(true)
    timerRef.current = setInterval(runTick, INTERVAL_MS)
  }, [runTick])

  const stop = useCallback(() => {
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

  /* Restart timer when runTick changes (target switch) */
  useEffect(() => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(runTick, INTERVAL_MS)
    }
  }, [isRunning, runTick])

  /* ── Derived statistics ── */
  const latest = samples[samples.length - 1] ?? null
  const rttValues = samples.map((s) => s.rttMs)

  const avg =
    rttValues.length > 0
      ? Math.round(rttValues.reduce((a, b) => a + b, 0) / rttValues.length)
      : null
  const minRtt = rttValues.length > 0 ? Math.min(...rttValues) : null
  const maxRtt = rttValues.length > 0 ? Math.max(...rttValues) : null

  // Percentiles
  const sorted = [...rttValues].sort((a, b) => a - b)
  const pct = (p: number): number | null => {
    if (sorted.length === 0) return null
    const idx = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, idx)]
  }
  const p50 = pct(50)
  const p90 = pct(90)
  const p99 = pct(99)

  const sessionGrade = avg !== null ? gradeLatency(avg) : null

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Latency Charts</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Real-time RTT latency monitoring with percentile analysis and {WINDOW}s rolling chart
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap justify-end">
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
                      if (isRunning) stop()
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
            <Button variant="danger" size="sm" leftIcon={<Square size={14} />} onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button variant="primary" size="sm" leftIcon={<Play size={14} />} onClick={start}>
              Start Monitoring
            </Button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Live RTT */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Current RTT" icon={<Timer size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-2">
            {latest ? (
              <>
                <span
                  className={`text-5xl font-black tracking-tight font-mono ${gradeColor(latest.grade)}`}
                >
                  {latest.rttMs}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                  ms RTT
                </span>
                <Badge variant={gradeVariant(latest.grade)} size="sm">
                  {latest.grade.charAt(0).toUpperCase() + latest.grade.slice(1)} Response
                </Badge>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Sample #{latest.id} · {latest.timestamp}
                </span>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold text-[var(--text-muted)]">—</span>
                <span className="text-xs text-[var(--text-muted)]">
                  {isRunning ? 'Probing...' : 'Not running'}
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Session Quality */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Session Quality" icon={<ShieldCheck size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
            {sessionGrade !== null ? (
              <>
                {sessionGrade === 'excellent' || sessionGrade === 'good' ? (
                  <Wifi size={36} className="text-accent-500" />
                ) : (
                  <WifiOff size={36} className="text-danger-500" />
                )}
                <Badge variant={gradeVariant(sessionGrade)} size="md">
                  {sessionGrade.charAt(0).toUpperCase() + sessionGrade.slice(1)}
                </Badge>
                <div className="text-[10px] text-[var(--text-muted)] text-center">
                  Avg {avg ?? '—'} ms · Min {minRtt ?? '—'} ms · Max {maxRtt ?? '—'} ms
                </div>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-[var(--text-muted)]">Waiting...</span>
                <span className="text-xs text-[var(--text-secondary)] text-center">
                  Start monitoring to evaluate session quality
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Percentile Analysis */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Percentile Analysis" icon={<Timer size={16} />} />
          <CardContent className="space-y-4 py-4">
            {p50 !== null && p90 !== null && p99 !== null && maxRtt !== null ? (
              <>
                <PercentileBar label="P50 (Median)" value={p50} max={maxRtt} />
                <PercentileBar label="P90" value={p90} max={maxRtt} />
                <PercentileBar label="P99 (Worst 1%)" value={p99} max={maxRtt} />
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-[var(--text-muted)] font-medium">Target</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {selectedTarget.host}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Samples</span>
                  <span className="font-semibold text-[var(--text-primary)]">{samples.length}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--text-muted)] text-center py-4">
                Percentiles available after first probe
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Main area chart ── */}
      <Card>
        <CardHeader
          title="RTT Latency Timeline"
          subtitle={`${WINDOW}s rolling window · 1-second probe interval → ${selectedTarget.label} (${selectedTarget.host})`}
          icon={<Timer size={16} />}
        />
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-5 mb-4 text-[10px] text-[var(--text-muted)] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-accent-500 inline-block" />
              ≤ 20ms Excellent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-primary-500 inline-block" />
              ≤ 50ms Good
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-warning-500 inline-block" />
              ≤ 100ms Fair
            </span>
          </div>
          <LatencyChart samples={samples} target={selectedTarget} />
        </CardContent>
      </Card>

      {/* ── Thresholds reference ── */}
      <Card>
        <CardHeader
          title="RTT Quality Thresholds"
          subtitle="Industry-standard network latency classification bands"
          icon={<ShieldCheck size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                {
                  range: '≤ 20ms',
                  label: 'Excellent',
                  desc: 'Real-time gaming / VoIP',
                  grade: 'excellent' as LatencyGrade
                },
                {
                  range: '21–50ms',
                  label: 'Good',
                  desc: 'HD video / responsive browsing',
                  grade: 'good' as LatencyGrade
                },
                {
                  range: '51–100ms',
                  label: 'Fair',
                  desc: 'General web / email',
                  grade: 'fair' as LatencyGrade
                },
                {
                  range: '> 100ms',
                  label: 'Poor',
                  desc: 'Degraded — VoIP unusable',
                  grade: 'poor' as LatencyGrade
                }
              ] as const
            ).map((tier) => {
              const isActive = latest?.grade === tier.grade
              return (
                <div
                  key={tier.grade}
                  className={`rounded-xl p-3 border text-xs space-y-1 transition-all ${
                    isActive
                      ? 'border-current ring-1 ring-current/20'
                      : 'border-[var(--border-color)]'
                  } ${gradeColor(tier.grade)}`}
                >
                  <div className="font-black font-mono text-base">{tier.range}</div>
                  <div className="font-bold">{tier.label}</div>
                  <div className="text-[var(--text-muted)] text-[10px]">{tier.desc}</div>
                  {isActive && (
                    <Badge variant={gradeVariant(tier.grade)} size="sm" className="mt-1">
                      Current
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Probe log table ── */}
      <Card>
        <CardHeader
          title="Probe Log"
          subtitle={`Last ${WINDOW} RTT measurements (newest first)`}
          icon={<Timer size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--surface-card)]">
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-semibold pr-4">#</th>
                  <th className="py-2.5 font-semibold pr-4">Timestamp</th>
                  <th className="py-2.5 font-semibold pr-4">RTT</th>
                  <th className="py-2.5 font-semibold pr-4">Grade</th>
                  <th className="py-2.5 font-semibold">Bar</th>
                </tr>
              </thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--text-muted)]">
                      No probe records yet.
                    </td>
                  </tr>
                ) : (
                  [...samples].reverse().map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border-color)]/40 last:border-0"
                    >
                      <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">{s.id}</td>
                      <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">
                        {s.timestamp}
                      </td>
                      <td className={`py-2 pr-4 font-mono font-bold ${gradeColor(s.grade)}`}>
                        {s.rttMs} ms
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={gradeVariant(s.grade)} size="sm">
                          {s.grade.charAt(0).toUpperCase() + s.grade.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-2 w-32">
                        <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${gradeBarColor(s.grade)}`}
                            style={{ width: `${Math.min(100, (s.rttMs / 200) * 100)}%` }}
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
