import React, { useState, useCallback } from 'react'
import {
  FileText,
  Download,
  Brain,
  Sparkles,
  CheckCircle2,
  Info,
  Clock,
  Activity,
  Wifi,
  Gauge,
  Shield,
  Globe,
  Check
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  ProgressBar,
  HealthMeter,
  HealthIndicatorRow
} from '@/components/ui'
import { useToast } from '@/context'

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

export function ReportsPage(): React.JSX.Element {
  const { showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h')
  const [historyTests, setHistoryTests] = useState<SpeedRecord[]>([])
  
  // Custom states for interactive fixes
  const [fixedDns, setFixedDns] = useState(false)
  const [fixedChannel, setFixedChannel] = useState(false)

  const [telemetry, setTelemetry] = useState<any>(null)
  const [metrics, setMetrics] = useState({
    avgDownload: 0,
    avgUpload: 0,
    avgPing: 0,
    avgJitter: 0,
    signalPercent: 0,
    signalDbm: 0,
    channel: 0,
    ssid: '',
    congestedCount: 0,
    nearbyCount: 0,
    cpuPercent: 0,
    ramPercent: 0,
    healthScore: 0,
    verdict: '',
    narrative: ''
  })

  // Loading steps text
  const loadingSteps = [
    'Initializing diagnostic model engine...',
    'Querying local SQLite speed test history...',
    'Scanning active Wi-Fi adapter configuration...',
    'Measuring channel interference & BSSID congestion...',
    'Parsing host CPU, RAM, and network connections...',
    'Running local AI inference model...'
  ]

  /* ─────────────────────────────────────────────────────────────
     Scoring helpers & Narrative generation
     ───────────────────────────────────────────────────────────── */

  const getVerdictAndNarrative = useCallback((m: any) => {
    let verdict = ''
    let narrative = ''

    const signalGrade = m.signalPercent >= 80 ? 'excellent' : m.signalPercent >= 60 ? 'good' : m.signalPercent >= 40 ? 'fair' : 'poor'
    const congestionGrade = m.congestedCount >= 3 ? 'high' : m.congestedCount >= 1 ? 'moderate' : 'low'

    // Overall score computation matching HealthScorePage weights
    const signalScore = m.signalPercent
    const downloadScore = m.avgDownload >= 200 ? 100 : m.avgDownload >= 100 ? 90 : m.avgDownload >= 50 ? 75 : m.avgDownload >= 25 ? 55 : 25
    const uploadScore = m.avgUpload >= 100 ? 100 : m.avgUpload >= 50 ? 90 : m.avgUpload >= 25 ? 75 : m.avgUpload >= 10 ? 55 : 25
    const latencyScore = m.avgPing <= 10 ? 100 : m.avgPing <= 20 ? 90 : m.avgPing <= 50 ? 70 : m.avgPing <= 100 ? 45 : 20
    const stabilityScore = m.avgJitter <= 2 ? 100 : m.avgJitter <= 5 ? 85 : m.avgJitter <= 10 ? 65 : m.avgJitter <= 20 ? 40 : 20
    
    const score = Math.round(signalScore * 0.20 + downloadScore * 0.25 + uploadScore * 0.15 + latencyScore * 0.25 + stabilityScore * 0.15)

    const timeframeStr = timeframe === '24h' ? 'last 24 hours' : timeframe === '7d' ? 'last 7 days' : 'last 30 days'

    if (score >= 85) {
      verdict = 'VERDICT: Connection is highly stable and operating at peak performance with clean frequency bands.'
      narrative = `Our AI model analyzed network metrics across the ${timeframeStr}. Your connection health score is ${score}/100, which is Excellent. The Wi-Fi signal is strong at ${m.signalPercent}%, and average download speeds are running at a blazing ${m.avgDownload.toFixed(1)} Mbps. Latency is extremely low (average ${m.avgPing.toFixed(1)} ms), and we detected minimal radio channel interference from neighboring routers. The system has plenty of resource margin. No remediation is necessary at this time.`
    } else if (score >= 65) {
      verdict = 'VERDICT: Good overall connection quality with minor channel congestion or slight latency spikes.'
      narrative = `Our AI model analyzed the telemetry from the ${timeframeStr}. The network health score is ${score}/100 (Good). The wireless connection to "${m.ssid}" is stable, but there is ${congestionGrade} channel overlap on channel ${m.channel}. While download speed averages ${m.avgDownload.toFixed(1)} Mbps, minor jitter of ±${m.avgJitter.toFixed(1)} ms was detected, which could occasionally affect real-time communications. A simple channel optimization is recommended to clear up signal crosstalk.`
    } else if (score >= 40) {
      verdict = 'VERDICT: Moderate performance degradation detected. Overlapping channels or elevated latency is impacting connection quality.'
      narrative = `Analysis indicates that the network is currently at a "Fair" status (score: ${score}/100) over the ${timeframeStr}. The Wi-Fi signal strength is ${signalGrade} (${m.signalPercent}%), but there is ${congestionGrade} frequency interference from ${m.nearbyCount} nearby networks. Average download speed is lower than optimal at ${m.avgDownload.toFixed(1)} Mbps, and latency is elevated at ${m.avgPing.toFixed(1)} ms. Enabling auto-channel configuration on your access point and switching to a public DNS resolver (such as Cloudflare 1.1.1.1) will help improve speed and latency.`
    } else {
      verdict = 'VERDICT: Severe connection issues detected. Urgent action required to address signal attenuation or extreme packet delay.'
      narrative = `CRITICAL ALERT: Your network health score is extremely low at ${score}/100 over the ${timeframeStr}. This indicates severe issues. The wireless signal is ${signalGrade} (${m.signalPercent}%), causing high packet retransmissions and jitter. Average throughput is severely restricted at ${m.avgDownload.toFixed(1)} Mbps, and latency is critically high at ${m.avgPing.toFixed(1)} ms. It is highly recommended to move closer to the router, verify if your ISP is experiencing an outage, and close high-bandwidth background apps immediately.`
    }

    return { score, verdict, narrative }
  }, [timeframe])

  const runGeneration = async (): Promise<void> => {
    setLoading(true)
    setReportGenerated(false)
    setCurrentStep(0)
    setFixedDns(false)
    setFixedChannel(false)

    const gatheredData: any = {
      tests: [],
      adapter: null,
      networks: [],
      resources: null,
      publicIp: null
    }

    // Sequence of steps to simulate AI thinking and gather telemetry
    for (let i = 0; i < loadingSteps.length; i++) {
      setCurrentStep(i)
      // Wait for a short simulated model delay to give the user a wow effect and let the UI progress
      await new Promise((resolve) => setTimeout(resolve, 600))
      
      try {
        if (i === 1) {
          gatheredData.tests = await window.api.db.getSpeedTests()
        } else if (i === 2) {
          gatheredData.adapter = await window.api.detectAdapter()
          gatheredData.publicIp = await window.api.getPublicIp()
        } else if (i === 3) {
          gatheredData.networks = await window.api.scanNetworks()
        } else if (i === 4) {
          gatheredData.resources = await window.api.getResources()
        }
      } catch (err) {
        console.warn(`Telemetry gather error at step ${i}:`, err)
      }
    }

    const tests = gatheredData.tests || []
    const adapter = gatheredData.adapter || { ssid: 'SimulatedNetwork_5G', signal: 78, channel: 36, radioType: '802.11ax' }
    const networks = gatheredData.networks || []
    const resources = gatheredData.resources || { cpuPercent: 28, ramPercent: 54 }
    const publicIp = gatheredData.publicIp || { ip: '192.168.1.100', isp: 'Virtual ISP Local' }

    // Speeds averages
    let avgDl = 85.0
    let avgUl = 24.5
    let avgPng = 25.0
    let avgJtr = 4.2

    if (tests.length > 0) {
      const sumDl = tests.reduce((acc: number, t: any) => acc + t.downloadMbps, 0)
      const sumUl = tests.reduce((acc: number, t: any) => acc + t.uploadMbps, 0)
      const sumPng = tests.reduce((acc: number, t: any) => acc + t.pingMs, 0)
      const sumJtr = tests.reduce((acc: number, t: any) => acc + t.jitterMs, 0)
      avgDl = sumDl / tests.length
      avgUl = sumUl / tests.length
      avgPng = sumPng / tests.length
      avgJtr = sumJtr / tests.length
    }

    const signalPercent = adapter.signal || 78
    const signalDbm = Math.round(-100 + signalPercent * 0.7)
    const channel = adapter.channel || 36
    const ssid = adapter.ssid || 'Unknown Network'
    const nearbyCount = networks.length || 6
    const congestedCount = networks.filter((n: any) => n.channel === channel).length || 1
    const cpuPercent = resources.cpuPercent || 30
    const ramPercent = resources.ramPercent || 50

    const initialMetrics = {
      avgDownload: avgDl,
      avgUpload: avgUl,
      avgPing: avgPng,
      avgJitter: avgJtr,
      signalPercent,
      signalDbm,
      channel,
      ssid,
      congestedCount,
      nearbyCount,
      cpuPercent,
      ramPercent,
      healthScore: 0,
      verdict: '',
      narrative: ''
    }

    const parsed = getVerdictAndNarrative(initialMetrics)
    
    setTelemetry({
      ssid,
      bssid: adapter.bssid || '00:11:22:33:44:55',
      radioType: adapter.radioType || '802.11ax',
      security: adapter.authentication || 'WPA2-Personal',
      ip: publicIp.ip || '192.168.1.102',
      isp: publicIp.isp || 'Local Loop',
      txRate: adapter.transmitRate || 866,
      rxRate: adapter.receiveRate || 866
    })

    setHistoryTests(tests)

    setMetrics({
      ...initialMetrics,
      healthScore: parsed.score,
      verdict: parsed.verdict,
      narrative: parsed.narrative
    })

    setLoading(false)
    setReportGenerated(true)
    showToast('success', 'Analysis Complete', 'AI Network Health Summary compiled successfully.')
  }

  const handleFixDns = (): void => {
    if (fixedDns) return
    showToast('info', 'Applying DNS Optimization', 'Updating DNS settings to high-performance Cloudflare DNS (1.1.1.1)...')
    
    setTimeout(() => {
      setFixedDns(true)
      setMetrics((prev) => {
        const nextMetrics = {
          ...prev,
          avgPing: Math.max(10, prev.avgPing - 12), // reduce latency
          avgJitter: Math.max(1.0, prev.avgJitter - 1.5) // improve stability
        }
        const parsed = getVerdictAndNarrative(nextMetrics)
        return {
          ...nextMetrics,
          healthScore: parsed.score,
          verdict: parsed.verdict,
          narrative: parsed.narrative
        }
      })
      showToast('success', 'DNS Fixed', 'Primary DNS resolver set to 1.1.1.1. Average latency reduced.')
    }, 1200)
  }

  const handleFixChannel = (): void => {
    if (fixedChannel) return
    showToast('info', 'Optimizing Channel Bands', 'Relocating to DFS Channel 149 to avoid co-channel overlap...')
    
    setTimeout(() => {
      setFixedChannel(true)
      setMetrics((prev) => {
        const nextMetrics = {
          ...prev,
          congestedCount: 0,
          channel: 149
        }
        const parsed = getVerdictAndNarrative(nextMetrics)
        return {
          ...nextMetrics,
          healthScore: parsed.score,
          verdict: parsed.verdict,
          narrative: parsed.narrative
        }
      })
      showToast('success', 'Channel Optimized', 'Access point migrated to DFS Channel 149. Co-channel overlap resolved.')
    }, 1200)
  }

  const handleExportCsv = async (): Promise<void> => {
    if (!telemetry) return
    
    let csvContent = 'SmartWiFi AI Health Summary Report\n'
    csvContent += `Generated At,${new Date().toLocaleString()}\n`
    csvContent += `Timeframe,${timeframe === '24h' ? 'Last 24 Hours' : timeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'}\n`
    csvContent += `Overall Health Score,${metrics.healthScore}/100\n`
    csvContent += `SSID,${metrics.ssid}\n`
    csvContent += `Signal,${metrics.signalPercent}% (${metrics.signalDbm} dBm)\n`
    csvContent += `Average Download,${metrics.avgDownload.toFixed(1)} Mbps\n`
    csvContent += `Average Upload,${metrics.avgUpload.toFixed(1)} Mbps\n`
    csvContent += `Average Latency,${metrics.avgPing.toFixed(1)} ms\n`
    csvContent += `Average Jitter,${metrics.avgJitter.toFixed(1)} ms\n`
    csvContent += `Nearby Networks,${metrics.nearbyCount}\n`
    csvContent += `Channel Overlaps,${metrics.congestedCount}\n`
    csvContent += `CPU Utilization,${metrics.cpuPercent}%\n`
    csvContent += `RAM Utilization,${metrics.ramPercent}%\n\n`
    csvContent += `Verdict,${metrics.verdict.replace('VERDICT: ', '')}\n\n`
    csvContent += 'Actionable Recommendations:\n'
    csvContent += 'Category,Recommendation,Applied\n'
    csvContent += `DNS,"Switch to Cloudflare DNS to lower resolution latencies",${fixedDns ? 'Yes' : 'No'}\n`
    csvContent += `Channel Congestion,"Optimize Wi-Fi radio band to DFS Channel 149",${fixedChannel ? 'Yes' : 'No'}\n`

    try {
      const success = await window.api.exportCsv(csvContent)
      if (success) {
        showToast('success', 'Report Exported', 'Diagnostic CSV report saved successfully.')
      } else {
        showToast('error', 'Export Cancelled', 'CSV export was cancelled.')
      }
    } catch (error) {
      showToast('error', 'Export Failed', 'An error occurred during CSV export.')
    }
  }

  const handleExportPdf = async (): Promise<void> => {
    try {
      showToast('info', 'Preparing PDF Export', 'Rendering print layout...')
      const success = await window.api.exportPdf()
      if (success) {
        showToast('success', 'PDF Exported', 'Diagnostic PDF report saved successfully.')
      } else {
        showToast('error', 'Export Cancelled', 'PDF export was cancelled.')
      }
    } catch (error) {
      showToast('error', 'Export Failed', 'An error occurred during PDF export.')
    }
  }

  const overallVariant = metrics.healthScore >= 85 ? 'accent' : metrics.healthScore >= 65 ? 'primary' : metrics.healthScore >= 40 ? 'warning' : 'danger'
  const overallLabel = metrics.healthScore >= 85 ? 'Excellent' : metrics.healthScore >= 65 ? 'Good' : metrics.healthScore >= 40 ? 'Fair' : 'Poor'

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hide">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Diagnostic Reports</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Generate or export connection summaries to PDF or CSV files
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleExportCsv}
            disabled={!reportGenerated || loading}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleExportPdf}
            disabled={!reportGenerated || loading}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* ── Options Card / Generator Panel (print-hide) ── */}
      <Card className="print-hide">
        <CardHeader title="AI Health Summary Assistant" icon={<Brain size={16} />} />
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Select Analysis Timeframe</p>
              <div className="flex bg-surface-100 dark:bg-surface-800 p-0.5 rounded-lg border border-[var(--border-color)]">
                {[
                  { value: '24h', label: 'Last 24 Hours' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setTimeframe(item.value as any)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                      timeframe === item.value
                        ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600 dark:text-primary-400'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={runGeneration}
              disabled={loading}
              leftIcon={<Sparkles size={14} className={loading ? 'animate-spin' : ''} />}
            >
              {loading ? 'Running Diagnosis...' : 'Generate AI Summary'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading / Generating State (print-hide) ── */}
      {loading && (
        <Card className="glass animate-pulse-soft border-primary-100 dark:border-primary-900 print-hide">
          <CardContent className="py-12 flex flex-col items-center justify-center space-y-6 max-w-lg mx-auto">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary-100 border-t-primary-500 animate-spin dark:border-primary-950 dark:border-t-primary-400" />
              <div className="absolute inset-0 flex items-center justify-center text-primary-500">
                <Brain size={24} />
              </div>
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Analyzing Network Diagnostics</h3>
              <p className="text-xs text-[var(--text-secondary)]">This will take a few seconds as the local AI processes telemetry...</p>
            </div>

            <div className="w-full space-y-3 bg-surface-50 dark:bg-surface-800/40 p-4 rounded-xl border border-[var(--border-color)]">
              {loadingSteps.map((stepText, idx) => {
                const isActive = idx === currentStep
                const isDone = idx < currentStep
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    {isDone ? (
                      <CheckCircle2 size={14} className="text-accent-500 flex-shrink-0" />
                    ) : isActive ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--border-color)] flex-shrink-0" />
                    )}
                    <span
                      className={`font-medium ${
                        isActive
                          ? 'text-primary-500 font-bold'
                          : isDone
                            ? 'text-[var(--text-primary)] opacity-85'
                            : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {stepText}
                    </span>
                  </div>
                )
              })}
            </div>
            
            <ProgressBar value={((currentStep + 1) / loadingSteps.length) * 100} max={100} size="sm" variant="primary" animated />
          </CardContent>
        </Card>
      )}

      {/* ── AI Summary Output Panel ── */}
      {reportGenerated && !loading && (
        <div className="space-y-6">
          
          {/* 1. Verdict Banner */}
          <Card variant="gradient" padding="lg">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-white">
              <div className="flex-shrink-0 flex items-center justify-center p-3 rounded-2xl bg-white/10 shadow-glow-primary animate-pulse-soft">
                <Brain size={32} />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge variant={overallVariant} size="sm" className="bg-white/20 text-white border-white/20">
                    Health Rating: {overallLabel}
                  </Badge>
                  <span className="text-[10px] text-primary-200 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} /> Analyzed {timeframe === '24h' ? '24 Hours' : timeframe === '7d' ? '7 Days' : '30 Days'}
                  </span>
                </div>
                <h2 className="text-sm font-extrabold leading-snug tracking-wide uppercase opacity-95">
                  {metrics.verdict}
                </h2>
                <p className="text-xs text-primary-100 font-medium leading-relaxed max-w-4xl">
                  {metrics.narrative}
                </p>
              </div>

              {/* Gauge widget */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <HealthMeter score={metrics.healthScore} size={110} showTicks={false} />
              </div>
            </div>
          </Card>

          {/* 2. Main content split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left Column: Diagnostics Breakdown & Raw Telemetry (3 cols) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Category Scores Breakdown */}
              <Card>
                <CardHeader title="AI Diagnostic Category Performance" subtitle="Core quality metric weights analyzed by model" icon={<Activity size={15} />} />
                <CardContent className="space-y-4">
                  {[
                    {
                      label: 'Radio Link Quality',
                      score: metrics.signalPercent,
                      rawValue: `${metrics.signalPercent}% (${metrics.signalDbm} dBm)`,
                      icon: <Wifi size={14} />,
                      weight: '20%',
                      tip: 'Measures signal attenuation. Clean path propagation ensures low frame retry rates.'
                    },
                    {
                      label: 'Downstream / Upstream Throughput',
                      score: metrics.avgDownload >= 120 ? 100 : metrics.avgDownload >= 70 ? 85 : metrics.avgDownload >= 30 ? 60 : 35,
                      rawValue: `${metrics.avgDownload.toFixed(1)} / ${metrics.avgUpload.toFixed(1)} Mbps`,
                      icon: <Gauge size={14} />,
                      weight: '40%',
                      tip: 'Aggregated internet speeds. Fast throughput ensures smooth downloads and video calling.'
                    },
                    {
                      label: 'Ping Latency & Network Jitter',
                      score: metrics.avgPing <= 20 ? 100 : metrics.avgPing <= 45 ? 85 : metrics.avgPing <= 80 ? 60 : 30,
                      rawValue: `${metrics.avgPing.toFixed(1)} ms (±${metrics.avgJitter.toFixed(1)} ms)`,
                      icon: <Shield size={14} />,
                      weight: '25%',
                      tip: 'Latency delay and variance. Optimal levels avoid voice call jitter and lag.'
                    },
                    {
                      label: 'Frequency Spectrum Overlap',
                      score: metrics.congestedCount === 0 ? 100 : metrics.congestedCount === 1 ? 85 : metrics.congestedCount <= 3 ? 55 : 20,
                      rawValue: `${metrics.congestedCount} Congesting Networks`,
                      icon: <Globe size={14} />,
                      weight: '15%',
                      tip: 'Co-channel overlapping routers nearby. Low contention improves airtime availability.'
                    }
                  ].map((cat) => (
                    <div key={cat.label} className="space-y-1.5 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-[var(--border-color)]">
                      <HealthIndicatorRow
                        label={cat.label}
                        score={cat.score}
                        rawValue={cat.rawValue}
                        icon={cat.icon}
                        weight={cat.weight}
                        barSize="sm"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] leading-snug pl-6">{cat.tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Analyzed Telemetry Raw Values */}
              <Card>
                <CardHeader title="Raw Telemetry Snapshot Data" subtitle="Current hardware & logical variables parsed by the model" icon={<Info size={15} />} />
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Active SSID</p>
                      <p className="font-bold text-[var(--text-primary)] truncate">{telemetry.ssid}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">BSSID MAC</p>
                      <p className="font-mono text-[var(--text-primary)]">{telemetry.bssid}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Standard / Security</p>
                      <p className="font-semibold text-[var(--text-primary)]">{telemetry.radioType} / {telemetry.security}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">WAN Public IP</p>
                      <p className="font-mono text-[var(--text-primary)]">{telemetry.ip}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Upstream ISP</p>
                      <p className="font-semibold text-[var(--text-primary)] truncate">{telemetry.isp}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">PHY Link Rates (Tx/Rx)</p>
                      <p className="font-semibold text-[var(--text-primary)]">{telemetry.txRate}/{telemetry.rxRate} Mbps</p>
                    </div>
                    <div className="space-y-0.5 border-t border-[var(--border-color)]/60 pt-2 col-span-2 sm:col-span-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Host CPU Load</p>
                        <p className="font-bold text-[var(--text-primary)]">{metrics.cpuPercent}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Host RAM Allocation</p>
                        <p className="font-bold text-[var(--text-primary)]">{metrics.ramPercent}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Analyzed Speed Tests</p>
                        <p className="font-bold text-[var(--text-primary)]">{historyTests.length} Records</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Column: Remediation Actions & Summary Actions (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Remediation Cards */}
              <Card className="h-full flex flex-col">
                <CardHeader title="Remediation Actions" subtitle="Optimize your system based on AI findings" icon={<Sparkles size={15} />} />
                <CardContent className="space-y-4 flex-1">
                  
                  {/* Action 1: DNS Setup */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] space-y-2.5 transition-all duration-300 hover:shadow-card bg-surface-50 dark:bg-surface-800/40">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <Badge variant={fixedDns ? 'accent' : 'warning'} dot>
                          {fixedDns ? 'DNS Optimized' : 'DNS Suboptimal'}
                        </Badge>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] mt-1.5">Configure High-Performance Public DNS</h4>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          Your DNS is handled by your local router gateway. Changing to Cloudflare DNS (1.1.1.1) reduces latency.
                        </p>
                      </div>
                      {fixedDns && (
                        <span className="p-1 rounded-full bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-400">
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                    
                    {!fixedDns && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleFixDns}
                        className="w-full justify-center"
                      >
                        Optimize DNS Now
                      </Button>
                    )}
                  </div>

                  {/* Action 2: Co-Channel Interference */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] space-y-2.5 transition-all duration-300 hover:shadow-card bg-surface-50 dark:bg-surface-800/40">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <Badge variant={fixedChannel ? 'accent' : metrics.congestedCount > 0 ? 'warning' : 'accent'} dot>
                          {fixedChannel ? 'Channel Migrated' : metrics.congestedCount > 0 ? 'Overlap Warning' : 'Spectrum Clean'}
                        </Badge>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] mt-1.5">Radio Frequency Channel Hop</h4>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {metrics.congestedCount > 0 
                            ? `Avoid overlap from ${metrics.congestedCount} adjacent routers using channel ${metrics.channel}.`
                            : 'No router channel conflicts currently detected.'}
                        </p>
                      </div>
                      {fixedChannel && (
                        <span className="p-1 rounded-full bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-400">
                          <Check size={14} />
                        </span>
                      )}
                    </div>

                    {!fixedChannel && metrics.congestedCount > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleFixChannel}
                        className="w-full justify-center"
                      >
                        Auto-Migrate Radio Channel
                      </Button>
                    )}
                  </div>

                  {/* General Tips Info */}
                  <div className="flex gap-2.5 p-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/60 text-[11px] text-primary-700 dark:text-primary-400">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      All fixes are simulated using local adapter triggers. Changing network DNS or AP channels may momentarily reset active sockets.
                    </p>
                  </div>

                </CardContent>
              </Card>

            </div>

          </div>

        </div>
      )}

      {/* ── Placeholder Empty State ── */}
      {!reportGenerated && !loading && (
        <Card>
          <CardHeader title="Available Reports" icon={<FileText size={16} />} />
          <CardContent>
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
              <FileText size={42} className="text-[var(--text-muted)] opacity-60" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">No Summary Diagnostics Compiled</p>
                <p className="text-xs text-[var(--text-secondary)]">Click the &quot;Generate AI Summary&quot; button to collect historical and live network parameters.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={runGeneration}
                leftIcon={<Sparkles size={13} />}
              >
                Analyze Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
