import { useState, useEffect, useCallback } from 'react'
import { Signal, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  ProgressBar,
  Skeleton
} from '@/components/ui'
import { useWifi } from '@/context'

interface SignalReading {
  timestamp: string
  percent: number
  dbm: number
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
}

/**
 * SignalStrengthPage — Tracks and displays live wireless link attenuation metrics.
 * Connects directly to the global WifiContext polling loop to monitor signal decay.
 */
export function SignalStrengthPage(): React.JSX.Element {
  const { status, refreshStatus } = useWifi()
  const [refreshing, setRefreshing] = useState(false)
  const [history, setHistory] = useState<SignalReading[]>([])

  // Calculate dBm from percentage: dBm = (Percent / 2) - 100
  const percent = status.signal
  const dbm = Math.round(percent / 2 - 100)

  // Resolve status labeling
  const getQuality = (dbmVal: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' => {
    if (dbmVal >= -60) return 'Excellent'
    if (dbmVal >= -70) return 'Good'
    if (dbmVal >= -80) return 'Fair'
    return 'Poor'
  }

  const getQualityColor = (quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'): string => {
    switch (quality) {
      case 'Excellent':
        return 'text-accent-500 bg-accent-500/10 border-accent-200 dark:border-accent-900/30'
      case 'Good':
        return 'text-primary-500 bg-primary-500/10 border-primary-200 dark:border-primary-900/30'
      case 'Fair':
        return 'text-warning-500 bg-warning-500/10 border-warning-200 dark:border-warning-900/30'
      case 'Poor':
        return 'text-danger-500 bg-danger-500/10 border-danger-200 dark:border-danger-900/30'
    }
  }

  const getQualityBarColor = (
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  ): 'accent' | 'primary' | 'warning' | 'danger' => {
    switch (quality) {
      case 'Excellent':
        return 'accent'
      case 'Good':
        return 'primary'
      case 'Fair':
        return 'warning'
      case 'Poor':
        return 'danger'
    }
  }

  const currentQuality = getQuality(dbm)

  // Capture history on updates
  useEffect(() => {
    if (status.loading) return

    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    const newReading: SignalReading = {
      timestamp: now,
      percent,
      dbm,
      quality: getQuality(dbm)
    }

    const timer = setTimeout(() => {
      setHistory((prev) => {
        // Avoid duplicate consecutive identical values to keep history clean
        if (prev.length > 0 && prev[prev.length - 1].percent === percent) {
          return prev
        }
        const updated = [...prev, newReading]
        // Limit history to 6 records
        return updated.slice(-6)
      })
    }, 0)

    return () => clearTimeout(timer)
  }, [percent, dbm, status.loading])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshStatus()
    setTimeout(() => setRefreshing(false), 800)
  }, [refreshStatus])

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Signal Strength Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Trace wireless signal attenuation (dBm) and detect interference levels
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={handleRefresh}
          disabled={status.loading || refreshing}
        >
          {refreshing ? 'Reading...' : 'Refresh Signal'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current dBm Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Current Signal Attenuation" icon={<Signal size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
            {status.loading ? (
              <div className="flex flex-col items-center space-y-3 w-full px-10">
                <Skeleton variant="text" width="60%" height="2rem" />
                <Skeleton variant="text" width="40%" height="0.875rem" />
              </div>
            ) : !status.isConnected ? (
              <div className="text-xs text-[var(--text-muted)] py-6 text-center">
                Adapter offline. Connect to Wi-Fi.
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center space-y-1 select-none">
                  <span className="text-5xl font-black tracking-tight text-[var(--text-primary)]">
                    {dbm} dBm
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    Quality: {percent}%
                  </span>
                </div>

                <Badge
                  variant={
                    currentQuality === 'Poor'
                      ? 'danger'
                      : currentQuality === 'Fair'
                        ? 'warning'
                        : 'accent'
                  }
                  className={`border ${getQualityColor(currentQuality)}`}
                  size="md"
                >
                  {currentQuality.toUpperCase()} LINK QUALITY
                </Badge>

                <div className="w-full px-6 pt-2">
                  <ProgressBar
                    value={percent}
                    variant={getQualityBarColor(currentQuality)}
                    size="md"
                    showLabel={false}
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1.5 font-mono">
                    <span>Poor (-100 dBm)</span>
                    <span>Excellent (-30 dBm)</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quality Details Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader title="Channel Quality details" icon={<Signal size={16} />} />
          <CardContent className="space-y-4">
            {status.loading ? (
              <div className="space-y-4 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !status.isConnected ? (
              <div className="text-xs text-[var(--text-muted)] py-6 text-center">
                Adapter offline or disconnected
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Link State</span>
                  <span className="font-bold text-accent-500 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Connected ({status.ssid})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">
                    Estimated Noise Floor
                  </span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">
                    -92 dBm
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Signal Overlap Risk</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {dbm >= -65 ? 'Low' : dbm >= -78 ? 'Moderate' : 'High Overlap Risk'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Channel Location</span>
                  <span className="font-semibold text-[var(--text-primary)] font-mono">
                    Channel {status.channel || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Adapter Interface</span>
                  <Badge variant={status.isSimulated ? 'warning' : 'primary'} size="sm">
                    {status.isSimulated ? 'Simulated Adapter' : 'Host Adapter'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attenuation Trace Log Card */}
      <Card>
        <CardHeader
          title="Signal Attenuation Trace History"
          subtitle="Captures signal power fluctuations over time"
          icon={<Signal size={16} />}
        />
        <CardContent>
          <div className="space-y-3">
            {status.loading ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !status.isConnected ? (
              <div className="text-center text-xs text-[var(--text-muted)] py-4">
                No signal trace data. Connect to Wi-Fi.
              </div>
            ) : history.length === 0 ? (
              <div className="text-center text-xs text-[var(--text-muted)] py-4">
                Initializing trace logs... Waiting for signals.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {[...history].reverse().map((read, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs p-3 rounded-lg border border-[var(--border-color)] bg-surface-50/50 dark:bg-surface-850/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        [{read.timestamp}]
                      </span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        Quality Level: {read.percent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {read.dbm} dBm
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          read.quality === 'Excellent'
                            ? 'text-accent-500 bg-accent-500/10'
                            : read.quality === 'Good'
                              ? 'text-primary-500 bg-primary-500/10'
                              : read.quality === 'Fair'
                                ? 'text-warning-500 bg-warning-500/10'
                                : 'text-danger-500 bg-danger-500/10'
                        }`}
                      >
                        {read.quality === 'Poor' && <ShieldAlert size={10} />}
                        {read.quality}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
