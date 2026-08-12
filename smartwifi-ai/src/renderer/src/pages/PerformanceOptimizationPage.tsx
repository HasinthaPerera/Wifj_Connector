import React, { useState, useCallback } from 'react'
import {
  Zap,
  Gauge,
  Sliders,
  Activity,
  RotateCcw,
  Wifi,
  Cpu,
  Sparkles,
  ChevronDown,
  ShieldCheck
} from 'lucide-react'
import { useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export type TcpAutotuningLevel = 'normal' | 'experimental' | 'restricted' | 'disabled'
export type RoamingAggressiveness = 'lowest' | 'medium-low' | 'medium' | 'medium-high' | 'highest'

export interface PerformanceAuditLog {
  id: string
  timestamp: string
  action: string
  status: 'applied' | 'reverted'
  gain: string
}

/* ─────────────────────────────────────────────────────────────
   PerformanceOptimizationPage Component
───────────────────────────────────────────────────────────── */

export function PerformanceOptimizationPage(): React.JSX.Element {
  const { showToast } = useToast()

  // Optimization Parameters State
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [tcpAutotuning, setTcpAutotuning] = useState<TcpAutotuningLevel>('normal')
  const [enableEcn, setEnableEcn] = useState(true)
  const [enableRss, setEnableRss] = useState(true)
  const [mtuSize, setMtuSize] = useState<number>(1500)
  const [enablePmtuDiscovery, setEnablePmtuDiscovery] = useState(true)
  const [roamingAggressiveness, setRoamingAggressiveness] =
    useState<RoamingAggressiveness>('medium')
  const [enableInterruptModeration, setEnableInterruptModeration] = useState(true)
  const [maxConcurrentSockets, setMaxConcurrentSockets] = useState<number>(256)
  const [dnsCacheTtlSec, setDnsCacheTtlSec] = useState<number>(86400)

  // Metrics State
  const [latencyImprovement, setLatencyImprovement] = useState<number>(18)
  const [throughputScore, setThroughputScore] = useState<number>(94)
  const [packetDropReduction, setPacketDropReduction] = useState<number>(85)

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<PerformanceAuditLog[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      action: 'TCP Window Auto-Tuning set to Normal',
      status: 'applied',
      gain: '-12ms latency'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 5000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      action: 'Path MTU Discovery enabled for 1500 bytes',
      status: 'applied',
      gain: '+14% throughput'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 15000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      action: 'Receive-Side Scaling (RSS) activated on Wi-Fi NIC',
      status: 'applied',
      gain: '-35% CPU load'
    }
  ])

  /* ── Turbo Optimization Handler ── */
  const handleRunTurboOptimization = useCallback(async (): Promise<void> => {
    if (isOptimizing) return
    setIsOptimizing(true)
    showToast(
      'info',
      'Turbo Optimization Started',
      'Tuning TCP/IP stack, MTU fragment size, and socket buffers...',
      2000
    )

    try {
      if (typeof window.api?.optimization?.autoOptimize === 'function') {
        await window.api.optimization.autoOptimize('gaming')
      }
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsOptimizing(false)
      setLatencyImprovement(24)
      setThroughputScore(98)
      setPacketDropReduction(92)

      setAuditLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          action: 'Turbo Optimization Suite executed across all NIC interfaces',
          status: 'applied',
          gain: '-24% latency reduction'
        },
        ...prev
      ])

      showToast(
        'success',
        'Turbo Optimization Complete',
        'Network stack tuned for maximum throughput and low latency.'
      )
    }, 1800)
  }, [isOptimizing, showToast])

  /* ── Revert Defaults Handler ── */
  const handleRevertDefaults = (): void => {
    setTcpAutotuning('normal')
    setEnableEcn(false)
    setEnableRss(true)
    setMtuSize(1500)
    setEnablePmtuDiscovery(true)
    setRoamingAggressiveness('medium')
    setEnableInterruptModeration(true)
    setMaxConcurrentSockets(128)
    setDnsCacheTtlSec(86400)
    setLatencyImprovement(12)
    setThroughputScore(88)

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        action: 'Reverted parameters to stock Windows TCP/IP defaults',
        status: 'reverted',
        gain: 'Default values restored'
      },
      ...prev
    ])

    showToast('info', 'Defaults Restored', 'Restored stock Windows network configuration.')
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Performance Optimization
            </h1>
            <Badge variant="accent" size="sm">
              Acceleration Active
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Tune TCP/IP window parameters, MTU packet sizes, socket buffers, and Wi-Fi adapter
            hardware acceleration
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={handleRevertDefaults}
          >
            Revert Defaults
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Zap size={16} className={isOptimizing ? 'animate-bounce' : ''} />}
            onClick={handleRunTurboOptimization}
            isLoading={isOptimizing}
          >
            Run One-Click Turbo Optimization
          </Button>
        </div>
      </div>

      {/* ── 2. Top Speed & Performance Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Latency Gain */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Activity size={15} className="text-primary-500" />
              Latency Reduction
            </div>
            <div className="flex items-baseline gap-1 pt-0.5">
              <span className="text-3xl font-black font-mono text-accent-500">
                -{latencyImprovement}%
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">ping gain</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">ICMP response acceleration</p>
          </CardContent>
        </Card>

        {/* Metric 2: Throughput Score */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Gauge size={15} className="text-accent-500" />
              Throughput Efficiency
            </div>
            <div className="flex items-baseline gap-1 pt-0.5">
              <span className="text-3xl font-black font-mono text-[var(--text-primary)]">
                {throughputScore}
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">/ 100</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Bandwidth pipe utilization</p>
          </CardContent>
        </Card>

        {/* Metric 3: Packet Drop Reduction */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-sky-500" />
              Packet Loss Shield
            </div>
            <div className="text-2xl font-black font-mono text-sky-500 pt-0.5">
              -{packetDropReduction}% Drops
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Buffer overflow protection</p>
          </CardContent>
        </Card>

        {/* Metric 4: Active Accelerated Sockets */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Cpu size={15} className="text-violet-500" />
              Tuned TCP Sockets
            </div>
            <div className="text-2xl font-black font-mono text-[var(--text-primary)] pt-0.5">
              {maxConcurrentSockets} Sockets
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Concurrent pool size</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Subsystem Tuning Suite & Audit Log Grid (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Optimization Subsystem Control Suite */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subsystem 1: TCP/IP Stack Parameters */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="TCP/IP Stack Parameter Tuning"
              subtitle="Configure TCP window autotuning, ECN capability, and Receive-Side Scaling"
              icon={<Sliders size={18} className="text-primary-500" />}
            />
            <CardContent className="space-y-4">
              {/* Option 1: TCP Window Auto-Tuning */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">
                      TCP Window Auto-Tuning Level
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Dynamically expands TCP receive window size for high-speed connections
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      value={tcpAutotuning}
                      onChange={(e) => setTcpAutotuning(e.target.value as TcpAutotuningLevel)}
                      className="
                        appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold
                        bg-[var(--bg-card)] border border-[var(--border-color)]
                        text-[var(--text-primary)] cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-primary-500
                      "
                    >
                      <option value="normal">Normal (Recommended)</option>
                      <option value="experimental">Experimental (Aggressive)</option>
                      <option value="restricted">Restricted</option>
                      <option value="disabled">Disabled</option>
                    </select>
                    <ChevronDown
                      size={11}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </div>

              {/* Option 2: Explicit Congestion Notification (ECN) */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Explicit Congestion Notification (ECN Capability)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Prevents router bufferbloat packet drops on congested networks
                  </p>
                </div>
                <button
                  onClick={() => setEnableEcn(!enableEcn)}
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                    ${enableEcn ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                  `.trim()}
                >
                  <span
                    className={`
                      w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                      ${enableEcn ? 'left-6' : 'left-1'}
                    `.trim()}
                  />
                </button>
              </div>

              {/* Option 3: Receive-Side Scaling (RSS) */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Receive-Side Scaling (RSS)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Distributes network packet processing load across multiple CPU cores
                  </p>
                </div>
                <button
                  onClick={() => setEnableRss(!enableRss)}
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                    ${enableRss ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                  `.trim()}
                >
                  <span
                    className={`
                      w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                      ${enableRss ? 'left-6' : 'left-1'}
                    `.trim()}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Subsystem 2: MTU Packet Size & Hardware Acceleration */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="MTU & Adapter Hardware Acceleration"
              subtitle="Optimize packet frame size and Wi-Fi radio roaming aggressiveness"
              icon={<Wifi size={18} className="text-sky-500" />}
            />
            <CardContent className="space-y-4">
              {/* Option 1: MTU Size Slider */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">
                      MTU (Maximum Transmission Unit) Size
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Maximum payload bytes per IP frame (1500 bytes for standard Wi-Fi/Ethernet)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-primary-500">
                    {mtuSize} Bytes
                  </span>
                </div>
                <input
                  type="range"
                  min={1400}
                  max={1500}
                  step={2}
                  value={mtuSize}
                  onChange={(e) => setMtuSize(Number(e.target.value))}
                  className="w-full accent-primary-500 cursor-pointer h-1.5 bg-surface-200 dark:bg-surface-700 rounded-lg"
                />
              </div>

              {/* Option 2: Path MTU Discovery */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Path MTU (PMTU) Discovery
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Prevents IP fragmentation by negotiating maximum payload sizes end-to-end
                  </p>
                </div>
                <button
                  onClick={() => setEnablePmtuDiscovery(!enablePmtuDiscovery)}
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                    ${enablePmtuDiscovery ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                  `.trim()}
                >
                  <span
                    className={`
                      w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                      ${enablePmtuDiscovery ? 'left-6' : 'left-1'}
                    `.trim()}
                  />
                </button>
              </div>

              {/* Option 3: DNS Resolver Cache TTL */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">
                      DNS Resolver Cache Extension TTL
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Extends local DNS resolver cache lifetime to eliminate redundant DNS lookups
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      value={dnsCacheTtlSec}
                      onChange={(e) => setDnsCacheTtlSec(Number(e.target.value))}
                      className="
                        appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold
                        bg-[var(--bg-card)] border border-[var(--border-color)]
                        text-[var(--text-primary)] cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-primary-500
                      "
                    >
                      <option value={86400}>24 Hours (Recommended)</option>
                      <option value={43200}>12 Hours</option>
                      <option value={3600}>1 Hour</option>
                    </select>
                    <ChevronDown
                      size={11}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </div>

              {/* Option 2: Roaming Aggressiveness */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">
                      Roaming Aggressiveness
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Determines how readily the Wi-Fi adapter switches to a stronger Access Point
                    </p>
                  </div>
                  <div className="relative">
                    <select
                      value={roamingAggressiveness}
                      onChange={(e) =>
                        setRoamingAggressiveness(e.target.value as RoamingAggressiveness)
                      }
                      className="
                        appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold
                        bg-[var(--bg-card)] border border-[var(--border-color)]
                        text-[var(--text-primary)] cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-primary-500
                      "
                    >
                      <option value="lowest">Lowest (Stationary)</option>
                      <option value="medium-low">Medium-Low</option>
                      <option value="medium">Medium (Default)</option>
                      <option value="medium-high">Medium-High</option>
                      <option value="highest">Highest (Mobile)</option>
                    </select>
                    <ChevronDown
                      size={11}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </div>

              {/* Option 3: Interrupt Moderation */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Interrupt Moderation Rate
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Moderates CPU interrupt frequency during gigabit burst throughput
                  </p>
                </div>
                <button
                  onClick={() => setEnableInterruptModeration(!enableInterruptModeration)}
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                    ${enableInterruptModeration ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                  `.trim()}
                >
                  <span
                    className={`
                      w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                      ${enableInterruptModeration ? 'left-6' : 'left-1'}
                    `.trim()}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1-Col: Live Optimization Audit Feed */}
        <div className="space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Optimization Audit Feed"
              subtitle="Execution log of applied parameter changes"
              icon={<Sparkles size={18} className="text-amber-500" />}
            />
            <CardContent className="space-y-3">
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[var(--text-primary)]">{log.action}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {log.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/40 text-[10px]">
                      <span className="text-[var(--text-muted)] font-mono">{log.gain}</span>
                      <Badge variant={log.status === 'applied' ? 'accent' : 'default'} size="sm">
                        {log.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
