import { Signal, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function SignalStrengthPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Signal Strength Monitor</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Trace wireless signal attenuation (dBm) and detect interference levels
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />}>
          Refresh Signal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Current dBm reading" icon={<Signal size={16} />} />
          <CardContent className="flex flex-col items-center justify-center py-6">
            <span className="text-5xl font-black text-[var(--text-primary)]">— dBm</span>
            <span className="text-xs text-[var(--text-secondary)] mt-2">
              Recommended range: -30 to -60 dBm
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Quality Details" icon={<Signal size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Signal Status</span>
              <span className="font-semibold text-[var(--text-primary)]">Unknown</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Noise Floor</span>
              <span className="font-semibold text-[var(--text-primary)]">— dBm</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
