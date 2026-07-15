import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Cpu, Globe, Server, CheckCircle2, XCircle } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Skeleton,
  SkeletonTable
} from '@/components/ui'
import { useToast } from '@/context'

interface NetworkInterface {
  name: string
  description: string
  macAddress: string
  ipAddress: string
  subnetMask: string
  gateway: string
  dnsServers: string[]
  dhcpServer: string
  leaseObtained: string
  leaseExpires: string
  type: 'wifi' | 'ethernet' | 'loopback' | 'other'
  status: 'connected' | 'disconnected'
  isDhcpEnabled: boolean
  isSimulated?: boolean
}

/**
 * NetworkInfoPage — Interacts directly with Windows ipconfig configurations via Electron IPC.
 * Automatically loads active IP properties, DNS namespaces, and lists all host adapter states.
 */
export function NetworkInfoPage(): React.JSX.Element {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])

  const loadNetworkConfig = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (isRefresh) {
        setRefreshing(true)
        showToast(
          'info',
          'Refreshing Interfaces',
          'Querying TCP/IP active properties and gateway DNS servers...',
          1500
        )
      } else {
        setLoading(true)
      }

      try {
        const data = await window.api.getNetworkConfig()
        setInterfaces(data)
        if (isRefresh) {
          showToast(
            'success',
            'Interfaces Synchronized',
            `Discovered ${data.length} active hardware adapter controllers.`
          )
        }
      } catch (err) {
        console.error('Failed to load local network configurations:', err)
        showToast('error', 'Query Failed', 'Unable to retrieve interface IP details.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [showToast]
  )

  // Initial load on mount
  useEffect(() => {
    let active = true
    const detect = async (): Promise<void> => {
      try {
        const data = await window.api.getNetworkConfig()
        if (active) {
          setInterfaces(data)
        }
      } catch (err) {
        console.error('Failed to load local network configurations:', err)
        if (active) {
          showToast('error', 'Query Failed', 'Unable to retrieve interface IP details.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    detect()
    return () => {
      active = false
    }
  }, [showToast])

  // Active Interface = First connected interface, otherwise fallback to first element
  const activeInterface =
    interfaces.find((intf) => intf.status === 'connected') || interfaces[0] || null

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
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => loadNetworkConfig(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Interfaces'}
        </Button>
      </div>

      {/* Grid Properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Interface Card */}
        <Card>
          <CardHeader title="Active Interface Card" icon={<Cpu size={16} />} />
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !activeInterface ? (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">
                No active adapter found
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Interface Name</span>
                  <span className="font-semibold text-[var(--text-primary)] truncate max-w-[60%]">
                    {activeInterface.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Connection Type</span>
                  <Badge variant={activeInterface.type === 'wifi' ? 'accent' : 'primary'}>
                    {activeInterface.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">IP Address</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {activeInterface.ipAddress || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Subnet Mask</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {activeInterface.subnetMask || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">MAC Address</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {activeInterface.macAddress || '—'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Gateway & DNS Configuration */}
        <Card>
          <CardHeader title="Gateway &amp; DNS Configuration" icon={<Globe size={16} />} />
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3 py-1">
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
                <Skeleton variant="text" width="100%" height="0.875rem" />
              </div>
            ) : !activeInterface ? (
              <div className="text-xs text-[var(--text-muted)] py-4 text-center">
                No active configuration loaded
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Default Gateway</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {activeInterface.gateway || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">DNS Servers</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)] text-right">
                    {activeInterface.dnsServers.join(', ') || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">DHCP Server IP</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {activeInterface.dhcpServer || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">Lease Obtained</span>
                  <span className="text-[var(--text-primary)] truncate max-w-[65%]">
                    {activeInterface.leaseObtained || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-muted)] font-medium">DHCP Mode</span>
                  <Badge variant={activeInterface.isDhcpEnabled ? 'accent' : 'default'} size="sm">
                    {activeInterface.isDhcpEnabled ? 'Dynamic IP' : 'Static IP'}
                  </Badge>
                </div>
              </>
            )}
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
            {loading ? (
              <div className="p-4">
                <SkeletonTable columns={5} rows={3} />
              </div>
            ) : interfaces.length === 0 ? (
              <div className="text-center text-xs text-[var(--text-muted)] py-6">
                No local network interfaces detected.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                    <th className="py-2.5 font-semibold">Adapter Name</th>
                    <th className="py-2.5 font-semibold">Type</th>
                    <th className="py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold">IPv4 Address</th>
                    <th className="py-2.5 font-semibold">Physical Address (MAC)</th>
                  </tr>
                </thead>
                <tbody>
                  {interfaces.map((intf, idx) => (
                    <tr
                      key={idx}
                      className={`
                        border-b border-[var(--border-color)]/50 last:border-0 text-[var(--text-primary)]
                        ${intf.status === 'connected' ? 'bg-primary-50/20 dark:bg-primary-950/10 font-semibold' : ''}
                      `.trim()}
                    >
                      <td className="py-3 font-medium max-w-[200px] truncate" title={intf.name}>
                        {intf.name}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            intf.type === 'wifi'
                              ? 'accent'
                              : intf.type === 'ethernet'
                                ? 'primary'
                                : 'default'
                          }
                          size="sm"
                        >
                          {intf.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 flex items-center gap-1.5 mt-1.5">
                        {intf.status === 'connected' ? (
                          <CheckCircle2 size={13} className="text-accent-500" />
                        ) : (
                          <XCircle size={13} className="text-[var(--text-muted)]" />
                        )}
                        <span
                          className={
                            intf.status === 'connected'
                              ? 'text-accent-500 font-bold'
                              : 'text-[var(--text-muted)]'
                          }
                        >
                          {intf.status === 'connected' ? 'Connected' : 'Disconnected'}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-medium">{intf.ipAddress || '—'}</td>
                      <td className="py-3 font-mono text-[var(--text-secondary)]">
                        {intf.macAddress}
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
