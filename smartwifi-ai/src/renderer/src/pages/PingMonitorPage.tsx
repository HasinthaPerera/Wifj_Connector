import { Activity, Play, Settings2, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function PingMonitorPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Real-time Ping Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Monitor connection responsiveness and ICMP echo response times
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Settings2 size={14} />}>
            Configure Targets
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Play size={14} />}>
            Start Monitoring
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Current Latency" icon={<Activity size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-4xl font-extrabold text-[var(--text-primary)]">—</span>
            <span className="text-xs text-[var(--text-secondary)] mt-1">ms</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Stability Status" icon={<ShieldCheck size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-2xl font-bold text-[var(--text-primary)]">Waiting...</span>
            <span className="text-xs text-[var(--text-secondary)] mt-2">
              Start monitor to view status
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Target Endpoint" icon={<Settings2 size={16} />} />
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">DNS Host Target</span>
              <span className="font-semibold text-[var(--text-primary)]">8.8.8.8 (Google)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Scan Interval</span>
              <span className="font-semibold text-[var(--text-primary)]">1000 ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Telemetry Stream"
          subtitle="Live response latency timeline"
          icon={<Activity size={16} />}
        />
        <CardContent>
          <div className="h-48 border border-[var(--border-color)] border-dashed rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)]">
            Chart telemetry will load when monitor is started
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
