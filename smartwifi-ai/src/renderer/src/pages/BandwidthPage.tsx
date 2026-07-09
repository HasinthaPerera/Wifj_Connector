import { BarChart3, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function BandwidthPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Bandwidth Monitoring</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Trace real-time data rates uploaded/downloaded by the interface adapter
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />}>
          Reset Counters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Download Data Rate" icon={<BarChart3 size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-3xl font-extrabold text-[var(--text-primary)]">— KB/s</span>
            <span className="text-xs text-[var(--text-secondary)] mt-1">
              Total Downloaded: — MB
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Upload Data Rate" icon={<BarChart3 size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-3xl font-extrabold text-[var(--text-primary)]">— KB/s</span>
            <span className="text-xs text-[var(--text-secondary)] mt-1">Total Uploaded: — MB</span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
