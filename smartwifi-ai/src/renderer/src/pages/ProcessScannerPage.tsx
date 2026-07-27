import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Cpu,
  RefreshCw,
  Search,
  Globe,
  Shield,
  Monitor,
  Music,
  Code2,
  Gamepad2,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  ArrowDown,
  ArrowUp,
  X,
  Wifi
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge, StatusPill } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types (mirror preload d.ts)
───────────────────────────────────────────────────────────── */

type ProcessCategory = 'browser' | 'system' | 'media' | 'security' | 'development' | 'game' | 'other'
type SortField = 'name' | 'pid' | 'connections' | 'bandwidth'
type SortDir = 'asc' | 'desc'

interface ProcessConn {
  localAddress: string
  localPort: number
  remoteAddress: string
  remotePort: number
  state: string
  protocol: 'TCP' | 'UDP'
}

interface NetProcess {
  pid: number
  name: string
  connections: ProcessConn[]
  connectionCount: number
  estimatedKbps: number
  category: ProcessCategory
  isSimulated: boolean
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const CATEGORY_META: Record<ProcessCategory, { label: string; icon: React.ReactNode; color: string }> = {
  browser:     { label: 'Browser',     icon: <Globe size={14} />,    color: 'text-primary-500' },
  system:      { label: 'System',      icon: <Monitor size={14} />,  color: 'text-surface-400' },
  media:       { label: 'Media',       icon: <Music size={14} />,    color: 'text-accent-500' },
  security:    { label: 'Security',    icon: <Shield size={14} />,   color: 'text-warning-500' },
  development: { label: 'Dev',         icon: <Code2 size={14} />,    color: 'text-violet-500' },
  game:        { label: 'Game',        icon: <Gamepad2 size={14} />, color: 'text-rose-500' },
  other:       { label: 'Other',       icon: <HelpCircle size={14} />, color: 'text-surface-400' }
}

const STATE_VARIANT: Record<string, string> = {
  ESTABLISHED: 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-950 border-accent-200 dark:border-accent-800',
  LISTEN:      'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800',
  TIME_WAIT:   'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800',
  CLOSE_WAIT:  'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800',
  FIN_WAIT:    'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800'
}

function stateClass(state: string): string {
  return STATE_VARIANT[state] ?? 'text-surface-500 bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700'
}

/* ─────────────────────────────────────────────────────────────
   Formatters
───────────────────────────────────────────────────────────── */

function fmtKbps(kbps: number): string {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} Mbps`
  return `${kbps} KB/s`
}

function bwVariant(kbps: number): 'accent' | 'primary' | 'warning' | 'danger' | 'default' {
  if (kbps === 0)     return 'default'
  if (kbps >= 1024)  return 'accent'
  if (kbps >= 256)   return 'primary'
  if (kbps >= 64)    return 'warning'
  return 'default'
}

/* ─────────────────────────────────────────────────────────────
   Connection detail sub-table
───────────────────────────────────────────────────────────── */

function ConnectionTable({ conns }: { conns: ProcessConn[] }): React.JSX.Element {
  if (conns.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] italic py-2">No connections recorded.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-color)]">
            <th className="pb-1.5 pr-3 font-semibold">Protocol</th>
            <th className="pb-1.5 pr-3 font-semibold">Local</th>
            <th className="pb-1.5 pr-3 font-semibold">Remote</th>
            <th className="pb-1.5 font-semibold">State</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {conns.map((c, i) => (
            <tr key={i} className="hover:bg-[var(--bg-input)] transition-colors">
              <td className="py-1.5 pr-3 text-primary-400 font-bold">{c.protocol}</td>
              <td className="py-1.5 pr-3 text-[var(--text-secondary)]">
                {c.localAddress}:{c.localPort}
              </td>
              <td className="py-1.5 pr-3 text-[var(--text-secondary)]">
                {c.remoteAddress === '0.0.0.0' || c.remoteAddress === '::'
                  ? <span className="text-[var(--text-muted)]">—</span>
                  : `${c.remoteAddress}:${c.remotePort}`}
              </td>
              <td className="py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${stateClass(c.state)}`}>
                  {c.state}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Process row
───────────────────────────────────────────────────────────── */

function ProcessRow({ proc }: { proc: NetProcess }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const meta = CATEGORY_META[proc.category]
  const bwVar = bwVariant(proc.estimatedKbps)
  const established = proc.connections.filter((c) => c.state === 'ESTABLISHED').length

  return (
    <>
      <tr
        className="hover:bg-[var(--bg-input)] transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Category icon */}
        <td className="py-3 pl-4 pr-2">
          <span className={meta.color}>{meta.icon}</span>
        </td>

        {/* Process name */}
        <td className="py-3 pr-4">
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-[var(--text-primary)]">{proc.name}</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">PID {proc.pid}</span>
          </div>
        </td>

        {/* Category badge */}
        <td className="py-3 pr-4 hidden md:table-cell">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${meta.color}`}>
            {meta.label}
          </span>
        </td>

        {/* Connections */}
        <td className="py-3 pr-4">
          <div className="flex flex-col">
            <span className="font-bold tabular-nums text-sm text-[var(--text-primary)]">
              {proc.connectionCount}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {established} active
            </span>
          </div>
        </td>

        {/* Bandwidth */}
        <td className="py-3 pr-4 hidden sm:table-cell">
          <Badge variant={bwVar === 'default' ? undefined : bwVar} size="sm">
            {proc.estimatedKbps > 0 ? (
              <>
                <Wifi size={10} className="inline mr-0.5" />
                {fmtKbps(proc.estimatedKbps)}
              </>
            ) : '—'}
          </Badge>
        </td>

        {/* Simulated tag */}
        <td className="py-3 pr-4 hidden lg:table-cell">
          {proc.isSimulated && (
            <span className="text-[10px] text-[var(--text-muted)] italic">simulated</span>
          )}
        </td>

        {/* Expand toggle */}
        <td className="py-3 pr-4 text-right text-[var(--text-muted)]">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>

      {/* Expanded connection table */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-6 pb-4 pt-0">
            <div className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] p-3 mt-1">
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">
                Active Connections — {proc.name} (PID {proc.pid})
              </p>
              <ConnectionTable conns={proc.connections} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sort header cell
───────────────────────────────────────────────────────────── */

function SortTh({
  field,
  label,
  active,
  dir,
  onSort,
  className = ''
}: {
  field: SortField
  label: string
  active: boolean
  dir: SortDir
  onSort: (f: SortField) => void
  className?: string
}): React.JSX.Element {
  return (
    <th
      className={`py-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
        ) : (
          <span className="opacity-20"><ChevronDown size={10} /></span>
        )}
      </span>
    </th>
  )
}

/* ─────────────────────────────────────────────────────────────
   Summary stat tiles
───────────────────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  sub,
  icon,
  color = 'text-[var(--text-primary)]'
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color?: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card">
      <div className={`flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]`}>
        <span className={color}>{icon}</span>
        {label}
      </div>
      <span className={`text-2xl font-black tabular-nums leading-none ${color}`}>{value}</span>
      {sub && <span className="text-[11px] text-[var(--text-muted)]">{sub}</span>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ProcessScannerPage
───────────────────────────────────────────────────────────── */

/**
 * ProcessScannerPage — Scans all running processes that hold active TCP/IP
 * network connections. Uses the IPC bridge to invoke a PowerShell
 * Get-NetTCPConnection query on the main process. Falls back to rich
 * simulated data if the command is unavailable.
 */
export function ProcessScannerPage(): React.JSX.Element {
  const [processes, setProcesses] = useState<NetProcess[]>([])
  const [loading, setLoading] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ProcessCategory | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('connections')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  /* ── Fetch ── */
  const scan = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.scanProcesses()
      setProcesses(result as NetProcess[])
      setLastScan(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scan()
  }, [scan])

  /* ── Sort handler ── */
  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return field
      }
      setSortDir('desc')
      return field
    })
  }, [])

  /* ── Filtered + sorted list ── */
  const visible = useMemo(() => {
    let list = [...processes]

    // Text filter
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.pid).includes(q) ||
          p.connections.some(
            (c) => c.remoteAddress.includes(q) || c.localAddress.includes(q)
          )
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category === categoryFilter)
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':        cmp = a.name.localeCompare(b.name); break
        case 'pid':         cmp = a.pid - b.pid; break
        case 'connections': cmp = a.connectionCount - b.connectionCount; break
        case 'bandwidth':   cmp = a.estimatedKbps - b.estimatedKbps; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [processes, query, categoryFilter, sortField, sortDir])

  /* ── Summary stats ── */
  const totalConns    = useMemo(() => processes.reduce((s, p) => s + p.connectionCount, 0), [processes])
  const totalBwKbps   = useMemo(() => processes.reduce((s, p) => s + p.estimatedKbps, 0), [processes])
  const isSimulated   = processes.some((p) => p.isSimulated)
  const categories    = Object.keys(CATEGORY_META) as ProcessCategory[]
  const categoryCounts = useMemo(() => {
    const map: Partial<Record<ProcessCategory, number>> = {}
    for (const p of processes) map[p.category] = (map[p.category] ?? 0) + 1
    return map
  }, [processes])

  const formattedTime = lastScan?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '—'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Process Scanner</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Network-connected processes on this machine — grouped by PID with TCP connection details
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isSimulated && (
            <span className="text-[10px] text-warning-500 font-semibold italic">
              simulated data
            </span>
          )}
          <StatusPill
            state={processes.length > 0 ? 'connected' : 'disconnected'}
            label={processes.length > 0 ? `${processes.length} processes` : 'No data'}
            size="sm"
          />
          <span className="text-xs text-[var(--text-muted)]">Scanned {formattedTime}</span>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={scan}
            disabled={loading}
          >
            {loading ? 'Scanning…' : 'Rescan'}
          </Button>
        </div>
      </div>

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Processes"
          value={processes.length}
          sub="with network activity"
          icon={<Cpu size={14} />}
          color="text-primary-500"
        />
        <StatTile
          label="Connections"
          value={totalConns}
          sub="total TCP sockets"
          icon={<Globe size={14} />}
          color="text-accent-500"
        />
        <StatTile
          label="Est. Bandwidth"
          value={fmtKbps(totalBwKbps)}
          sub="across all processes"
          icon={<ArrowDown size={14} />}
          color="text-violet-500"
        />
        <StatTile
          label="Top Consumer"
          value={processes[0]?.name ?? '—'}
          sub={processes[0] ? `${processes[0].connectionCount} conns` : ''}
          icon={<ArrowUp size={14} />}
          color="text-warning-500"
        />
      </div>

      {/* ── Controls ── */}
      <Card>
        <CardHeader
          title="Network Processes"
          subtitle="Click a row to expand connection-level details"
          icon={<Cpu size={16} />}
          action={
            <span className="text-[11px] text-[var(--text-muted)]">
              {visible.length} / {processes.length} shown
            </span>
          }
        />
        <CardContent className="space-y-4">
          {/* Search + category filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                id="process-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, PID, or IP address…"
                className="w-full pl-8 pr-8 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category filter pills */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-primary-400'
                }`}
              >
                All ({processes.length})
              </button>
              {categories.map((cat) => {
                const meta = CATEGORY_META[cat]
                const count = categoryCounts[cat] ?? 0
                if (count === 0) return null
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                      categoryFilter === cat
                        ? `bg-primary-500 text-white border-primary-500`
                        : 'border-[var(--border-color)] text-[var(--text-muted)] hover:border-primary-400'
                    }`}
                  >
                    <span className={categoryFilter === cat ? 'text-white' : meta.color}>
                      {meta.icon}
                    </span>
                    {meta.label} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Process table */}
          {loading && processes.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)] gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Scanning processes…
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--text-muted)]">
              <Search size={24} className="opacity-30" />
              <p className="text-sm">No processes match your filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
              <table className="w-full">
                <thead className="bg-[var(--bg-input)] border-b border-[var(--border-color)] sticky top-0">
                  <tr>
                    <th className="py-3 pl-4 pr-2 w-8" aria-label="Category" />
                    <SortTh field="name"        label="Process"     active={sortField === 'name'}        dir={sortDir} onSort={handleSort} />
                    <SortTh field="name"        label="Category"    active={false}                       dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                    <SortTh field="connections" label="Connections" active={sortField === 'connections'} dir={sortDir} onSort={handleSort} />
                    <SortTh field="bandwidth"   label="Est. BW"     active={sortField === 'bandwidth'}   dir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                    <th className="py-3 pr-4 hidden lg:table-cell" />
                    <th className="py-3 pr-4 text-right w-8" aria-label="Expand" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {visible.map((proc) => (
                    <ProcessRow key={proc.pid} proc={proc} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Category breakdown card ── */}
      <Card>
        <CardHeader
          title="Category Breakdown"
          subtitle="Active process distribution by network role"
          icon={<Globe size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat]
              const count = categoryCounts[cat] ?? 0
              const bw = processes
                .filter((p) => p.category === cat)
                .reduce((s, p) => s + p.estimatedKbps, 0)
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'border-primary-400 ring-1 ring-primary-500/30 bg-primary-50 dark:bg-primary-950'
                      : 'border-[var(--border-color)] hover:border-primary-300'
                  } ${count === 0 ? 'opacity-30 pointer-events-none' : ''}`}
                >
                  <span className={`${meta.color} ${categoryFilter === cat ? '!text-primary-500' : ''}`}>
                    {meta.icon}
                  </span>
                  <span className={`text-xl font-black ${categoryFilter === cat ? 'text-primary-500' : 'text-[var(--text-primary)]'}`}>
                    {count}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">{meta.label}</span>
                  {bw > 0 && (
                    <span className="text-[9px] text-[var(--text-muted)] font-mono">{fmtKbps(bw)}</span>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
