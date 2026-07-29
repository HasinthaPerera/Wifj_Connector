import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  BarChart3,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Play,
  Square,
  Radio
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge, StatusPill } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface BandwidthSample {
  t: number // monotonic timestamp index
  timeLabel: string
  dlKbps: number // download KB/s
  ulKbps: number // upload KB/s
}

interface NetworkIfaceIO {
  name: string
  rxKbps: number
  txKbps: number
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

/** Samples kept in the rolling window */
const WINDOW = 60
/** Default poll interval in ms */
const DEFAULT_INTERVAL_MS = 1000
/** Peak scale ceiling in KB/s — chart auto-scales above this */
const BASELINE_CEIL = 2048

/* ─────────────────────────────────────────────────────────────
   Simulation engine (Fallback when hardware IPC is unavail)
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
   Dual-line area chart with interactive inspection tooltip
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const W = 600
  const H = 140
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
  const offset = (WINDOW - samples.length) * step

  const dlPoints = samples.map((s, i) => `${PAD + offset + i * step},${yOf(s.dlKbps)}`).join(' ')
  const ulPoints = samples.map((s, i) => `${PAD + offset + i * step},${yOf(s.ulKbps)}`).join(' ')

  const lastDlX = PAD + offset + (samples.length - 1) * step
  const lastUlX = lastDlX
  const lastDlY = samples.length > 0 ? yOf(samples[samples.length - 1].dlKbps) : H / 2
  const lastUlY = samples.length > 0 ? yOf(samples[samples.length - 1].ulKbps) : H / 2

  const ticks = [0.25, 0.5, 0.75, 1.0].map((frac) => ({
    frac,
    value: Math.round(peak * (1 - frac)),
    y: PAD + frac * innerH
  }))

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
    if (samples.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    const relX = mouseX - (PAD + offset)
    const idx = Math.round(relX / step)
    if (idx >= 0 && idx < samples.length) {
      setHoverIndex(idx)
    } else {
      setHoverIndex(null)
    }
  }

  if (samples.length < 2) {
    return (
      <div className="w-full h-36 flex items-center justify-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg">
        Collecting live traffic data — chart populates after 2 samples...
      </div>
    )
  }

  const hoverSample = hoverIndex !== null ? samples[hoverIndex] : null
  const hoverX = hoverIndex !== null ? PAD + offset + hoverIndex * step : 0

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

      <div className="ml-12 relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-36 overflow-visible cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
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
          {showDownload && (
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
                stroke="var(--color-primary-500, #6366f1)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={lastDlX} cy={lastDlY} r="3.5" fill="var(--color-primary-500, #6366f1)" />
            </>
          )}

          {/* Upload area + line */}
          {showUpload && (
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
                stroke="var(--color-accent-500, #10b981)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="5 2"
              />
              <circle cx={lastUlX} cy={lastUlY} r="3.5" fill="var(--color-accent-500, #10b981)" />
            </>
          )}

          {/* Hover indicator vertical line */}
          {hoverSample && (
            <line
              x1={hoverX}
              y1={PAD}
              x2={hoverX}
              y2={H - PAD}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          <defs>
            <linearGradient id="dlAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-500, #6366f1)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-primary-500, #6366f1)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ulAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-500, #10b981)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-accent-500, #10b981)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoverSample && (
          <div
            className="absolute top-2 pointer-events-none bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg rounded-lg p-2 text-[10px] space-y-1 z-10 font-mono"
            style={{
              left: Math.min(Math.max(hoverX - 60, 0), W - 140)
            }}
          >
            <div className="text-[var(--text-muted)] font-semibold border-b border-[var(--border-color)] pb-0.5">
              Time: {hoverSample.timeLabel}
            </div>
            {showDownload && (
              <div className="flex items-center justify-between gap-3 text-primary-500">
                <span>Download:</span>
                <span className="font-bold">{fmtRate(hoverSample.dlKbps)}</span>
              </div>
            )}
            {showUpload && (
              <div className="flex items-center justify-between gap-3 text-accent-500">
                <span>Upload:</span>
                <span className="font-bold">{fmtRate(hoverSample.ulKbps)}</span>
              </div>
            )}
          </div>
        )}

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
   Inline mini-sparkline
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
 * BandwidthPage — Real-time bandwidth monitor component.
 * Integrates live IPC network interface sampling from main process with
 * fallback broadband simulation, configurable poll rates, and dual-trace metrics.
 */
export function BandwidthPage(): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(true)
  const [samples, setSamples] = useState<BandwidthSample[]>([])
  const [showDownload, setShowDownload] = useState(true)
  const [showUpload, setShowUpload] = useState(true)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS)
  const [selectedIface, setSelectedIface] = useState<string>('all')

  const [availableIfaces, setAvailableIfaces] = useState<NetworkIfaceIO[]>([])
  const [isHardwareApi, setIsHardwareApi] = useState(false)

  // Session totals (in KB)
  const [totalDlKb, setTotalDlKb] = useState(0)
  const [totalUlKb, setTotalUlKb] = useState(0)

  const tickRef = useRef(0)
  const simStateRef = useRef<SimState>(initSim())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSample = useCallback(async () => {
    tickRef.current += 1
    const t = tickRef.current
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    let dlKbps = 0
    let ulKbps = 0

    try {
      if (typeof window.api?.getResources === 'function') {
        const res = await window.api.getResources()
        if (res && Array.isArray(res.network) && res.network.length > 0) {
          setIsHardwareApi(!res.isSimulated)
          setAvailableIfaces(res.network)

          if (selectedIface === 'all') {
            dlKbps = res.network.reduce((s, n) => s + n.rxKbps, 0)
            ulKbps = res.network.reduce((s, n) => s + n.txKbps, 0)
          } else {
            const target = res.network.find((n) => n.name === selectedIface)
            if (target) {
              dlKbps = target.rxKbps
              ulKbps = target.txKbps
            }
          }

          // If real network stats yield zeroes (e.g. initial baseline), add minimal activity
          if (dlKbps === 0 && ulKbps === 0 && res.isSimulated) {
            const sim = tickSim(simStateRef.current)
            simStateRef.current = sim.state
            dlKbps = sim.dlKbps
            ulKbps = sim.ulKbps
          }
        } else {
          const sim = tickSim(simStateRef.current)
          simStateRef.current = sim.state
          dlKbps = sim.dlKbps
          ulKbps = sim.ulKbps
        }
      } else {
        const sim = tickSim(simStateRef.current)
        simStateRef.current = sim.state
        dlKbps = sim.dlKbps
        ulKbps = sim.ulKbps
      }
    } catch {
      const sim = tickSim(simStateRef.current)
      simStateRef.current = sim.state
      dlKbps = sim.dlKbps
      ulKbps = sim.ulKbps
    }

    setSamples((prev) => [...prev.slice(-(WINDOW - 1)), { t, timeLabel, dlKbps, ulKbps }])
    setTotalDlKb((prev) => prev + dlKbps)
    setTotalUlKb((prev) => prev + ulKbps)
  }, [selectedIface])

  const start = useCallback(() => {
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    setSamples([])
    setTotalDlKb(0)
    setTotalUlKb(0)
    tickRef.current = 0
    simStateRef.current = initSim()
  }, [])

  /* Manage timer based on isRunning and intervalMs */
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }

    fetchSample()
    timerRef.current = setInterval(fetchSample, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning, intervalMs, fetchSample])

  /* ── Derived stats ── */
  const latest = samples[samples.length - 1] ?? null
  const dlKbps = latest?.dlKbps ?? 0
  const ulKbps = latest?.ulKbps ?? 0

  const dlHistory = useMemo(() => samples.map((s) => s.dlKbps), [samples])
  const ulHistory = useMemo(() => samples.map((s) => s.ulKbps), [samples])

  const avgDl = useMemo(
    () => (dlHistory.length > 0 ? Math.round(dlHistory.reduce((a, b) => a + b, 0) / dlHistory.length) : 0),
    [dlHistory]
  )
  const avgUl = useMemo(
    () => (ulHistory.length > 0 ? Math.round(ulHistory.reduce((a, b) => a + b, 0) / ulHistory.length) : 0),
    [ulHistory]
  )

  const peakDl = useMemo(() => (dlHistory.length > 0 ? Math.max(...dlHistory) : 0), [dlHistory])
  const peakUl = useMemo(() => (ulHistory.length > 0 ? Math.max(...ulHistory) : 0), [ulHistory])

  const dlGrade = gradeRate(dlKbps)
  const ulGrade = gradeRate(ulKbps)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Bandwidth Monitor</h1>
            <StatusPill
              state={isRunning ? 'connected' : 'disconnected'}
              label={isRunning ? 'Live Polling' : 'Paused'}
              size="sm"
            />
            {isHardwareApi ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-400 border border-accent-200 dark:border-accent-800">
                Hardware API
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
                Simulated Traffic
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time throughput metrics with {WINDOW}s rolling dual-trace timeline
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap justify-end">
          {/* Interface dropdown */}
          {availableIfaces.length > 1 && (
            <select
              value={selectedIface}
              onChange={(e) => setSelectedIface(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
            >
              <option value="all">All Adapters</option>
              {availableIfaces.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          )}

          {/* Interval selector */}
          <select
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value))}
            className="text-xs px-2 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
            title="Sampling Interval"
          >
            <option value={1000}>1s interval</option>
            <option value={2000}>2s interval</option>
            <option value={5000}>5s interval</option>
          </select>

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
            title="Download Throughput"
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
              color="var(--color-primary-500, #6366f1)"
              id="dlMini"
            />
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
              <div>
                <div className="font-semibold uppercase tracking-wider">Avg Rate</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(avgDl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Peak Rate</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(peakDl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Total Downloaded</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtBytes(totalDlKb)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Sample Count</div>
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
            title="Upload Throughput"
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
              color="var(--color-accent-500, #10b981)"
              id="ulMini"
            />
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
              <div>
                <div className="font-semibold uppercase tracking-wider">Avg Rate</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(avgUl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Peak Rate</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtRate(peakUl)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">Total Uploaded</div>
                <div className="font-mono font-bold text-[var(--text-primary)]">
                  {fmtBytes(totalUlKb)}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider">DL : UL Ratio</div>
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
          subtitle={`${WINDOW}-sample rolling timeline · ${(intervalMs / 1000).toFixed(0)}s interval · Hover chart to inspect exact rates`}
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
          icon={<Radio size={16} />}
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
                      Current Tier
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
