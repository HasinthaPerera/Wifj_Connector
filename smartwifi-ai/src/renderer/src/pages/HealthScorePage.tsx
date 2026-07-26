import React, { useState, useEffect, useCallback } from 'react'
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
  Info
} from 'lucide-react'
import {
  Card, CardHeader, CardContent, Button, Badge,
  HealthMeter, HealthIndicatorRow, SignalBars, StatusPill
} from '@/components/ui'
import { useWifi } from '@/context'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

interface SpeedRecord {
  id: number
  timestamp: string
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
}

interface SubScore {
  label: string
  score: number        // 0–100
  weight: number       // 0–1, must sum to 1 across all sub-scores
  description: string
  tip: string
  icon: React.ReactNode
  variant: 'accent' | 'primary' | 'warning' | 'danger'
}

type HealthGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'No Data'

/* ─────────────────────────────────────────────────────────────
   Scoring helpers
───────────────────────────────────────────────────────────── */

/** Map a dBm value (-30 best … -90 worst) to a 0-100 score. */
function scoreSignal(percent: number): number {
  // percent from WifiContext is 0-100
  return Math.min(100, Math.max(0, Math.round(percent)))
}

/** Score download speed: 0-100 mapped over 0-200 Mbps */
function scoreDownload(mbps: number): number {
  if (mbps >= 200) return 100
  if (mbps >= 100) return 90
  if (mbps >= 50)  return 75
  if (mbps >= 25)  return 55
  if (mbps >= 10)  return 35
  if (mbps >= 5)   return 20
  return 5
}

/** Score upload speed: 0-100 mapped over 0-100 Mbps */
function scoreUpload(mbps: number): number {
  if (mbps >= 100) return 100
  if (mbps >= 50)  return 90
  if (mbps >= 25)  return 75
  if (mbps >= 10)  return 55
  if (mbps >= 5)   return 35
  if (mbps >= 2)   return 20
  return 5
}

/** Score latency: lower is better */
function scoreLatency(ms: number): number {
  if (ms <= 10)  return 100
  if (ms <= 20)  return 90
  if (ms <= 50)  return 70
  if (ms <= 100) return 45
  if (ms <= 200) return 20
  return 5
}

/** Score jitter: lower is better */
function scoreStability(jitterMs: number): number {
  if (jitterMs <= 2)  return 100
  if (jitterMs <= 5)  return 85
  if (jitterMs <= 10) return 65
  if (jitterMs <= 20) return 40
  if (jitterMs <= 50) return 20
  return 5
}

function gradeFromScore(score: number): HealthGrade {
  if (score >= 85) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}



function scoreVariant(score: number): 'accent' | 'primary' | 'warning' | 'danger' {
  if (score >= 85) return 'accent'
  if (score >= 65) return 'primary'
  if (score >= 40) return 'warning'
  return 'danger'
}



/* ─────────────────────────────────────────────────────────────
   Recommendation Item
───────────────────────────────────────────────────────────── */

interface Recommendation {
  level: 'ok' | 'warning' | 'critical'
  text: string
}

function RecommendationItem({ rec }: { rec: Recommendation }): React.JSX.Element {
  const map = {
    ok:       { icon: <CheckCircle2 size={14} />, cls: 'text-accent-500' },
    warning:  { icon: <AlertTriangle size={14} />, cls: 'text-warning-500' },
    critical: { icon: <XCircle size={14} />, cls: 'text-danger-500' }
  }
  const { icon, cls } = map[rec.level]
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <span className={`mt-0.5 shrink-0 ${cls}`}>{icon}</span>
      <span className="text-[var(--text-secondary)] leading-relaxed">{rec.text}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HealthScorePage
───────────────────────────────────────────────────────────── */

/**
 * HealthScorePage — Computes a composite Network Health Score from live
 * Wi-Fi signal data (WifiContext) and the latest speed test (SQLite DB).
 * Displays an animated circular gauge, per-dimension score bars, and
 * actionable improvement recommendations.
 */
export function HealthScorePage(): React.JSX.Element {
  const { status, refreshStatus } = useWifi()
  const [latestTest, setLatestTest] = useState<SpeedRecord | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  /* Load the most recent speed test from DB */
  const loadLatestTest = useCallback(async () => {
    try {
      const records: SpeedRecord[] = await window.api.db.getSpeedTests()
      setLatestTest(records.length > 0 ? records[records.length - 1] : null)
    } catch (err) {
      console.error('Failed to load speed test data for health score:', err)
    }
  }, [])

  useEffect(() => {
    loadLatestTest()
  }, [loadLatestTest])

  /* Manual refresh */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refreshStatus(), loadLatestTest()])
      setLastUpdated(new Date())
    } finally {
      setRefreshing(false)
    }
  }, [refreshStatus, loadLatestTest])

  /* ── Compute sub-scores ── */
  const hasSpeedData = latestTest !== null
  const hasSignalData = !status.loading && status.isConnected

  const sigScore  = hasSignalData  ? scoreSignal(status.signal)               : null
  const dlScore   = hasSpeedData   ? scoreDownload(latestTest!.downloadMbps)   : null
  const ulScore   = hasSpeedData   ? scoreUpload(latestTest!.uploadMbps)       : null
  const latScore  = hasSpeedData   ? scoreLatency(latestTest!.pingMs)          : null
  const stabScore = hasSpeedData   ? scoreStability(latestTest!.jitterMs)      : null

  const hasEnoughData = hasSignalData || hasSpeedData

  /* Weighted overall — signal 20%, download 25%, upload 15%, latency 25%, stability 15% */
  let overallScore = 0
  if (hasEnoughData) {
    let totalWeight = 0
    let weightedSum = 0
    if (sigScore !== null)  { weightedSum += sigScore  * 0.20; totalWeight += 0.20 }
    if (dlScore !== null)   { weightedSum += dlScore   * 0.25; totalWeight += 0.25 }
    if (ulScore !== null)   { weightedSum += ulScore   * 0.15; totalWeight += 0.15 }
    if (latScore !== null)  { weightedSum += latScore  * 0.25; totalWeight += 0.25 }
    if (stabScore !== null) { weightedSum += stabScore * 0.15; totalWeight += 0.15 }
    overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
  }

  const grade = hasEnoughData ? gradeFromScore(overallScore) : 'No Data'

  const subScores: SubScore[] = [
    {
      label: 'Signal Strength',
      score: sigScore ?? 0,
      weight: 0.20,
      description: hasSignalData
        ? `${status.signal}% (${Math.round(status.signal / 2 - 100)} dBm)`
        : 'No adapter data',
      tip: 'Move closer to your router or remove physical obstructions.',
      icon: <Signal size={14} />,
      variant: sigScore !== null ? scoreVariant(sigScore) : 'danger'
    },
    {
      label: 'Download Speed',
      score: dlScore ?? 0,
      weight: 0.25,
      description: hasSpeedData ? `${latestTest!.downloadMbps.toFixed(1)} Mbps` : 'Run a speed test',
      tip: 'Download speed affects streaming, updates, and browsing quality.',
      icon: <Gauge size={14} />,
      variant: dlScore !== null ? scoreVariant(dlScore) : 'danger'
    },
    {
      label: 'Upload Speed',
      score: ulScore ?? 0,
      weight: 0.15,
      description: hasSpeedData ? `${latestTest!.uploadMbps.toFixed(1)} Mbps` : 'Run a speed test',
      tip: 'Upload speed affects video calls, cloud backups, and gaming.',
      icon: <Activity size={14} />,
      variant: ulScore !== null ? scoreVariant(ulScore) : 'danger'
    },
    {
      label: 'Latency (Ping)',
      score: latScore ?? 0,
      weight: 0.25,
      description: hasSpeedData ? `${latestTest!.pingMs} ms` : 'Run a speed test',
      tip: 'High ping causes lag in gaming and video calls. Aim for < 50 ms.',
      icon: <Activity size={14} />,
      variant: latScore !== null ? scoreVariant(latScore) : 'danger'
    },
    {
      label: 'Connection Stability',
      score: stabScore ?? 0,
      weight: 0.15,
      description: hasSpeedData ? `±${latestTest!.jitterMs.toFixed(1)} ms jitter` : 'Run a speed test',
      tip: 'High jitter causes stuttering in video calls. Aim for < 5 ms.',
      icon: <Shield size={14} />,
      variant: stabScore !== null ? scoreVariant(stabScore) : 'danger'
    }
  ]

  /* ── Recommendations ── */
  const recommendations: Recommendation[] = []

  if (!hasSignalData) {
    recommendations.push({ level: 'critical', text: 'No Wi-Fi adapter detected. Connect to a wireless network to get signal data.' })
  } else if (status.signal < 40) {
    recommendations.push({ level: 'critical', text: `Weak signal (${status.signal}%). Move closer to your router or consider a Wi-Fi extender.` })
  } else if (status.signal < 65) {
    recommendations.push({ level: 'warning', text: `Signal is moderate (${status.signal}%). Reducing distance or obstructions may improve reliability.` })
  } else {
    recommendations.push({ level: 'ok', text: `Signal strength is healthy at ${status.signal}%.` })
  }

  if (!hasSpeedData) {
    recommendations.push({ level: 'warning', text: 'No speed test results found. Run a speed test to include bandwidth data in your health score.' })
  } else {
    if (latestTest!.downloadMbps < 25) {
      recommendations.push({ level: 'critical', text: `Download speed is low (${latestTest!.downloadMbps.toFixed(1)} Mbps). Contact your ISP or upgrade your plan.` })
    } else if (latestTest!.downloadMbps < 100) {
      recommendations.push({ level: 'warning', text: `Download speed is adequate (${latestTest!.downloadMbps.toFixed(1)} Mbps) but could be improved for HD streaming.` })
    } else {
      recommendations.push({ level: 'ok', text: `Download speed of ${latestTest!.downloadMbps.toFixed(1)} Mbps is excellent.` })
    }

    if (latestTest!.pingMs > 100) {
      recommendations.push({ level: 'critical', text: `High latency detected (${latestTest!.pingMs} ms). Check for network congestion or interference.` })
    } else if (latestTest!.pingMs > 50) {
      recommendations.push({ level: 'warning', text: `Latency is elevated (${latestTest!.pingMs} ms). Switching to a 5 GHz band may help.` })
    } else {
      recommendations.push({ level: 'ok', text: `Latency is excellent at ${latestTest!.pingMs} ms.` })
    }

    if (latestTest!.jitterMs > 20) {
      recommendations.push({ level: 'critical', text: `Severe jitter (±${latestTest!.jitterMs.toFixed(1)} ms) will disrupt video calls and VoIP.` })
    } else if (latestTest!.jitterMs > 5) {
      recommendations.push({ level: 'warning', text: `Jitter is noticeable (±${latestTest!.jitterMs.toFixed(1)} ms). A wired connection may help.` })
    }
  }

  const formattedTime = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Network Health Score</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Composite network quality rating derived from live signal metrics and speed test data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">Updated {formattedTime}</span>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main Row: Gauge + Score Breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Gauge Card */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader
            title="Overall Score"
            subtitle={hasEnoughData ? `Grade: ${grade}` : 'Awaiting data'}
            icon={<HeartPulse size={16} />}
            action={
              <StatusPill
                state={status.isConnected ? 'connected' : 'disconnected'}
                size="sm"
              />
            }
          />
          <CardContent className="flex flex-col items-center justify-center gap-4 py-6 flex-1">
            {hasEnoughData ? (
              <>
                <HealthMeter score={overallScore} size={164} showTicks />
                {hasSignalData && (
                  <div className="flex flex-col items-center gap-1.5">
                    <SignalBars percent={status.signal} size="md" />
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Signal {status.signal}%
                    </span>
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)] text-center max-w-[160px]">
                  Based on {[hasSignalData && 'signal', hasSpeedData && 'speed test'].filter(Boolean).join(' & ')} data
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <Info size={32} className="text-[var(--text-muted)] opacity-50" />
                <p className="text-sm text-[var(--text-muted)]">Connect to Wi-Fi and run a speed test to compute your health score.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Breakdown Card */}
        <Card className="md:col-span-2">
          <CardHeader title="Score Breakdown" icon={<CheckCircle2 size={16} />} />
          <CardContent className="space-y-5">
            {subScores.map((sub) => (
              <div key={sub.label} className="space-y-1">
                <HealthIndicatorRow
                  label={sub.label}
                  score={hasEnoughData ? sub.score : 0}
                  rawValue={sub.description}
                  icon={sub.icon}
                  weight={`${Math.round(sub.weight * 100)}%`}
                  showScore={hasEnoughData}
                />
                <p className="text-[11px] text-[var(--text-muted)] leading-snug pl-5">{sub.tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Recommendations ── */}
      <Card>
        <CardHeader
          title="Recommendations"
          subtitle="Actionable steps to improve your network health"
          icon={<AlertTriangle size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <RecommendationItem key={i} rec={rec} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Score Key ── */}
      <Card>
        <CardHeader title="Score Reference" icon={<Info size={16} />} />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { grade: 'Excellent', range: '85 – 100', variant: 'accent',   desc: 'Optimal network performance' },
                { grade: 'Good',      range: '65 – 84',  variant: 'primary',  desc: 'Reliable for most use cases' },
                { grade: 'Fair',      range: '40 – 64',  variant: 'warning',  desc: 'Some issues may occur' },
                { grade: 'Poor',      range: '0 – 39',   variant: 'danger',   desc: 'Significant problems present' }
              ] as const
            ).map(({ grade: g, range, variant, desc }) => (
              <div key={g} className="flex flex-col gap-1.5 p-3 rounded-lg bg-[var(--surface-input,var(--bg-input))] border border-[var(--border-color)]">
                <Badge variant={variant} className="self-start">{g}</Badge>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{range}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
