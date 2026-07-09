import { History, Calendar } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui'

export function HistoryPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Historical Analytics</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Historical metrics for speed tests, signal quality scans, and drops
        </p>
      </div>

      <Card>
        <CardHeader
          title="Logs Timeline"
          subtitle="Log of previous connection events"
          icon={<History size={16} />}
        />
        <CardContent>
          <div className="text-center text-[var(--text-muted)] text-xs py-8">
            <Calendar className="mx-auto text-primary-400 mb-2" size={24} />
            No metrics have been recorded in the database yet.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
