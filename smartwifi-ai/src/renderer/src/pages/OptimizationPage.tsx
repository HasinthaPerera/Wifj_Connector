import { Zap, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function OptimizationPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Network Optimization</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Enhance and troubleshoot your local TCP/IP and wireless settings safely
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Flush DNS Cache" icon={<RefreshCw size={16} />} />
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Clear saved domain lookups from memory to fix host loading issues.
            </p>
            <Button variant="primary" size="sm">
              Flush DNS
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Renew Lease" icon={<Zap size={16} />} />
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Release and request a new local IP lease from your DHCP router server.
            </p>
            <Button variant="accent" size="sm">
              Renew IP Lease
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
