import { useState, useEffect, useCallback } from 'react'
import { Wifi, RefreshCw, Signal, Shield, Radio, Check, Laptop } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Skeleton,
  SkeletonTable
} from '@/components/ui'
import { useToast, useWifi } from '@/context'
import { getMacManufacturer } from '@/utils'

interface ScannedNetwork {
  ssid: string
  signal: number
  channel: number
  security: string
  bssid: string
  isActive?: boolean
}

interface AdapterDetails {
  name: string
  description: string
  physicalAddress: string
  state: string
  ssid: string
  bssid: string
  radioType: string
  authentication: string
  cipher: string
  channel: number
  receiveRate: number
  transmitRate: number
  signal: number
  isSimulated: boolean
}

/**
 * WifiInfoPage — Interacts directly with Windows netsh wlan CLI properties via Electron IPC.
 * Loads active adapter parameters automatically on mount and executes live airwaves scans.
 */
export function WifiInfoPage(): React.JSX.Element {
  const { showToast } = useToast()
  const { lastRefreshTime } = useWifi()
  const [scanning, setScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [loadingAdapter, setLoadingAdapter] = useState(true)
  const [adapterDetails, setAdapterDetails] = useState<AdapterDetails | null>(null)
  const [nearbyNetworks, setNearbyNetworks] = useState<ScannedNetwork[]>([])

  const loadAdapter = useCallback(
    async (silent = false): Promise<void> => {
      if (!silent) setLoadingAdapter(true)
      try {
        const details = await window.api.detectAdapter()
        setAdapterDetails(details)
      } catch (err) {
        console.error('Failed to load active Wi-Fi adapter properties:', err)
        showToast(
          'error',
          'Adapter Detection Failed',
          'Unable to communicate with host wireless service.'
        )
      } finally {
        if (!silent) setLoadingAdapter(false)
      }
    },
    [showToast]
  )

  // Load active adapter on mount
  // Initial load on mount and dynamic live status refreshes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAdapter(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [loadAdapter, lastRefreshTime])

  const triggerScan = async (): Promise<void> => {
    setScanning(true)
    showToast(
      'info',
      'Scanning Airwaves',
      'Requesting wireless adapter interface scan details...',
      1500
    )

    try {
      // Fetch nearby networks
      const networks = await window.api.scanNetworks()

      // Refresh active adapter details
      const details = await window.api.detectAdapter()
      setAdapterDetails(details)

      // Map connection state to highlight connected SSID
      const parsedNetworks = networks.map((net) => ({
        ...net,
        isActive: details && details.ssid ? net.ssid === details.ssid : false
      }))

      setNearbyNetworks(parsedNetworks)
      setHasScanned(true)

      showToast(
        'success',
        'Scan Completed',
        `Successfully detected ${networks.length} wireless access points within range.`
      )
    } catch (err) {
      console.error('Failed to perform adapter network scan:', err)
      showToast('error', 'Scan Failed', 'Unable to retrieve interface radio profiles.')
    } finally {
      setScanning(false)
    }
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
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => loadAdapter(false)}
            disabled={scanning || loadingAdapter}
          >
            Refresh Adapter
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={triggerScan}
            isLoading={scanning}
            disabled={loadingAdapter}
          >
            {scanning ? 'Scanning...' : 'Scan Networks'}
          </Button>
        </div>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Signal card */}
        <Card>
          <CardHeader title="Signal &amp; Quality" icon={<Signal size={16} />} />
          <CardContent className="space-y-4">
            {loadingAdapter ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !adapterDetails || adapterDetails.state !== 'connected' ? (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">
                Adapter disconnected or offline
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Signal Strength</span>
                  <Badge variant="accent">-{100 - adapterDetails.signal} dBm</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Quality Score</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {adapterDetails.signal}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Link Speed (Tx/Rx)</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {adapterDetails.transmitRate} / {adapterDetails.receiveRate} Mbps
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security card */}
        <Card>
          <CardHeader title="Security &amp; Protocol" icon={<Shield size={16} />} />
          <CardContent className="space-y-4">
            {loadingAdapter ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !adapterDetails || adapterDetails.state !== 'connected' ? (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">
                Adapter disconnected or offline
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Authentication</span>
                  <Badge variant="primary">{adapterDetails.authentication}</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Cipher Type</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {adapterDetails.cipher}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">802.11 Protocol</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {adapterDetails.radioType}
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
            {loadingAdapter ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !adapterDetails || adapterDetails.state !== 'connected' ? (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">
                Adapter disconnected or offline
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">SSID (Name)</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {adapterDetails.ssid}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">BSSID (MAC)</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] text-right">
                    <div>{adapterDetails.bssid}</div>
                    <div className="text-[10px] opacity-60 font-sans font-normal">
                      {getMacManufacturer(adapterDetails.bssid)}
                    </div>
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Active Channel</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Channel {adapterDetails.channel}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adapter Hardware Description Card */}
      {adapterDetails && (
        <Card>
          <CardHeader title="Hardware Adapter Information" icon={<Laptop size={16} />} />
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs py-2">
            <div className="space-y-1">
              <span className="text-[var(--text-muted)] font-medium block">Description</span>
              <span className="font-bold text-[var(--text-primary)]">
                {adapterDetails.description}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[var(--text-muted)] font-medium block">
                Physical Adapter MAC
              </span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                <div>{adapterDetails.physicalAddress}</div>
                <div className="text-[10px] opacity-60 font-sans font-normal">
                  {getMacManufacturer(adapterDetails.physicalAddress)}
                </div>
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[var(--text-muted)] font-medium block">
                Interface Link Status
              </span>
              <span className="font-semibold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    adapterDetails.isSimulated ? 'bg-warning-500 animate-pulse' : 'bg-accent-500'
                  }`}
                />
                <span
                  className={adapterDetails.isSimulated ? 'text-warning-500' : 'text-accent-500'}
                >
                  {adapterDetails.isSimulated ? 'Virtual Adapter' : 'Host Interface Active'}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
                        ${net.isActive ? 'bg-primary-50/20 dark:bg-primary-950/10 font-semibold' : ''}
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
                          className={`font-semibold ${
                            net.signal >= 75
                              ? 'text-accent-500'
                              : net.signal >= 50
                                ? 'text-primary-500'
                                : 'text-warning-500'
                          }`}
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
                      <td className="py-3 font-mono text-[var(--text-secondary)]">
                        <div>{net.bssid}</div>
                        <div className="text-[10px] opacity-60 font-sans">
                          {getMacManufacturer(net.bssid)}
                        </div>
                      </td>
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
