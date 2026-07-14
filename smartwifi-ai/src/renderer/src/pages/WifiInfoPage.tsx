import { useState } from 'react'
import { Wifi, RefreshCw, Signal, Shield, Radio, Check } from 'lucide-react'
import { useToast } from '@/context'
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Skeleton,
  SkeletonTable
} from '@/components/ui'

interface ScannedNetwork {
  ssid: string
  signal: number
  channel: number
  security: string
  bssid: string
  isActive?: boolean
}

export function WifiInfoPage(): React.JSX.Element {
  const { showToast } = useToast()
  const [scanning, setScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [activeNetwork, setActiveNetwork] = useState<ScannedNetwork | null>(null)
  const [nearbyNetworks, setNearbyNetworks] = useState<ScannedNetwork[]>([])

  const triggerScan = (): void => {
    setScanning(true)
    setHasScanned(false)

    showToast(
      'info',
      'Scanning Airwaves',
      'Requesting wireless adapter interface scan details...',
      1500
    )

    // Simulate nearby access point scanning
    setTimeout(() => {
      const activeNet: ScannedNetwork = {
        ssid: 'HomeNetwork_5G',
        signal: 88,
        channel: 36,
        security: 'WPA3-Personal',
        bssid: 'A4:C3:F0:8B:2E:11',
        isActive: true
      }
      setActiveNetwork(activeNet)
      setNearbyNetworks([
        activeNet,
        {
          ssid: 'Office_Guest',
          signal: 72,
          channel: 6,
          security: 'WPA2-Enterprise',
          bssid: '8C:3B:AD:12:F1:C0'
        },
        {
          ssid: 'Linksys_Router',
          signal: 54,
          channel: 11,
          security: 'WPA2-Personal',
          bssid: '40:F2:01:BC:88:5A'
        },
        {
          ssid: 'DIRECT-SmartTV',
          signal: 42,
          channel: 44,
          security: 'WPA2-Personal',
          bssid: 'BC:F4:C8:30:1F:D5'
        }
      ])
      setScanning(false)
      setHasScanned(true)
      showToast(
        'success',
        'Scan Completed',
        'Successfully detected 4 wireless access points within range.'
      )
    }, 2000)
  }

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
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={triggerScan}
          isLoading={scanning}
        >
          {scanning ? 'Scanning Airwaves...' : 'Scan Networks'}
        </Button>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Signal card */}
        <Card>
          <CardHeader title="Signal &amp; Quality" icon={<Signal size={16} />} />
          <CardContent className="space-y-4">
            {scanning ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !hasScanned ? (
              <div className="text-xs text-[var(--text-muted)] py-2 text-center">Scan required</div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Signal Strength</span>
                  <Badge variant="accent">-{100 - (activeNetwork?.signal || 0)} dBm</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Quality Score</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeNetwork?.signal}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Link Speed</span>
                  <span className="font-semibold text-[var(--text-primary)]">866 Mbps</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security card */}
        <Card>
          <CardHeader title="Security &amp; Protocol" icon={<Shield size={16} />} />
          <CardContent className="space-y-4">
            {scanning ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !hasScanned ? (
              <div className="text-xs text-[var(--text-muted)] py-2 text-center">Scan required</div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Authentication</span>
                  <Badge variant="primary">{activeNetwork?.security}</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Encryption</span>
                  <span className="font-semibold text-[var(--text-primary)]">AES-CCMP</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">802.11 Protocol</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    802.11ac (Wi-Fi 5)
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Radio Card */}
        <Card>
          <CardHeader title="Radio &amp; Band" icon={<Radio size={16} />} />
          <CardContent className="space-y-4">
            {scanning ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !hasScanned ? (
              <div className="text-xs text-[var(--text-muted)] py-2 text-center">Scan required</div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">SSID (Name)</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeNetwork?.ssid}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">BSSID (MAC)</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {activeNetwork?.bssid}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Channel / Band</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activeNetwork?.channel} / 5 GHz
                  </span>
                </div>
              </>
            )}
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
            {scanning ? (
              <div className="p-4">
                <SkeletonTable columns={5} rows={4} />
              </div>
            ) : !hasScanned ? (
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
                      <div className="text-center text-[var(--text-muted)] py-6">
                        No wireless networks scanned yet. Click &quot;Scan Networks&quot; to
                        refresh.
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                    <th className="py-2.5 font-semibold">SSID</th>
                    <th className="py-2.5 font-semibold">Signal</th>
                    <th className="py-2.5 font-semibold">Channel</th>
                    <th className="py-2.5 font-semibold">Security</th>
                    <th className="py-2.5 font-semibold">BSSID</th>
                  </tr>
                </thead>
                <tbody>
                  {nearbyNetworks.map((net, idx) => (
                    <tr
                      key={idx}
                      className={`
                        border-b border-[var(--border-color)]/50 last:border-0 text-[var(--text-primary)]
                        ${net.isActive ? 'bg-primary-50/20 dark:bg-primary-950/10 font-medium' : ''}
                      `.trim()}
                    >
                      <td className="py-3 flex items-center gap-2">
                        {net.isActive && (
                          <Check size={12} className="text-accent-500 flex-shrink-0" />
                        )}
                        <span>{net.ssid}</span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-semibold ${net.signal >= 75 ? 'text-accent-500' : net.signal >= 50 ? 'text-primary-500' : 'text-warning-500'}`}
                        >
                          {net.signal}%
                        </span>
                      </td>
                      <td className="py-3">{net.channel}</td>
                      <td className="py-3">
                        <Badge
                          variant={net.security.includes('Enterprise') ? 'primary' : 'default'}
                          size="sm"
                        >
                          {net.security}
                        </Badge>
                      </td>
                      <td className="py-3 font-mono text-[var(--text-secondary)]">{net.bssid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
