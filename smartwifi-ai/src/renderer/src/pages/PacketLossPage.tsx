import { AlertTriangle, Play } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

export function PacketLossPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Packet Loss Detection</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Diagnose network quality by detecting lost packet counts
          </p>
        </div>
        <Button variant="danger" size="sm" leftIcon={<Play size={14} />}>
          Run Diagnostics
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Transmission Diagnostics" icon={<AlertTriangle size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Sent Packets</span>
              <span className="font-semibold text-[var(--text-primary)]">0</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Received Packets</span>
              <span className="font-semibold text-[var(--text-primary)]">0</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Lost Count</span>
              <span className="font-semibold text-danger-500">0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Loss Rate" icon={<AlertTriangle size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-4">
            <Badge variant="accent">0.0% Loss</Badge>
            <span className="text-[10px] text-[var(--text-secondary)] mt-2 text-center">
              Status: Perfect Transmission Quality
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
