import { useState } from 'react'
import { Zap, RefreshCw, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function OptimizationPage(): React.JSX.Element {
  const [shouldCrash, setShouldCrash] = useState(false)

  if (shouldCrash) {
    throw new Error(
      'Simulated diagnostic runtime crash: Interface render failed to synchronize adapter driver hooks.'
    )
  }

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

        {/* Diagnostic Simulator Zone */}
        <Card className="md:col-span-2 border-dashed border-warning-200/60 dark:border-warning-900/30">
          <CardHeader
            title="Developer Diagnostic Simulation"
            icon={<AlertTriangle className="text-warning-500" size={16} />}
          />
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Simulate a React rendering exception to test the application&apos;s crash safety and
              the Error Boundary recovery workflow.
            </p>
            <Button variant="danger" size="sm" onClick={() => setShouldCrash(true)}>
              Simulate Interface Error
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
