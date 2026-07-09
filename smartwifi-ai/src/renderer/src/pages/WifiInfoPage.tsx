import { Wifi, RefreshCw, Signal, Shield, Radio } from 'lucide-react'
import { Card, CardHeader, CardContent, Badge, Button } from '@/components/ui'

export function WifiInfoPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Wi-Fi Connection Details</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Detailed properties of the active wireless network adapter
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />}>
          Scan Networks
        </Button>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Signal & Quality" icon={<Signal size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Signal Strength</span>
              <Badge variant="accent">— dBm</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Quality Score</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">— %</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Link Speed</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">— Mbps</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Security & Protocol" icon={<Shield size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Authentication</span>
              <Badge variant="primary">—</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Encryption</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">802.11 Protocol</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">—</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Radio & Band" icon={<Radio size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">SSID (Name)</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">BSSID (MAC)</span>
              <span className="text-sm font-mono text-xs text-[var(--text-primary)]">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--text-muted)]">Channel / Band</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">— / — GHz</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Networks Table */}
      <Card>
        <CardHeader
          title="Nearby Networks"
          subtitle="Detected access points within range"
          icon={<Wifi size={16} />}
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="py-2.5 font-medium">SSID</th>
                  <th className="py-2.5 font-medium">Signal</th>
                  <th className="py-2.5 font-medium">Channel</th>
                  <th className="py-2.5 font-medium">Security</th>
                  <th className="py-2.5 font-medium">BSSID</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-primary)]">
                  <td className="py-3" colSpan={5}>
                    <div className="text-center text-[var(--text-muted)] py-4">
                      No wireless networks scanned yet. Click &quot;Scan Networks&quot; to refresh.
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
