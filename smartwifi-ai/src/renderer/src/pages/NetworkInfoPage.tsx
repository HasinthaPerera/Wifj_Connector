import { RefreshCw, Cpu, Globe, Server } from 'lucide-react'
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui'

export function NetworkInfoPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            System Network Information
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Local adapter metrics and TCP/IP configuration properties
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />}>
          Refresh Interfaces
        </Button>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Active Interface Card" icon={<Cpu size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Interface Name</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Connection Type</span>
              <Badge variant="primary">—</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">IP Address</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Subnet Mask</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">MAC Address</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Gateway & DNS Configuration" icon={<Globe size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Default Gateway</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Primary DNS Server</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Secondary DNS Server</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">DHCP Server IP</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Lease Obtained</span>
              <span className="text-sm text-[var(--text-primary)]">—</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adapters List */}
      <Card>
        <CardHeader
          title="System Network Interfaces"
          subtitle="All installed physical and virtual network controllers"
          icon={<Server size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-medium">Adapter Name</th>
                  <th className="py-2.5 font-medium">Type</th>
                  <th className="py-2.5 font-medium">Status</th>
                  <th className="py-2.5 font-medium">IPv4 Address</th>
                  <th className="py-2.5 font-medium">Physical Address (MAC)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-primary)]">
                  <td className="py-3" colSpan={5}>
                    <div className="text-center text-[var(--text-muted)] py-4">
                      Loading hardware interface devices...
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
