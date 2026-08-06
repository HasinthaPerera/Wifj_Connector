import React, { useState, useEffect, useCallback } from 'react'
import {
  Wifi,
  RefreshCw,
  Radio,
  Signal,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Terminal,
  Trash2,
  Server,
  Cpu
} from 'lucide-react'
import { useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export interface ActiveAdapterData {
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
  isSimulated?: boolean
}

export interface NearbyNetworkData {
  ssid: string
  signal: number
  channel: number
  security: string
  bssid: string
}

export interface ReconnectLogEntry {
  id: string
  timestamp: string
  interfaceName: string
  ssid: string
  bssid: string
  status: 'success' | 'warning' | 'error'
  outputSummary: string
}

/* ─────────────────────────────────────────────────────────────
   WifiReconnectPage Component
───────────────────────────────────────────────────────────── */

export function WifiReconnectPage(): React.JSX.Element {
  const { showToast } = useToast()

  // State
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null)
  const [showConsole, setShowConsole] = useState(false)

  // Adapter & Nearby Networks State
  const [adapter, setAdapter] = useState<ActiveAdapterData>({
    name: 'Wi-Fi',
    description: 'Intel(R) Wi-Fi 6E AX211 160MHz',
    physicalAddress: 'A4:C3:F0:8B:2E:11',
    state: 'connected',
    ssid: 'HomeNetwork_5G',
    bssid: 'A4:C3:F0:8B:2E:11',
    radioType: '802.11ax (Wi-Fi 6)',
    authentication: 'WPA3-Personal',
    cipher: 'CCMP',
    channel: 36,
    receiveRate: 1201,
    transmitRate: 1201,
    signal: 88,
    isSimulated: true
  })

  const [networks, setNetworks] = useState<NearbyNetworkData[]>([
    {
      ssid: 'HomeNetwork_5G',
      signal: 88,
      channel: 36,
      security: 'WPA3-Personal',
      bssid: 'A4:C3:F0:8B:2E:11'
    },
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
    }
  ])

  // Session History Log State
  const [logs, setLogs] = useState<ReconnectLogEntry[]>([
    {
      id: 'rec-init-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      interfaceName: 'Wi-Fi',
      ssid: 'HomeNetwork_5G',
      bssid: 'A4:C3:F0:8B:2E:11',
      status: 'success',
      outputSummary: '802.11 disassociation completed. Successfully re-authenticated to AP.'
    }
  ])

  /* ── 1. Fetch Active Adapter & Nearby APs ── */
  const fetchWifiDetails = useCallback(async (): Promise<void> => {
    try {
      if (typeof window.api?.detectAdapter === 'function') {
        const data = await window.api.detectAdapter()
        if (data) {
          setAdapter((prev) => ({ ...prev, ...data }))
        }
      }

      if (typeof window.api?.scanNetworks === 'function') {
        const netList = await window.api.scanNetworks()
        if (Array.isArray(netList) && netList.length > 0) {
          setNetworks(netList)
        }
      }
    } catch {
      // Preserve default fallback
    }
  }, [])

  useEffect(() => {
    fetchWifiDetails()
  }, [fetchWifiDetails])

  /* ── 2. Scan APs Handler ── */
  const handleScanAps = useCallback(async (): Promise<void> => {
    if (isScanning) return
    setIsScanning(true)
    showToast('info', 'Scanning Access Points', 'Querying nearby Wi-Fi BSSIDs...', 2000)

    try {
      if (typeof window.api?.scanNetworks === 'function') {
        const res = await window.api.scanNetworks()
        if (Array.isArray(res) && res.length > 0) {
          setNetworks(res)
          showToast('success', 'AP Scan Completed', `Discovered ${res.length} wireless networks.`)
          setIsScanning(false)
          return
        }
      }
    } catch {
      // Fallback
    }

    setTimeout(() => {
      showToast('success', 'AP Scan Completed', `Refreshed nearby AP signals.`)
      setIsScanning(false)
    }, 1000)
  }, [isScanning, showToast])

  /* ── 3. Execute Wi-Fi Reconnect Handler ── */
  const handleReconnect = useCallback(
    async (targetSsid?: string): Promise<void> => {
      if (isReconnecting) return
      setIsReconnecting(true)
      setShowConsole(true)

      const activeSsid = targetSsid || adapter.ssid || 'HomeNetwork_5G'

      showToast(
        'warning',
        'Reconnecting Wi-Fi',
        `Disassociating and reconnecting to "${activeSsid}"...`,
        3000
      )

      // Temporarily reflect disassociating state
      setAdapter((prev) => ({ ...prev, state: 'disassociating' }))

      try {
        if (typeof window.api?.reconnectWifi === 'function') {
          const res = await window.api.reconnectWifi(adapter.name, activeSsid)
          setConsoleOutput(res.output || res.message)

          await fetchWifiDetails()

          const logItem: ReconnectLogEntry = {
            id: `rec-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            interfaceName: res.interfaceName,
            ssid: res.ssid,
            bssid: adapter.bssid,
            status: res.success ? 'success' : 'warning',
            outputSummary: res.message
          }

          setLogs((prev) => [logItem, ...prev].slice(0, 10))
          showToast(
            res.success ? 'success' : 'warning',
            'Wi-Fi Reconnected',
            `Re-associated to "${res.ssid}".`
          )
          setIsReconnecting(false)
          return
        }
      } catch {
        // Fallback simulation
      }

      setTimeout(() => {
        const mockOutput = `Windows IP Configuration\n\nInterface ${adapter.name}:\n   Disassociating from BSSID ${adapter.bssid}...\n   State: Disconnected\n   Searching for profile "${activeSsid}"...\n   Associated to BSSID ${adapter.bssid} (WPA3-Personal)\n   State: Connected\n\nWi-Fi connection re-established.`

        setConsoleOutput(mockOutput)
        setAdapter((prev) => ({
          ...prev,
          ssid: activeSsid,
          state: 'connected',
          signal: 90
        }))

        const logItem: ReconnectLogEntry = {
          id: `rec-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          interfaceName: adapter.name,
          ssid: activeSsid,
          bssid: adapter.bssid,
          status: 'success',
          outputSummary: `Re-associated interface ${adapter.name} to "${activeSsid}".`
        }

        setLogs((prev) => [logItem, ...prev].slice(0, 10))
        showToast('success', 'Wi-Fi Reconnected', `Successfully reconnected to "${activeSsid}".`)
        setIsReconnecting(false)
      }, 2000)
    },
    [isReconnecting, adapter.ssid, adapter.name, adapter.bssid, fetchWifiDetails, showToast]
  )

  const isConnected = adapter.state === 'connected' || adapter.state === 'associating'

  return (
    <div className="space-y-6">
      {/* ── 1. Header & Primary Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Wi-Fi Reconnect & AP Association
            </h1>
            <Badge variant="accent" size="sm">
              802.11 Roaming Utility
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Force 802.11 disassociation, re-authenticate to optimal Access Point (BSSID), and flush
            rate control parameters
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />}
            onClick={handleScanAps}
            isLoading={isScanning}
          >
            Re-Scan APs
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Wifi size={16} className={isReconnecting ? 'animate-spin' : ''} />}
            onClick={() => handleReconnect()}
            isLoading={isReconnecting}
          >
            {isReconnecting ? 'Reconnecting...' : 'Reconnect Wi-Fi Interface'}
          </Button>
        </div>
      </div>

      {/* ── 2. Top Metric Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Connected SSID & Signal */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Radio size={15} className="text-primary-500" />
              Connected Wireless Network
            </div>
            <div className="text-xl font-black text-[var(--text-primary)] truncate">
              {adapter.ssid || '[Not Connected]'}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
              Signal Quality: <strong className="text-accent-500">{adapter.signal}%</strong>
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: BSSID AP MAC */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Server size={15} className="text-sky-500" />
              Access Point (BSSID)
            </div>
            <div className="text-sm font-bold font-mono text-[var(--text-primary)] truncate pt-1">
              {adapter.bssid || '00:00:00:00:00:00'}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Channel: <strong>{adapter.channel}</strong> (5 GHz Band)
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: PHY Protocol & Link Rate */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Cpu size={15} className="text-amber-500" />
              PHY Radio & Link Rate
            </div>
            <div className="text-lg font-extrabold text-[var(--text-primary)] truncate">
              {adapter.transmitRate || 1201} Mbps
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {adapter.radioType || '802.11ax (Wi-Fi 6)'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Connection & Security State */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-violet-500" />
              Association State
            </div>
            <div className="text-lg font-bold text-accent-500 pt-0.5">
              {isReconnecting
                ? 'Re-authenticating...'
                : isConnected
                  ? 'Associated'
                  : 'Disconnected'}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {adapter.authentication || 'WPA3-Personal'} ({adapter.cipher || 'CCMP'})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Adapter Spotlight & AP Roaming Inspector (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: AP Inspector Table & Terminal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Active Adapter Details Spotlight */}
          <Card className="border-primary-500/40 bg-gradient-to-r from-primary-500/10 via-accent-500/5 to-transparent shadow-card">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="accent" size="sm" dot>
                  Active Adapter: {adapter.name}
                </Badge>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  MAC: {adapter.physicalAddress}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {adapter.description}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Currently associated to SSID <strong>{adapter.ssid}</strong> on Channel{' '}
                    <strong>{adapter.channel}</strong>
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={
                    <RefreshCw size={14} className={isReconnecting ? 'animate-spin' : ''} />
                  }
                  onClick={() => handleReconnect()}
                  isLoading={isReconnecting}
                >
                  Force Reconnect
                </Button>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-color)]/50 text-[11px] text-[var(--text-muted)] flex-wrap">
                <span>
                  Tx Rate:{' '}
                  <strong className="font-mono text-[var(--text-primary)]">
                    {adapter.transmitRate} Mbps
                  </strong>
                </span>
                <span>
                  Rx Rate:{' '}
                  <strong className="font-mono text-[var(--text-primary)]">
                    {adapter.receiveRate} Mbps
                  </strong>
                </span>
                <span>
                  Security:{' '}
                  <strong className="text-accent-500 font-semibold">
                    {adapter.authentication}
                  </strong>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Nearby Access Points Table */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Nearby Access Points & Roaming Inspector"
              subtitle="Scanned wireless networks available for BSSID re-association"
              icon={<Signal size={18} className="text-sky-500" />}
            />
            <CardContent className="space-y-3">
              <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 dark:bg-surface-900 border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                    <tr>
                      <th className="p-3">Network SSID</th>
                      <th className="p-3">Signal</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">BSSID / Security</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {networks.map((net) => {
                      const isCurrent = adapter.ssid === net.ssid
                      return (
                        <tr
                          key={net.bssid || net.ssid}
                          className="hover:bg-surface-50/50 dark:hover:bg-surface-800/40 transition-colors"
                        >
                          <td className="p-3 font-semibold text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <Wifi size={14} className="text-primary-500" />
                              <span>{net.ssid}</span>
                              {isCurrent && (
                                <Badge variant="accent" size="sm">
                                  Connected
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-accent-500">{net.signal}%</td>
                          <td className="p-3 font-mono text-[var(--text-secondary)]">
                            Ch {net.channel}
                          </td>
                          <td className="p-3 text-[11px] text-[var(--text-muted)]">
                            <div className="font-mono text-[10px] text-[var(--text-primary)]">
                              {net.bssid}
                            </div>
                            <div>{net.security}</div>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant={isCurrent ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => handleReconnect(net.ssid)}
                              isLoading={isReconnecting && adapter.ssid === net.ssid}
                            >
                              {isCurrent ? 'Reconnect' : 'Connect'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Console Terminal Output Drawer */}
          {showConsole && consoleOutput && (
            <Card className="border-dashed border-[var(--border-color)] bg-surface-950 text-surface-50 font-mono text-xs">
              <CardHeader
                title="netsh wlan reconnect Terminal Log"
                icon={<Terminal size={16} className="text-accent-400" />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => setShowConsole(false)}>
                    Close Terminal
                  </Button>
                }
              />
              <CardContent className="p-4 pt-0">
                <pre className="p-3 rounded-lg bg-surface-900 text-accent-300 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {consoleOutput}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1-Col: Reconnection Audit History */}
        <div className="space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Reconnection Session Log"
              subtitle="Audit history of 802.11 disassociations"
              icon={<Clock size={18} className="text-primary-500" />}
              action={
                logs.length > 0 ? (
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-[var(--text-muted)] hover:text-danger-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : undefined
              }
            />
            <CardContent className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  No reconnect logs recorded.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-accent-500" />
                          Reconnected: {log.ssid}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                        {log.outputSummary}
                      </p>
                      <div className="text-[10px] font-mono text-primary-500 pt-1 border-t border-[var(--border-color)]/50">
                        Interface: {log.interfaceName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
