import { Gauge, Play, ArrowDown, ArrowUp, Activity } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function SpeedTestPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Internet Speed Test</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Measure real-time download speed, upload speed, and response ping
          </p>
        </div>
        <Button variant="accent" size="md" leftIcon={<Play size={16} />}>
          Start Speed Test
        </Button>
      </div>

      {/* Main Gauges Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Download Rate"
            icon={<ArrowDown className="text-primary-500" size={16} />}
          />
          <CardContent className="flex flex-col items-center justify-center py-6">
            <span className="text-5xl font-black text-[var(--text-primary)]">—</span>
            <span className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium uppercase tracking-wider">
              Mbps
            </span>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Upload Rate"
            icon={<ArrowUp className="text-accent-500" size={16} />}
          />
          <CardContent className="flex flex-col items-center justify-center py-6">
            <span className="text-5xl font-black text-[var(--text-primary)]">—</span>
            <span className="text-xs text-[var(--text-secondary)] mt-1.5 font-medium uppercase tracking-wider">
              Mbps
            </span>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader
            title="Latency metrics"
            icon={<Activity className="text-warning-500" size={16} />}
          />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Ping Latency</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">— ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Jitter Quality</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">— ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Server Host</span>
              <span className="text-xs text-[var(--text-primary)] font-medium truncate max-w-[50%]">
                —
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History table */}
      <Card>
        <CardHeader
          title="Recent Test History"
          subtitle="Previous speed checks on this machine"
          icon={<Gauge size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-medium">Timestamp</th>
                  <th className="py-2.5 font-medium">Download Rate</th>
                  <th className="py-2.5 font-medium">Upload Rate</th>
                  <th className="py-2.5 font-medium">Ping</th>
                  <th className="py-2.5 font-medium">Server Host</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-primary)]">
                  <td className="py-3" colSpan={5}>
                    <div className="text-center text-[var(--text-muted)] py-4">
                      No previous test metrics recorded. Click &quot;Start Speed Test&quot; to
                      begin.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
