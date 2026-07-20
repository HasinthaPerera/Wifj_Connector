import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Play, Square, Settings2, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge, ProgressBar } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

/** Outcome of a single probe burst */
type ProbeStatus = 'received' | 'lost'

interface ProbeRecord {
  id: number
  timestamp: string
  sent: number
  received: number
  lost: number
  lossRatePct: number
  latencyMs: number | null
  status: ProbeStatus
}

interface TargetConfig {
  label: string
  host: string
  /** Baseline simulated loss probability [0–1] */
  baseLossProb: number
  /** Baseline simulated RTT in ms */
  baseRtt: number
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const TARGETS: TargetConfig[] = [
  { label: 'Google DNS', host: '8.8.8.8', baseLossProb: 0.02, baseRtt: 14 },
  { label: 'Cloudflare DNS', host: '1.1.1.1', baseLossProb: 0.015, baseRtt: 11 },
  { label: 'Gateway', host: '192.168.1.1', baseLossProb: 0.005, baseRtt: 2 }
]

/** Packets sent per probe burst */
const BURST_SIZE = 10
const MAX_RECORDS = 40
const INTERVAL_MS = 2000

/* ─────────────────────────────────────────────────────────────
   Pure helpers
───────────────────────────────────────────────────────────── */

type LossGrade = 'none' | 'low' | 'moderate' | 'severe'

function gradeLoss(pct: number): LossGrade {
  if (pct === 0) return 'none'
  if (pct <= 2) return 'low'
  if (pct <= 10) return 'moderate'
  return 'severe'
}

function gradeVariant(grade: LossGrade): 'accent' | 'primary' | 'warning' | 'danger' {
  switch (grade) {
    case 'none':
      return 'accent'
    case 'low':
      return 'primary'
    case 'moderate':
      return 'warning'
    case 'severe':
      return 'danger'
  }
}

function gradeLabel(grade: LossGrade): string {
  switch (grade) {
    case 'none':
      return 'No Loss'
    case 'low':
      return 'Low Loss'
    case 'moderate':
      return 'Moderate Loss'
    case 'severe':
      return 'Severe Loss'
  }
}

function gradeColor(grade: LossGrade): string {
  switch (grade) {
    case 'none':
      return 'text-accent-500'
    case 'low':
      return 'text-primary-500'
    case 'moderate':
      return 'text-warning-500'
    case 'severe':
      return 'text-danger-500'
  }
}

function progressVariant(grade: LossGrade): 'accent' | 'primary' | 'warning' | 'danger' {
  return gradeVariant(grade)
}

/**
 * Simulate a burst of BURST_SIZE ICMP pings.
 * Returns per-packet outcomes and an average RTT for received packets.
 */
function simulateBurst(target: TargetConfig): {
  received: number
  lost: number
  lossRatePct: number
  latencyMs: number | null
} {
  let received = 0
  let totalRtt = 0

  for (let i = 0; i < BURST_SIZE; i++) {
    // Add occasional congestion spikes that temporarily inflate loss
    const congestionBump = Math.random() < 0.06 ? 0.3 : 0
    const isLost = Math.random() < target.baseLossProb + congestionBump
    if (!isLost) {
      received++
      const jitter = Math.random() * 14 - 4
      const spike = Math.random() < 0.04 ? Math.random() * 60 : 0
      totalRtt += Math.max(1, target.baseRtt + jitter + spike)
    }
  }

  const lost = BURST_SIZE - received
  const lossRatePct = Math.round((lost / BURST_SIZE) * 1000) / 10
  const latencyMs = received > 0 ? Math.round(totalRtt / received) : null

  return { received, lost, lossRatePct, latencyMs }
}

/* ─────────────────────────────────────────────────────────────
   Loss history SVG bar chart
───────────────────────────────────────────────────────────── */

function LossBarChart({ records }: { records: ProbeRecord[] }): React.JSX.Element {
  const W = 600
  const H = 80
  const PAD = 4
  const maxLoss = 100

  if (records.length === 0) {
    return (
      <div className="w-full h-20 flex items-center justify-center text-xs text-[var(--text-muted)]">
        Collecting samples — chart populates after first probe burst...
      </div>
    )
  }

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const barW = Math.max(4, Math.floor(innerW / MAX_RECORDS) - 2)
  const step = innerW / MAX_RECORDS

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-20"
      preserveAspectRatio="none"
      aria-label="Packet loss history bar chart"
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

      {/* Bars */}
      {records.map((r, i) => {
        const grade = gradeLoss(r.lossRatePct)
        const barH = Math.max(2, (r.lossRatePct / maxLoss) * innerH)
        const x = PAD + i * step
        const y = PAD + innerH - barH
        const fill =
          grade === 'none'
            ? 'var(--color-accent, #10b981)'
            : grade === 'low'
              ? 'var(--color-primary, #6366f1)'
              : grade === 'moderate'
                ? 'var(--color-warning, #f59e0b)'
                : 'var(--color-danger, #ef4444)'

        return (
          <rect
            key={r.id}
            x={x}
            y={y}
            width={barW}
            height={barH}
            fill={fill}
            rx="1.5"
            opacity="0.85"
          />
        )
      })}

      {/* Baseline (0% line) */}
      <line
        x1={PAD}
        y1={H - PAD}
        x2={W - PAD}
        y2={H - PAD}
        stroke="currentColor"
        strokeWidth="1"
        className="text-[var(--border-color)]"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   PacketLossPage
───────────────────────────────────────────────────────────── */

/**
 * PacketLossPage — Continuously sends simulated ICMP burst probes and tracks
 * per-burst packet loss rates, cumulative totals, and session-level statistics.
 * Each burst sends BURST_SIZE packets and measures how many are dropped.
 */
export function PacketLossPage(): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false)
  const [records, setRecords] = useState<ProbeRecord[]>([])
  const [selectedTarget, setSelectedTarget] = useState<TargetConfig>(TARGETS[0])
  const [showTargetPicker, setShowTargetPicker] = useState(false)

  const tickRef = useRef(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const runProbeBurst = useCallback(() => {
    tickRef.current += 1
    const id = tickRef.current

    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const { received, lost, lossRatePct, latencyMs } = simulateBurst(selectedTarget)
    const status: ProbeStatus = lost === BURST_SIZE ? 'lost' : 'received'

    const record: ProbeRecord = {
      id,
      timestamp: now,
      sent: BURST_SIZE,
      received,
      lost,
      lossRatePct,
      latencyMs,
      status
    }

    setRecords((prev) => [...prev.slice(-(MAX_RECORDS - 1)), record])
  }, [selectedTarget])

  const startMonitoring = useCallback(() => {
    setIsRunning(true)
    setRecords([])
    tickRef.current = 0
    timerRef.current = setInterval(runProbeBurst, INTERVAL_MS)
  }, [runProbeBurst])

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

  /* Restart interval on target/cycle change */
  useEffect(() => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(runProbeBurst, INTERVAL_MS)
    }
  }, [isRunning, runProbeBurst])

  /* ── Derived statistics ── */
  const latest = records[records.length - 1] ?? null

  const totalSent = records.reduce((s, r) => s + r.sent, 0)
  const totalReceived = records.reduce((s, r) => s + r.received, 0)
  const totalLost = records.reduce((s, r) => s + r.lost, 0)
  const sessionLossPct = totalSent > 0 ? Math.round((totalLost / totalSent) * 1000) / 10 : 0

  const sessionGrade = gradeLoss(sessionLossPct)
  const latestGrade = latest ? gradeLoss(latest.lossRatePct) : null

  const validLatencies = records.filter((r) => r.latencyMs !== null).map((r) => r.latencyMs!)
  const avgLatency =
    validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : null

  const burstLossPct = records.map((r) => r.lossRatePct)
  const peakLoss = burstLossPct.length > 0 ? Math.max(...burstLossPct) : null

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Packet Loss Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Diagnose network quality by sending {BURST_SIZE}-packet ICMP bursts and tracking drop
            rates
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

      {/* ── Stat cards (top row) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current burst loss */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Current Burst Loss" icon={<AlertTriangle size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-2">
            {latest ? (
              <>
                <span
                  className={`text-5xl font-black tracking-tight font-mono ${latestGrade ? gradeColor(latestGrade) : ''}`}
                >
                  {latest.lossRatePct}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                  % packet loss
                </span>
                {latestGrade && (
                  <Badge variant={gradeVariant(latestGrade)} size="sm">
                    {gradeLabel(latestGrade)}
                  </Badge>
                )}
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {latest.received}/{latest.sent} received ·{' '}
                  {latest.latencyMs !== null ? `${latest.latencyMs} ms` : 'timeout'}
                </span>
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

        {/* Session stability */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Session Quality" icon={<ShieldCheck size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
            {records.length > 0 ? (
              <>
                {sessionGrade === 'none' || sessionGrade === 'low' ? (
                  <Wifi size={36} className="text-accent-500" />
                ) : (
                  <WifiOff size={36} className="text-danger-500" />
                )}
                <Badge variant={gradeVariant(sessionGrade)} size="md">
                  {gradeLabel(sessionGrade)}
                </Badge>
                <div className="w-full px-4 pt-1">
                  <ProgressBar
                    value={Math.min(100, sessionLossPct * 5)}
                    variant={progressVariant(sessionGrade)}
                    size="sm"
                    showLabel={false}
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                    <span>0%</span>
                    <span>{sessionLossPct}% avg loss</span>
                    <span>20%+</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-[var(--text-muted)]">Waiting...</span>
                <span className="text-xs text-[var(--text-secondary)] text-center">
                  Start monitor to evaluate session quality
                </span>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transmission counters */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Session Counters" icon={<Settings2 size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Total Sent</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{totalSent}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Total Received</span>
              <span className="font-mono font-bold text-accent-500">{totalReceived}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Total Lost</span>
              <span className="font-mono font-bold text-danger-500">{totalLost}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Peak Burst Loss</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {peakLoss !== null ? `${peakLoss}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] font-medium">Avg Latency</span>
              <span className="font-mono font-bold text-[var(--text-primary)]">
                {avgLatency !== null ? `${avgLatency} ms` : '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Loss history bar chart ── */}
      <Card>
        <CardHeader
          title="Loss Rate History"
          subtitle={`Per-burst packet loss timeline → ${selectedTarget.label} (${selectedTarget.host})`}
          icon={<AlertTriangle size={16} />}
        />
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap gap-5 mb-4 text-[10px] text-[var(--text-muted)] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-accent-500 inline-block" />
              0% — No Loss
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary-500 inline-block" />≤ 2% — Low
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-warning-500 inline-block" />≤ 10% — Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-danger-500 inline-block" />
              &gt; 10% — Severe
            </span>
          </div>

          <LossBarChart records={records} />
        </CardContent>
      </Card>

      {/* ── Loss thresholds reference ── */}
      <Card>
        <CardHeader
          title="Packet Loss Severity Guide"
          subtitle="Industry-standard thresholds for network quality assessment"
          icon={<ShieldCheck size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(
              [
                {
                  range: '0%',
                  label: 'No Loss',
                  desc: 'Perfect — real-time VoIP / video',
                  grade: 'none' as LossGrade
                },
                {
                  range: '0.1–2%',
                  label: 'Low Loss',
                  desc: 'Acceptable for most applications',
                  grade: 'low' as LossGrade
                },
                {
                  range: '2–10%',
                  label: 'Moderate Loss',
                  desc: 'Degraded VoIP / video streaming',
                  grade: 'moderate' as LossGrade
                },
                {
                  range: '> 10%',
                  label: 'Severe Loss',
                  desc: 'Connection heavily impaired',
                  grade: 'severe' as LossGrade
                }
              ] as const
            ).map((t) => (
              <div
                key={t.grade}
                className={`rounded-xl p-3 border text-xs space-y-1 ${
                  latestGrade === t.grade
                    ? 'border-current ring-1 ring-current/20'
                    : 'border-[var(--border-color)]'
                } ${gradeColor(t.grade)}`}
              >
                <div className="font-black font-mono text-base">{t.range}</div>
                <div className="font-bold">{t.label}</div>
                <div className="text-[var(--text-muted)] text-[10px]">{t.desc}</div>
                {latestGrade === t.grade && (
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
          title="Probe Burst Log"
          subtitle={`Last ${MAX_RECORDS} bursts (${BURST_SIZE} packets each) — newest first`}
          icon={<AlertTriangle size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[var(--surface-card)]">
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-semibold pr-4">#</th>
                  <th className="py-2.5 font-semibold pr-4">Timestamp</th>
                  <th className="py-2.5 font-semibold pr-4">Sent</th>
                  <th className="py-2.5 font-semibold pr-4">Recv</th>
                  <th className="py-2.5 font-semibold pr-4">Lost</th>
                  <th className="py-2.5 font-semibold pr-4">Loss %</th>
                  <th className="py-2.5 font-semibold pr-4">Latency</th>
                  <th className="py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[var(--text-muted)]">
                      No burst records yet.
                    </td>
                  </tr>
                ) : (
                  [...records].reverse().map((r) => {
                    const grade = gradeLoss(r.lossRatePct)
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--border-color)]/40 last:border-0"
                      >
                        <td className="py-2 pr-4 text-[var(--text-muted)] font-mono">{r.id}</td>
                        <td className="py-2 pr-4 font-mono text-[var(--text-muted)]">
                          {r.timestamp}
                        </td>
                        <td className="py-2 pr-4 font-mono text-[var(--text-secondary)]">
                          {r.sent}
                        </td>
                        <td className="py-2 pr-4 font-mono text-accent-500 font-semibold">
                          {r.received}
                        </td>
                        <td className="py-2 pr-4 font-mono text-danger-500 font-semibold">
                          {r.lost}
                        </td>
                        <td className={`py-2 pr-4 font-mono font-bold ${gradeColor(grade)}`}>
                          {r.lossRatePct}%
                        </td>
                        <td className="py-2 pr-4 font-mono text-[var(--text-secondary)]">
                          {r.latencyMs !== null ? `${r.latencyMs} ms` : 'timeout'}
                        </td>
                        <td className="py-2">
                          <Badge variant={gradeVariant(grade)} size="sm">
                            {gradeLabel(grade)}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
