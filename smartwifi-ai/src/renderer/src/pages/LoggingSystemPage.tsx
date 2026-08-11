import React, { useState, useMemo, useCallback } from 'react'
import {
  Terminal,
  Trash2,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Bug,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
export type LogSubsystem =
  'NET_IPC' | 'AI_ENGINE' | 'WIFI_ADAPTER' | 'DNS_RESOLVER' | 'OPTIMIZATION' | 'SYSTEM'

export interface LogEntry {
  id: string
  timestamp: string
  rawTime: number
  level: LogLevel
  subsystem: LogSubsystem
  message: string
  details?: string
  sourceIp?: string
}

/* ─────────────────────────────────────────────────────────────
   Initial Log Seed Catalog
───────────────────────────────────────────────────────────── */

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-101',
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    rawTime: Date.now(),
    level: 'ERROR',
    subsystem: 'NET_IPC',
    message: 'High latency threshold exceeded: 58.4 ms response time on gateway 192.168.1.1',
    details:
      'Error Trace: ICMP_ECHOREPLY_TIMEOUT at Socket.poll (net_ipc.ts:142)\nPayload: { host: "192.168.1.1", sent: 4, lost: 2, jitter: 14.2 }',
    sourceIp: '192.168.1.1'
  },
  {
    id: 'log-102',
    timestamp: new Date(Date.now() - 4000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    rawTime: Date.now() - 4000,
    level: 'WARN',
    subsystem: 'AI_ENGINE',
    message:
      'Jitter anomaly detected on 5 GHz channel 36. Rule #4 triggered QoS queue priority adjustment.',
    details: 'AI Heuristic Engine: Confidence score 92.4%. Rule ID: RULE_UDP_JITTER_REDUCE'
  },
  {
    id: 'log-103',
    timestamp: new Date(Date.now() - 12000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    rawTime: Date.now() - 12000,
    level: 'INFO',
    subsystem: 'DNS_RESOLVER',
    message: 'Executed ipconfig /flushdns. Purged 148 cached DNS entries successfully.',
    details: 'DNS Cache Flush output: Successfully flushed the DNS Resolver Cache.'
  },
  {
    id: 'log-104',
    timestamp: new Date(Date.now() - 25000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    rawTime: Date.now() - 25000,
    level: 'INFO',
    subsystem: 'WIFI_ADAPTER',
    message: 'Associated to BSSID A4:C3:F0:8B:2E:11 (SSID: HomeNetwork_5G) at 1201 Mbps (802.11ax)',
    details: 'PHY Radio Type: 802.11ax (Wi-Fi 6)\nSecurity: WPA3-Personal (CCMP)\nSignal: 88%'
  },
  {
    id: 'log-105',
    timestamp: new Date(Date.now() - 45000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    rawTime: Date.now() - 45000,
    level: 'DEBUG',
    subsystem: 'OPTIMIZATION',
    message: 'TCP autotuning level set to normal. Purged ARP gateway table entries.',
    details: 'netsh int tcp set global autotuninglevel=normal\nStatus: OK'
  },
  {
    id: 'log-106',
    timestamp: new Date(Date.now() - 90000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    rawTime: Date.now() - 90000,
    level: 'INFO',
    subsystem: 'SYSTEM',
    message: 'SQLite database connection established at %APPDATA%/smartwifi-ai/smartwifi.db',
    details: 'Database Driver: sqlite3 v5.1.7\nTables initialized: speed_tests, audit_logs'
  }
]

/* ─────────────────────────────────────────────────────────────
   LoggingSystemPage Component
───────────────────────────────────────────────────────────── */

export function LoggingSystemPage(): React.JSX.Element {
  const { showToast } = useToast()

  // State
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL')
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // Log Retention & Level State
  const [logVerbosity, setLogVerbosity] = useState<LogLevel>('INFO')
  const [maxLogSizeMb] = useState<number>(50)

  /* ── Filtered Logs Calculation ── */
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false
      if (selectedSubsystem !== 'ALL' && log.subsystem !== selectedSubsystem) return false
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        return (
          log.message.toLowerCase().includes(q) ||
          log.subsystem.toLowerCase().includes(q) ||
          log.level.toLowerCase().includes(q) ||
          (log.details && log.details.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [logs, selectedLevel, selectedSubsystem, searchQuery])

  /* ── Counts Calculation ── */
  const errorCount = useMemo(() => logs.filter((l) => l.level === 'ERROR').length, [logs])
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'WARN').length, [logs])
  const infoCount = useMemo(
    () => logs.filter((l) => l.level === 'INFO' || l.level === 'DEBUG').length,
    [logs]
  )

  /* ── Actions ── */
  const handleClearLogs = (): void => {
    setLogs([])
    showToast('info', 'Logs Cleared', 'System audit logs cleared from memory viewer.')
  }

  const handleGenerateTestLog = useCallback((): void => {
    const levels: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG']
    const subsystems: LogSubsystem[] = [
      'NET_IPC',
      'AI_ENGINE',
      'WIFI_ADAPTER',
      'DNS_RESOLVER',
      'OPTIMIZATION'
    ]
    const messages = [
      'Diagnostic ping sweep completed across local subnet 192.168.1.0/24',
      'Wi-Fi signal strength dropped below 55% (-78 dBm RSSI)',
      'DNS query to 1.1.1.1 responded in 11.2 ms',
      'Background process bandwidth spike detected on port 443',
      'IPC socket connection re-established with main process'
    ]

    const randomLevel = levels[Math.floor(Math.random() * levels.length)]
    const randomSubsystem = subsystems[Math.floor(Math.random() * subsystems.length)]
    const randomMsg = messages[Math.floor(Math.random() * messages.length)]

    const newEntry: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      rawTime: Date.now(),
      level: randomLevel,
      subsystem: randomSubsystem,
      message: randomMsg,
      details: `Generated Event Payload: timestamp=${Date.now()} level=${randomLevel}`
    }

    setLogs((prev) => [newEntry, ...prev])
    showToast('success', 'Log Entry Added', `Created ${randomLevel} log for [${randomSubsystem}].`)
  }, [showToast])

  const handleExportLogs = (format: 'json' | 'csv'): void => {
    if (logs.length === 0) {
      showToast('warning', 'No Logs to Export', 'System log viewer is currently empty.')
      return
    }

    let content = ''
    let mimeType = ''
    let fileName = `smartwifi_logs_${Date.now()}`

    if (format === 'json') {
      content = JSON.stringify(logs, null, 2)
      mimeType = 'application/json'
      fileName += '.json'
    } else {
      const headers = ['ID', 'Timestamp', 'Level', 'Subsystem', 'Message', 'Details']
      const rows = logs.map((l) => [
        l.id,
        `"${l.timestamp}"`,
        l.level,
        l.subsystem,
        `"${l.message.replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`
      ])
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      mimeType = 'text/csv'
      fileName += '.csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    showToast(
      'success',
      'Logs Exported',
      `Downloaded ${logs.length} log entries as ${format.toUpperCase()}.`
    )
  }

  const toggleExpand = (id: string): void => {
    setExpandedLogId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              System Logging & Audit Center
            </h1>
            <Badge variant="accent" size="sm">
              Live Console
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time execution log viewer for network IPC events, AI rule engine triggers, and
            system diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Bug size={14} />}
            onClick={handleGenerateTestLog}
          >
            Generate Test Log
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={() => handleExportLogs('json')}
          >
            Export JSON
          </Button>

          {logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={handleClearLogs}
              className="text-danger-500 hover:text-danger-600"
            >
              Clear Logs
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Top Metric Volume Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Volume */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Terminal size={15} className="text-primary-500" />
              Total Log Volume
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-[var(--text-primary)]">
                {logs.length}
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">entries</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Active memory buffer</p>
          </CardContent>
        </Card>

        {/* Metric 2: Error Logs */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-danger-500" />
              Error Severity Count
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-danger-500">{errorCount}</span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">errors</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {errorCount > 0 ? 'Requires attention' : 'No active errors'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Warning Logs */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-500" />
              System Warnings
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-amber-500">{warnCount}</span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">warnings</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Network jitter & threshold alerts
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Info & Debug Logs */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Info size={15} className="text-sky-500" />
              Info & Debug Events
            </div>
            <div className="text-2xl font-black font-mono text-[var(--text-primary)] pt-0.5">
              {infoCount} events
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Normal operational ticks</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Filters & Search Control Bar ── */}
      <Card className="border-[var(--border-color)] shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search log messages, IPC events, or trace details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium
                  bg-[var(--bg-card)] border border-[var(--border-color)]
                  text-[var(--text-primary)] placeholder-[var(--text-muted)]
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  transition-colors duration-150
                "
              />
            </div>

            {/* Level Selector */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex-shrink-0">
                Severity:
              </span>
              {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`
                    px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0
                    ${
                      selectedLevel === lvl
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-surface-100 dark:bg-surface-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }
                  `.trim()}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Subsystem Selector */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Subsystem:</span>
              <select
                value={selectedSubsystem}
                onChange={(e) => setSelectedSubsystem(e.target.value)}
                className="
                  px-2.5 py-1.5 rounded-lg text-xs font-semibold
                  bg-[var(--bg-card)] border border-[var(--border-color)]
                  text-[var(--text-primary)] cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                "
              >
                <option value="ALL">All Subsystems</option>
                <option value="NET_IPC">NET_IPC</option>
                <option value="AI_ENGINE">AI_ENGINE</option>
                <option value="WIFI_ADAPTER">WIFI_ADAPTER</option>
                <option value="DNS_RESOLVER">DNS_RESOLVER</option>
                <option value="OPTIMIZATION">OPTIMIZATION</option>
                <option value="SYSTEM">SYSTEM</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Main Log Console Terminal Viewer (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Log Console Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[var(--border-color)] bg-surface-950 text-surface-50 font-mono text-xs shadow-card">
            <CardHeader
              title="Live Terminal Execution Console"
              subtitle={`Showing ${filteredLogs.length} matching logs`}
              icon={<Terminal size={18} className="text-accent-400" />}
              action={
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`
                    px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5
                    ${autoScroll ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-surface-800 text-surface-400'}
                  `.trim()}
                >
                  <RefreshCw size={12} className={autoScroll ? 'animate-spin' : ''} />
                  Auto-Scroll {autoScroll ? 'ON' : 'OFF'}
                </button>
              }
            />
            <CardContent className="space-y-2 p-4 pt-0">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-surface-400 space-y-1 font-sans">
                  <CheckCircle2 size={32} className="mx-auto text-accent-500 opacity-80" />
                  <p className="font-bold text-xs">No matching log entries found</p>
                  <p className="text-[11px] text-surface-500">
                    Try adjusting your severity or subsystem filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id
                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-surface-800 bg-surface-900/80 space-y-1.5 font-mono text-[11px] transition-colors hover:border-surface-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Level Badge */}
                            <span
                              className={`
                                px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase
                                ${
                                  log.level === 'ERROR'
                                    ? 'bg-danger-500/20 text-danger-400 border border-danger-500/30'
                                    : log.level === 'WARN'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : log.level === 'INFO'
                                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                        : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                                }
                              `.trim()}
                            >
                              {log.level}
                            </span>

                            {/* Subsystem Tag */}
                            <span className="text-accent-400 font-semibold">[{log.subsystem}]</span>

                            {/* Timestamp */}
                            <span className="text-surface-400 text-[10px]">{log.timestamp}</span>
                          </div>

                          {/* Expand Trace Button */}
                          {log.details && (
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className="text-surface-400 hover:text-surface-200 transition-colors flex items-center gap-1 text-[10px]"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>Trace</span>
                            </button>
                          )}
                        </div>

                        {/* Main Log Message */}
                        <div className="text-surface-100 font-medium leading-relaxed">
                          {log.message}
                        </div>

                        {/* Expanded Details / Stack Trace */}
                        {isExpanded && log.details && (
                          <div className="pt-2 border-t border-surface-800/80">
                            <pre className="p-2.5 rounded-lg bg-surface-950 text-accent-300 text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                              {log.details}
                            </pre>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1-Col: Log Retention & Storage Settings */}
        <div className="space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Log File & Storage Policy"
              subtitle="Disk storage location and retention configuration"
              icon={<HardDrive size={18} className="text-primary-500" />}
            />
            <CardContent className="space-y-4">
              {/* File Path */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Log Directory Path
                </span>
                <div className="font-mono text-[11px] text-[var(--text-primary)] truncate pt-0.5">
                  %APPDATA%\smartwifi-ai\logs\app.log
                </div>
              </div>

              {/* Verbosity Level Selector */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Disk Logging Verbosity
                  </span>
                  <select
                    value={logVerbosity}
                    onChange={(e) => setLogVerbosity(e.target.value as LogLevel)}
                    className="
                      px-2 py-1 rounded-lg text-xs font-semibold
                      bg-[var(--bg-card)] border border-[var(--border-color)]
                      text-[var(--text-primary)] cursor-pointer
                    "
                  >
                    <option value="DEBUG">DEBUG (All logs)</option>
                    <option value="INFO">INFO (Normal)</option>
                    <option value="WARN">WARN (Warnings & Errors)</option>
                    <option value="ERROR">ERROR (Errors only)</option>
                  </select>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Only logs at or above this severity level will be written to disk.
                </p>
              </div>

              {/* Max Log Size Limit */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                  <span>Max Disk Storage Limit</span>
                  <span className="font-mono font-bold text-accent-500">{maxLogSizeMb} MB</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Automatic log rotation triggers when app.log exceeds 50 MB.
                </p>
              </div>

              {/* Summary Audit Footer */}
              <div className="pt-2 border-t border-[var(--border-color)]/50 text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Clock size={13} className="text-primary-500" />
                <span>Last log rotation: Today at 04:00 AM</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
