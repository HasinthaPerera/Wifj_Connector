import { useState, useEffect, useCallback, useRef } from 'react'
import { BarChart3, RefreshCw, ArrowDown, ArrowUp, Play, Square } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface BandwidthSample {
  t: number // monotonic index
  dlKbps: number // download KB/s
  ulKbps: number // upload KB/s
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

/** Samples kept in the rolling window */
const WINDOW = 60
/** Poll interval in ms */
const INTERVAL_MS = 1000
/** Peak scale ceiling in KB/s — chart auto-scales above this */
const BASELINE_CEIL = 2048

/* ─────────────────────────────────────────────────────────────
   Simulation engine
   Models a home broadband connection with realistic fluctuations:
   - Base ~94 Mbps download / ~41 Mbps upload
   - Occasional TCP slow-start dips and congestion bursts
───────────────────────────────────────────────────────────── */

interface SimState {
  dlBase: number
  ulBase: number
}

function initSim(): SimState {
  return { dlBase: 9600, ulBase: 4200 } // ~75 Mbps / ~33 Mbps in KB/s
}

function tickSim(state: SimState): { state: SimState; dlKbps: number; ulKbps: number } {
  const drift = (cur: number, target: number, speed: number): number => {
    const noise = Math.random() * speed - speed / 2
    const newVal = cur + noise
    return Math.max(target * 0.3, Math.min(target * 1.6, newVal))
  }

  const newDlBase = drift(state.dlBase, 9600, 400)
  const newUlBase = drift(state.ulBase, 4200, 200)

  // Occasional congestion spike (5%) or dead zone (3%)
  const dlSpike = Math.random() < 0.05 ? Math.random() * 2048 : 0
  const dlDrop = Math.random() < 0.03 ? -newDlBase * 0.6 : 0
  const ulSpike = Math.random() < 0.04 ? Math.random() * 1024 : 0
  const ulDrop = Math.random() < 0.02 ? -newUlBase * 0.5 : 0

  const dlKbps = Math.max(0, Math.round(newDlBase + dlSpike + dlDrop))
  const ulKbps = Math.max(0, Math.round(newUlBase + ulSpike + ulDrop))

  return { state: { dlBase: newDlBase, ulBase: newUlBase }, dlKbps, ulKbps }
}

/* ─────────────────────────────────────────────────────────────
   Formatters
───────────────────────────────────────────────────────────── */

function fmtRate(kbps: number): string {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`
  return `${kbps} KB/s`
}

function fmtBytes(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(2)} GB`
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

type RateGrade = 'excellent' | 'good' | 'fair' | 'poor'

function gradeRate(kbps: number): RateGrade {
  if (kbps >= 12800) return 'excellent' // ≥ 100 Mbps
  if (kbps >= 3200) return 'good' // ≥ 25 Mbps
  if (kbps >= 640) return 'fair' // ≥ 5 Mbps
  return 'poor'
}

function gradeVariant(g: RateGrade): 'accent' | 'primary' | 'warning' | 'danger' {
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

/* ─────────────────────────────────────────────────────────────
   Dual-line area chart (SVG)
   Renders download (primary) and upload (accent) on the same axis,
   auto-scaling to the rolling window peak.
───────────────────────────────────────────────────────────── */

interface BandwidthChartProps {
  samples: BandwidthSample[]
  showDownload: boolean
  showUpload: boolean
}

function BandwidthChart({
  samples,
  showDownload,
  showUpload
}: BandwidthChartProps): React.JSX.Element {
  const W = 600
  const H = 120
  const PAD = 6

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2

  const allValues = [
    ...(showDownload ? samples.map((s) => s.dlKbps) : []),
    ...(showUpload ? samples.map((s) => s.ulKbps) : []),
    BASELINE_CEIL
  ]
  const peak = Math.max(...allValues, 1)

  const yOf = (kbps: number): number => PAD + (1 - kbps / peak) * innerH

  const step = innerW / Math.max(WINDOW - 1, 1)

  // Pad left with empty space when < WINDOW samples exist
  const offset = (WINDOW - samples.length) * step

  const dlPoints = samples.map((s, i) => `${PAD + offset + i * step},${yOf(s.dlKbps)}`).join(' ')

  const ulPoints = samples.map((s, i) => `${PAD + offset + i * step},${yOf(s.ulKbps)}`).join(' ')

  const lastDlX = PAD + offset + (samples.length - 1) * step
  const lastUlX = lastDlX
  const lastDlY = samples.length > 0 ? yOf(samples[samples.length - 1].dlKbps) : H / 2
  const lastUlY = samples.length > 0 ? yOf(samples[samples.length - 1].ulKbps) : H / 2

  // Y-axis tick labels
  const ticks = [0.25, 0.5, 0.75, 1.0].map((frac) => ({
    frac,
    value: Math.round(peak * (1 - frac)),
    y: PAD + frac * innerH
  }))

  if (samples.length < 2) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg">
        Collecting data — chart populates after 2 samples...
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Y-axis labels */}
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-[var(--text-muted)] font-mono pr-1 py-1.5"
        style={{ width: 48 }}
      >
        {ticks.map((t) => (
          <span key={t.frac} className="leading-none">
            {fmtRate(t.value)}
          </span>
        ))}
      </div>

      <div className="ml-12">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-32"
          preserveAspectRatio="none"
          aria-label="Bandwidth chart"
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

          {/* Download area + line */}
          {showDownload && samples.length >= 2 && (
            <>
              <polyline
                points={`${PAD + offset},${H - PAD} ${dlPoints} ${lastDlX},${H - PAD}`}
                fill="url(#dlAreaGrad)"
                fillOpacity="0.15"
                stroke="none"
              />
              <polyline
                points={dlPoints}
                fill="none"
                stroke="var(--color-primary, #6366f1)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={lastDlX} cy={lastDlY} r="3.5" fill="var(--color-primary, #6366f1)" />
            </>
          )}

          {/* Upload area + line */}
          {showUpload && samples.length >= 2 && (
            <>
              <polyline
                points={`${PAD + offset},${H - PAD} ${ulPoints} ${lastUlX},${H - PAD}`}
                fill="url(#ulAreaGrad)"
                fillOpacity="0.15"
                stroke="none"
              />
              <polyline
                points={ulPoints}
                fill="none"
                stroke="var(--color-accent, #10b981)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="5 2"
              />
              <circle cx={lastUlX} cy={lastUlY} r="3.5" fill="var(--color-accent, #10b981)" />
            </>
          )}

          <defs>
            <linearGradient id="dlAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ulAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent, #10b981)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-accent, #10b981)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis time label */}
        <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono mt-1 px-1">
          <span>−{WINDOW}s</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Inline mini-sparkline (used in stat cards)
───────────────────────────────────────────────────────────── */

function MiniSparkline({
  values,
  color,
  id
}: {
  values: number[]
  color: string
  id: string
}): React.JSX.Element {
  const W = 100
  const H = 24
  const PAD = 2

  if (values.length < 2) return <div className="h-6" />

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const range = max - min
  const step = innerW / (values.length - 1)

  const pts = values
    .map((v, i) => `${PAD + i * step},${PAD + (1 - (v - min) / range) * innerH}`)
    .join(' ')

  const lastX = PAD + (values.length - 1) * step
  const lastY = PAD + (1 - (values[values.length - 1] - min) / range) * innerH

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-6"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={`${PAD},${H - PAD} ${pts} ${lastX},${H - PAD}`}
        fill={`url(#${id})`}
        fillOpacity="0.15"
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   BandwidthPage
───────────────────────────────────────────────────────────── */

/**
 * BandwidthPage — Real-time bandwidth speed chart page.
 * Simulates live download/upload throughput sampling at 1-second intervals,
 * rendering dual-trace area charts, rolling statistics, and session totals.
 */
export function BandwidthPage(): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [samples, setSamples] = useState<BandwidthSample[]>([])
  const [showDownload, setShowDownload] = useState(true)
  const [showUpload, setShowUpload] = useState(true)

  // Session totals (in KB)
  const [totalDlKb, setTotalDlKb] = useState(0)
  const [totalUlKb, setTotalUlKb] = useState(0)

  const tickRef = useRef(0)
  const simStateRef = useRef<SimState>(initSim())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const runTick = useCallback(() => {
    tickRef.current += 1
    const t = tickRef.current
    const { state, dlKbps, ulKbps } = tickSim(simStateRef.current)
    simStateRef.current = state

    setSamples((prev) => [...prev.slice(-(WINDOW - 1)), { t, dlKbps, ulKbps }])
    setTotalDlKb((prev) => prev + dlKbps)
    setTotalUlKb((prev) => prev + ulKbps)
  }, [])

  const start = useCallback(() => {
    setSamples([])
    setTotalDlKb(0)
    setTotalUlKb(0)
    tickRef.current = 0
    simStateRef.current = initSim()
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

  const reset = useCallback(() => {
    stop()
    setSamples([])
    setTotalDlKb(0)
    setTotalUlKb(0)
    tickRef.current = 0
    simStateRef.current = initSim()
  }, [stop])

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  /* ── Derived stats ── */
  const latest = samples[samples.length - 1] ?? null

  const dlKbps = latest?.dlKbps ?? 0
  const ulKbps = latest?.ulKbps ?? 0

  const dlHistory = samples.map((s) => s.dlKbps)
  const ulHistory = samples.map((s) => s.ulKbps)

  const avgDl =
    dlHistory.length > 0 ? Math.round(dlHistory.reduce((a, b) => a + b, 0) / dlHistory.length) : 0
  const avgUl =
    ulHistory.length > 0 ? Math.round(ulHistory.reduce((a, b) => a + b, 0) / ulHistory.length) : 0

  const peakDl = dlHistory.length > 0 ? Math.max(...dlHistory) : 0
  const peakUl = ulHistory.length > 0 ? Math.max(...ulHistory) : 0

  const dlGrade = gradeRate(dlKbps)
  const ulGrade = gradeRate(ulKbps)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Bandwidth Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Real-time download and upload throughput charts with {WINDOW}s rolling window
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* Trace toggles */}
          <button
            onClick={() => setShowDownload((v) => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              showDownload
                ? 'bg-primary-50 border-primary-300 text-primary-600 dark:bg-primary-950 dark:border-primary-700 dark:text-primary-300'
                : 'border-[var(--border-color)] text-[var(--text-muted)]'
            }`}
          >
            <ArrowDown size={11} />
            Download
          </button>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              showUpload
                ? 'bg-accent-50 border-accent-300 text-accent-600 dark:bg-accent-950 dark:border-accent-700 dark:text-accent-300'
                : 'border-[var(--border-color)] text-[var(--text-muted)]'
            }`}
          >
            <ArrowUp size={11} />
            Upload
          </button>

          <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={reset}>
            Reset
          </Button>

          {isRunning ? (
            <Button variant="danger" size="sm" leftIcon={<Square size={14} />} onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button variant="primary" size="sm" leftIcon={<Play size={14} />} onClick={start}>
              Start
            </Button>
          )}
        </div>
      </div>

      {/* ── Live rate cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Download card */}
        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Download Rate"
            icon={<ArrowDown className="text-primary-500" size={16} />}
          />
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-black font-mono text-primary-500 leading-none">
                  {latest ? (dlKbps >= 1024 ? (dlKbps / 1024).toFixed(1) : dlKbps) : '—'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1.5 font-bold uppercase tracking-widest">
                  {dlKbps >= 1024 ? 'Mbps' : 'KB/s'}
                </span>
              </div>
              {latest && (
                <Badge variant={gradeVariant(dlGrade)} size="sm">
                  {dlGrade}
                </Badge>
              )}
            </div>
            <MiniSparkline
              values={dlHistory.slice(-20)}
              color="var(--color-primary, #6366f1)"
              id="dlMini"
            />
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
              <div>
                <div className="font-semibold uppercase tracking-wider">Avg</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(avgDl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Peak</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(peakDl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Total</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtBytes(totalDlKb)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Samples</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {samples.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload card */}
        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Upload Rate"
            icon={<ArrowUp className="text-accent-500" size={16} />}
          />
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-4xl font-black font-mono text-accent-500 leading-none">
                  {latest ? (ulKbps >= 1024 ? (ulKbps / 1024).toFixed(1) : ulKbps) : '—'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-1.5 font-bold uppercase tracking-widest">
                  {ulKbps >= 1024 ? 'Mbps' : 'KB/s'}
                </span>
              </div>
              {latest && (
                <Badge variant={gradeVariant(ulGrade)} size="sm">
                  {ulGrade}
                </Badge>
              )}
            </div>
            <MiniSparkline
              values={ulHistory.slice(-20)}
              color="var(--color-accent, #10b981)"
              id="ulMini"
            />
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
              <div>
                <div className="font-semibold uppercase tracking-wider">Avg</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(avgUl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Peak</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(peakUl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Total</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtBytes(totalUlKb)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Ratio</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {avgDl > 0 ? `${(avgDl / Math.max(avgUl, 1)).toFixed(1)}:1` : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main dual-trace chart ── */}
      <Card>
        <CardHeader
          title="Throughput Timeline"
          subtitle={`${WINDOW}-second rolling window · 1-second sampling interval`}
          icon={<BarChart3 size={16} />}
        />
        <CardContent>
          {/* Legend */}
          <div className="flex gap-6 mb-4 text-[10px] text-[var(--text-muted)] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-primary-500 inline-block rounded" />
              Download (solid)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-accent-500 inline-block rounded" />
              Upload (dashed)
            </span>
          </div>

          <BandwidthChart samples={samples} showDownload={showDownload} showUpload={showUpload} />
        </CardContent>
      </Card>

      {/* ── Speed tier reference ── */}
      <Card>
        <CardHeader
          title="Bandwidth Tier Reference"
          subtitle="FCC-aligned broadband classification thresholds"
          icon={<BarChart3 size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                {
                  label: 'Excellent',
                  range: '≥ 100 Mbps',
                  desc: 'Ultra HD 4K / cloud gaming',
                  grade: 'excellent' as RateGrade
                },
                {
                  label: 'Good',
                  range: '25–100 Mbps',
                  desc: 'HD streaming / video calls',
                  grade: 'good' as RateGrade
                },
                {
                  label: 'Fair',
                  range: '5–25 Mbps',
                  desc: 'Standard browsing / SD video',
                  grade: 'fair' as RateGrade
                },
                {
                  label: 'Poor',
                  range: '< 5 Mbps',
                  desc: 'Basic web / degraded VoIP',
                  grade: 'poor' as RateGrade
                }
              ] as const
            ).map((tier) => {
              const isActive = dlGrade === tier.grade && isRunning
              return (
                <div
                  key={tier.grade}
                  className={`rounded-xl p-3 border text-xs space-y-1 transition-all ${
                    isActive
                      ? 'border-current ring-1 ring-current/20'
                      : 'border-[var(--border-color)]'
                  } ${
                    tier.grade === 'excellent'
                      ? 'text-accent-500'
                      : tier.grade === 'good'
                        ? 'text-primary-500'
                        : tier.grade === 'fair'
                          ? 'text-warning-500'
                          : 'text-danger-500'
                  }`}
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
    </div>
  )
}
