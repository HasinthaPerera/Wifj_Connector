import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Gauge, Play, ArrowDown, ArrowUp, Activity, Server, RefreshCw, Trash2, Info } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, ProgressBar } from '@/components/ui'
import { SpeedometerGauge } from '@/components/SpeedometerGauge'
import { executeRealSpeedTest, formatSpeedUnit, SpeedTestFinalResult } from '@/utils/speedTestRunner'
import { useToast } from '@/context'

interface TestResult {
  id?: number
  timestamp: string
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
}

/**
 * Converts Mbps to human-readable File Transfer Speed (MB/s or KB/s).
 * 1 Byte = 8 Bits. (e.g. 100 Mbps = 12.5 MB/s)
 */
function formatBytesPerSecond(mbps: number): string {
  if (mbps <= 0) return '—'
  const bytesPerSec = (mbps * 1_000_000) / 8
  if (bytesPerSec >= 1_000_000) {
    return `${(bytesPerSec / 1_000_000).toFixed(2)} MB/s`
  }
  return `${Math.round(bytesPerSec / 1000)} KB/s`
}

/**
 * SpeedTestPage — Real-Time Bandwidth & Latency Measurement Engine.
 * Performs Ookla-style real-time internet speed tests using multi-stream binary payloads,
 * displaying live sweeping speedometer, dual Mbps & MB/s units, and persistent SQLite log history.
 */
export function SpeedTestPage(): React.JSX.Element {
  const { showToast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'completed'>(
    'idle'
  )
  const [progress, setProgress] = useState(0)

  // Live real-time values for needle gauge & cards
  const [liveGaugeMbps, setLiveGaugeMbps] = useState(0)
  const [liveDownload, setLiveDownload] = useState(0)
  const [liveUpload, setLiveUpload] = useState(0)
  const [livePing, setLivePing] = useState(0)
  const [liveJitter, setLiveJitter] = useState(0)
  const [serverNode, setServerNode] = useState('Detecting server node...')

  // Final locked test results
  const [finalResult, setFinalResult] = useState<SpeedTestFinalResult | null>(null)
  const [history, setHistory] = useState<TestResult[]>([])

  const abortControllerRef = useRef<AbortController | null>(null)

  // Load persistent test history from database
  useEffect(() => {
    window.api.db
      .getSpeedTests()
      .then(setHistory)
      .catch((err) => console.error('Failed to load speed test history:', err))

    // Initial server node lookup
    if (window.api?.getPublicIp) {
      window.api
        .getPublicIp()
        .then((info) => {
          if (info && info.isp) {
            setServerNode(`${info.isp} (${info.location || info.countryCode})`)
          } else {
            setServerNode('Cloudflare Edge Network')
          }
        })
        .catch(() => setServerNode('Cloudflare Edge Network'))
    }
  }, [])

  // Execute real speed test
  const runSpeedTest = useCallback(async () => {
    if (isRunning) return

    setIsRunning(true)
    setProgress(0)
    setTestPhase('ping')
    setFinalResult(null)

    // Reset live counters
    setLiveGaugeMbps(0)
    setLiveDownload(0)
    setLiveUpload(0)
    setLivePing(0)
    setLiveJitter(0)

    showToast(
      'info',
      'Speed Test Started',
      'Measuring real internet bandwidth and ping latency...',
      2500
    )

    abortControllerRef.current = new AbortController()

    try {
      const result = await executeRealSpeedTest(
        {
          onPhaseChange: (phase) => {
            setTestPhase(phase)
            if (phase === 'download') setLiveGaugeMbps(0)
            if (phase === 'upload') setLiveGaugeMbps(0)
          },
          onProgress: (pct) => setProgress(pct),
          onPingUpdate: (ping, jitter) => {
            setLivePing(ping)
            setLiveJitter(jitter)
          },
          onDownloadUpdate: (mbps) => {
            setLiveDownload(mbps)
            setLiveGaugeMbps(mbps)
          },
          onUploadUpdate: (mbps) => {
            setLiveUpload(mbps)
            setLiveGaugeMbps(mbps)
          },
          onServerDetected: (nodeName) => {
            setServerNode(nodeName)
          }
        },
        abortControllerRef.current.signal
      )

      // Lock in final results
      setFinalResult(result)
      setLiveDownload(result.downloadMbps)
      setLiveUpload(result.uploadMbps)
      setLivePing(result.pingMs)
      setLiveJitter(result.jitterMs)
      setLiveGaugeMbps(result.downloadMbps)
      setIsRunning(false)
      setTestPhase('completed')

      // Save result to SQLite DB
      const now = new Date()
      const newRecord: TestResult = {
        timestamp: now.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        downloadMbps: result.downloadMbps,
        uploadMbps: result.uploadMbps,
        pingMs: result.pingMs,
        jitterMs: result.jitterMs,
        server: result.server
      }

      try {
        await window.api.db.insertSpeedTest(newRecord)
        const updatedHistory = await window.api.db.getSpeedTests()
        setHistory(updatedHistory)
      } catch (dbErr) {
        console.error('Failed to save speed test to DB:', dbErr)
        setHistory((prev) => [newRecord, ...prev].slice(0, 15))
      }

      showToast(
        'success',
        'Speed Test Complete',
        `Download: ${formatSpeedUnit(result.downloadMbps).value} ${formatSpeedUnit(result.downloadMbps).unit} · Upload: ${formatSpeedUnit(result.uploadMbps).value} ${formatSpeedUnit(result.uploadMbps).unit}`
      )
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage !== 'Test aborted') {
        console.error('Speed test execution error:', err)
        showToast('error', 'Speed Test Failed', 'Could not complete speed measurement.')
      }
      setIsRunning(false)
      setTestPhase('idle')
    }
  }, [isRunning, showToast])

  const stopSpeedTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsRunning(false)
      setTestPhase('idle')
      showToast('info', 'Test Cancelled', 'Speed test was stopped.')
    }
  }, [showToast])

  const clearHistory = useCallback(async () => {
    try {
      await window.api.db.clearSpeedTests()
      setHistory([])
      showToast('info', 'History Cleared', 'Speed test metrics database cleared.')
    } catch (err) {
      console.error('Failed to clear history:', err)
      showToast('error', 'Database Error', 'Could not clear speed test database.')
    }
  }, [showToast])

  // Current values to display
  const currentDlMbps = liveDownload > 0 ? liveDownload : finalResult ? finalResult.downloadMbps : 0
  const currentUlMbps = liveUpload > 0 ? liveUpload : finalResult ? finalResult.uploadMbps : 0

  const dlFormatted = formatSpeedUnit(currentDlMbps)
  const ulFormatted = formatSpeedUnit(currentUlMbps)

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Internet Speed Test</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Real-time Ookla-style internet speed test with live payload measurement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <Button variant="secondary" size="sm" leftIcon={<Trash2 size={14} />} onClick={clearHistory}>
              Clear History
            </Button>
          )}
          {isRunning ? (
            <Button variant="danger" size="md" onClick={stopSpeedTest}>
              Stop Test
            </Button>
          ) : (
            <Button
              variant="accent"
              size="md"
              leftIcon={<Play size={16} />}
              onClick={runSpeedTest}
            >
              Start Speed Test
            </Button>
          )}
        </div>
      </div>

      {/* Unit explanation tip bar */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs text-[var(--text-secondary)]">
        <Info size={16} className="text-primary-500 flex-shrink-0" />
        <span>
          <strong>Real Speed Metrics:</strong> Speeds are measured in <strong>Mbps</strong> (Megabits/sec, line bandwidth) and converted to <strong>MB/s</strong> (Megabytes/sec, file download speed where 8 Mbps = 1 MB/s). If your speed is below 1 Mbps, it automatically displays in <strong>Kbps</strong> (Kilobits/sec).
        </span>
      </div>

      {/* Progress Bar during active test */}
      {isRunning && (
        <div className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl space-y-2 animate-fade-in shadow-sm">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-accent-500" />
              {testPhase === 'ping' && 'Phase 1/3: Measuring Ping Latency & Jitter...'}
              {testPhase === 'download' && 'Phase 2/3: Streaming Download Bandwidth Payload...'}
              {testPhase === 'upload' && 'Phase 3/3: Testing Upload Bandwidth Throughput...'}
              {testPhase === 'completed' && 'Finalizing results...'}
            </span>
            <span className="text-accent-500 font-mono text-sm">{progress}%</span>
          </div>
          <ProgressBar value={progress} variant="accent" size="sm" showLabel={false} />
        </div>
      )}

      {/* Speedometer Gauge Display */}
      <Card className="flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card">
        <SpeedometerGauge
          value={liveGaugeMbps}
          maxMbps={500}
          phase={testPhase}
          progress={progress}
          pingMs={livePing}
          jitterMs={liveJitter}
        />
      </Card>

      {/* Real-Time Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Download Rate Card */}
        <Card className="relative overflow-hidden">
          <CardHeader
            title="Download Rate"
            icon={<ArrowDown className="text-emerald-500" size={16} />}
          />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black font-mono tracking-tight text-[var(--text-primary)]">
                {currentDlMbps > 0 ? dlFormatted.value : '—'}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">
                {currentDlMbps > 0 ? dlFormatted.unit : 'Mbps'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-500 font-medium mt-1">
              {currentDlMbps > 0 ? `≈ ${formatBytesPerSecond(currentDlMbps)}` : 'File speed'}
            </span>
          </CardContent>
          {testPhase === 'download' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse" />
          )}
        </Card>

        {/* Upload Rate Card */}
        <Card className="relative overflow-hidden">
          <CardHeader
            title="Upload Rate"
            icon={<ArrowUp className="text-cyan-500" size={16} />}
          />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black font-mono tracking-tight text-[var(--text-primary)]">
                {currentUlMbps > 0 ? ulFormatted.value : '—'}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">
                {currentUlMbps > 0 ? ulFormatted.unit : 'Mbps'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-cyan-500 font-medium mt-1">
              {currentUlMbps > 0 ? `≈ ${formatBytesPerSecond(currentUlMbps)}` : 'File speed'}
            </span>
          </CardContent>
          {testPhase === 'upload' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-500 animate-pulse" />
          )}
        </Card>

        {/* Ping & Jitter Card */}
        <Card className="relative overflow-hidden">
          <CardHeader
            title="Ping &amp; Jitter"
            icon={<Activity className="text-amber-500" size={16} />}
          />
          <CardContent className="space-y-2 py-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-secondary)]">Ping Latency</span>
              <span className="font-bold font-mono text-[var(--text-primary)]">
                {livePing > 0 || finalResult !== null ? `${livePing} ms` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-secondary)]">Jitter Variance</span>
              <span className="font-bold font-mono text-[var(--text-primary)]">
                {liveJitter > 0 || finalResult !== null ? `${liveJitter} ms` : '—'}
              </span>
            </div>
          </CardContent>
          {testPhase === 'ping' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 animate-pulse" />
          )}
        </Card>

        {/* Server & ISP Node Card */}
        <Card className="relative overflow-hidden">
          <CardHeader
            title="Test Server Node"
            icon={<Server className="text-indigo-500" size={16} />}
          />
          <CardContent className="flex flex-col justify-center py-3">
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {serverNode}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1 truncate">
              Cloudflare Edge Test Infrastructure
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Speed Test History Log */}
      <Card>
        <CardHeader
          title="Speed Test Metrics History"
          subtitle="Persistent record of previous bandwidth tests saved in SQLite"
          icon={<Gauge size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 font-bold">Timestamp</th>
                  <th className="py-2.5 font-bold">Download (Mbps / MB/s)</th>
                  <th className="py-2.5 font-bold">Upload (Mbps / MB/s)</th>
                  <th className="py-2.5 font-bold">Ping / Jitter</th>
                  <th className="py-2.5 font-bold">Server Node</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-[var(--text-muted)]" colSpan={5}>
                      No speed test metrics recorded yet. Click &quot;Start Speed Test&quot; to measure your network connection.
                    </td>
                  </tr>
                ) : (
                  history.map((item, idx) => {
                    const dlFmt = formatSpeedUnit(item.downloadMbps)
                    const ulFmt = formatSpeedUnit(item.uploadMbps)
                    return (
                      <tr
                        key={item.id || idx}
                        className="border-b border-[var(--border-color)]/50 last:border-0 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                      >
                        <td className="py-3 font-medium text-[var(--text-primary)]">{item.timestamp}</td>
                        <td className="py-3 font-semibold font-mono text-emerald-500">
                          {dlFmt.value} {dlFmt.unit}{' '}
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">
                            ({formatBytesPerSecond(item.downloadMbps)})
                          </span>
                        </td>
                        <td className="py-3 font-semibold font-mono text-cyan-500">
                          {ulFmt.value} {ulFmt.unit}{' '}
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">
                            ({formatBytesPerSecond(item.uploadMbps)})
                          </span>
                        </td>
                        <td className="py-3 font-mono text-[var(--text-secondary)]">
                          {item.pingMs} ms / {item.jitterMs} ms
                        </td>
                        <td className="py-3 text-[var(--text-secondary)] truncate max-w-[200px]">
                          {item.server}
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
