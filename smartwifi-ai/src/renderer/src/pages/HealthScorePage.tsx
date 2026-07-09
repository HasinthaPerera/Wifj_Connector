import { HeartPulse, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui'

export function HealthScorePage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Wi-Fi Health Score</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Comprehensive connection score profiling network quality and speed attributes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 flex flex-col justify-between">
          <CardHeader title="Overall Score" icon={<HeartPulse size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6">
            <span className="text-6xl font-black text-accent-500">—</span>
            <span className="text-xs text-[var(--text-secondary)] mt-2">Waiting for scan data</span>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Score Breakdown" icon={<CheckCircle2 size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Signal Strength & Stability</span>
              <span className="font-semibold text-[var(--text-primary)]">— / 100</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Response Latency Rate</span>
              <span className="font-semibold text-[var(--text-primary)]">— / 100</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Bandwidth Speeds</span>
              <span className="font-semibold text-[var(--text-primary)]">— / 100</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
