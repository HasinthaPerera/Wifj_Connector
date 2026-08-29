import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Gauge, Play, ArrowDown, ArrowUp, Activity, Server, RefreshCw, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, ProgressBar } from '@/components/ui'
import { SpeedometerGauge } from '@/components/SpeedometerGauge'
import { executeRealSpeedTest, SpeedTestFinalResult } from '@/utils/speedTestRunner'
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
 * SpeedTestPage — Real-Time Bandwidth & Latency Measurement Engine.
 * Runs Ookla-style speed tests with actual payload transfer, real-time sweeping gauge,
 * live ping/jitter detection, and persistent SQLite metric logs.
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
        `Download: ${result.downloadMbps} Mbps · Upload: ${result.uploadMbps} Mbps · Ping: ${result.pingMs} ms`
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
                {liveDownload > 0
                  ? liveDownload.toFixed(1)
                  : finalResult !== null
                    ? finalResult.downloadMbps.toFixed(1)
                    : '—'}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Mbps</span>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1">
              {testPhase === 'download' ? 'Streaming...' : 'Peak Download Speed'}
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
                {liveUpload > 0
                  ? liveUpload.toFixed(1)
                  : finalResult !== null
                    ? finalResult.uploadMbps.toFixed(1)
                    : '—'}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Mbps</span>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1">
              {testPhase === 'upload' ? 'Sending Payload...' : 'Peak Upload Speed'}
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
                  <th className="py-2.5 font-bold">Download</th>
                  <th className="py-2.5 font-bold">Upload</th>
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
                  history.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="border-b border-[var(--border-color)]/50 last:border-0 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                    >
                      <td className="py-3 font-medium text-[var(--text-primary)]">{item.timestamp}</td>
                      <td className="py-3 font-semibold font-mono text-emerald-500">
                        {item.downloadMbps.toFixed(1)} Mbps
                      </td>
                      <td className="py-3 font-semibold font-mono text-cyan-500">
                        {item.uploadMbps.toFixed(1)} Mbps
                      </td>
                      <td className="py-3 font-mono text-[var(--text-secondary)]">
                        {item.pingMs} ms / {item.jitterMs} ms
                      </td>
                      <td className="py-3 text-[var(--text-secondary)] truncate max-w-[200px]">
                        {item.server}
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
