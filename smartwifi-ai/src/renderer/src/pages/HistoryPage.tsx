import React, { useState, useCallback } from 'react'
import { History, Calendar, ArrowDown, ArrowUp, Activity, Trash2, ArrowDownUp, Search } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'
import { useToast } from '@/context'

interface TestResult {
  id: number
  timestamp: string
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
}

/* ─────────────────────────────────────────────────────────────
   Quality grading helpers
───────────────────────────────────────────────────────────── */

type SpeedGrade = 'excellent' | 'good' | 'fair' | 'poor'

function gradeDownload(mbps: number): SpeedGrade {
  if (mbps >= 100) return 'excellent'
  if (mbps >= 25) return 'good'
  if (mbps >= 5) return 'fair'
  return 'poor'
}

function gradeUpload(mbps: number): SpeedGrade {
  if (mbps >= 50) return 'excellent'
  if (mbps >= 10) return 'good'
  if (mbps >= 2) return 'fair'
  return 'poor'
}

function gradePing(ms: number): SpeedGrade {
  if (ms <= 20) return 'excellent'
  if (ms <= 50) return 'good'
  if (ms <= 100) return 'fair'
  return 'poor'
}

function gradeVariant(grade: SpeedGrade): 'accent' | 'primary' | 'warning' | 'danger' {
  switch (grade) {
    case 'excellent':
      return 'accent'
    case 'good':
      return 'primary'
    case 'fair':
      return 'warning'
    case 'poor':
      return 'danger'
  }
}

/* ─────────────────────────────────────────────────────────────
   Inline SVG trend sparkline
   Maps an array of values to a polyline, normalised to [min, max].
───────────────────────────────────────────────────────────── */

interface SparklineProps {
  values: number[]
  color: string
  gradientId: string
}

function Sparkline({ values, color, gradientId }: SparklineProps): React.JSX.Element {
  const W = 160
  const H = 36
  const PAD = 3

  if (values.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9 opacity-40" aria-hidden="true">
        <line
          x1={PAD}
          y1={H / 2}
          x2={W - PAD}
          y2={H / 2}
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    )
  }

  const innerW = W - PAD * 2
  const innerH = H - PAD * 2
  const step = innerW / (values.length - 1)

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((v, i) => {
      const x = PAD + i * step
      const y = PAD + (1 - (v - min) / range) * innerH
      return `${x},${y}`
    })
    .join(' ')

  const lastIdx = values.length - 1
  const lastX = PAD + lastIdx * step
  const lastY = PAD + (1 - (values[lastIdx] - min) / range) * innerH

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-9"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={`${PAD},${H - PAD} ${points} ${lastX},${H - PAD}`}
        fill={`url(#${gradientId})`}
        fillOpacity="0.15"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sort types & Filters
───────────────────────────────────────────────────────────── */

type SortField = 'timestamp' | 'downloadMbps' | 'uploadMbps' | 'pingMs'
type SortDir = 'asc' | 'desc'
type GradeFilter = 'all' | SpeedGrade

/* ── Per-result overall score ── */
const scoreResult = (r: TestResult): SpeedGrade => {
  const dlG = gradeDownload(r.downloadMbps)
  const ulG = gradeUpload(r.uploadMbps)
  const pgG = gradePing(r.pingMs)
  const grades: SpeedGrade[] = [dlG, ulG, pgG]
  const order: SpeedGrade[] = ['poor', 'fair', 'good', 'excellent']
  const minScore = Math.min(...grades.map((g) => order.indexOf(g)))
  return order[minScore]
}

/* ─────────────────────────────────────────────────────────────
   HistoryPage
───────────────────────────────────────────────────────────── */

/**
 * HistoryPage — Reads the shared `smartwifi_speed_history` localStorage key
 * written by SpeedTestPage and renders a full analytics dashboard:
 * summary stat cards with sparklines, aggregate averages, and a
 * sortable / clearable test-run log table.
 */
export function HistoryPage(): React.JSX.Element {
  const { showToast } = useToast()

  const [history, setHistory] = useState<TestResult[]>([])
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGrade, setFilterGrade] = useState<GradeFilter>('all')

  // Load from database on mount
  React.useEffect(() => {
    window.api.db
      .getSpeedTests()
      .then(setHistory)
      .catch((err) => {
        console.error('Failed to load history:', err)
        showToast('error', 'Database Error', 'Could not load speed test history.')
      })
  }, [showToast])

  /* ── Aggregate statistics ── */
  const count = history.length

  const avg = (vals: number[]): number =>
    vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0

  const max = (vals: number[]): number => (vals.length > 0 ? Math.max(...vals) : 0)

  const min = (vals: number[]): number => (vals.length > 0 ? Math.min(...vals) : 0)

  const dlValues = history.map((r) => r.downloadMbps)
  const ulValues = history.map((r) => r.uploadMbps)
  const pingValues = history.map((r) => r.pingMs)

  const avgDl = avg(dlValues)
  const avgUl = avg(ulValues)
  const avgPing = avg(pingValues)

  /* ── Sorting ── */
  const toggleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('desc')
      }
    },
    [sortField]
  )

  const filteredHistory = history.filter((item) => {
    // 1. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesText =
        item.server.toLowerCase().includes(q) ||
        item.timestamp.toLowerCase().includes(q) ||
        item.downloadMbps.toString().includes(q) ||
        item.uploadMbps.toString().includes(q)
      if (!matchesText) return false
    }

    // 2. Grade Filter
    if (filterGrade !== 'all') {
      const overall = scoreResult(item)
      if (overall !== filterGrade) return false
    }

    return true
  })

  const sorted = [...filteredHistory].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'timestamp') {
      return a.timestamp.localeCompare(b.timestamp) * dir
    }
    return (a[sortField] - b[sortField]) * dir
  })

  /* ── Clear all ── */
  const clearAll = useCallback(() => {
    window.api.db
      .clearSpeedTests()
      .then(() => {
        setHistory([])
        showToast('info', 'History Cleared', 'All speed test records have been removed.')
      })
      .catch((err) => {
        console.error('Failed to clear history:', err)
        showToast('error', 'Database Error', 'Could not clear speed test history.')
      })
  }, [showToast])

  /* ── Delete single record ── */
  const deleteRecord = useCallback((id: number) => {
    window.api.db
      .deleteSpeedTest(id)
      .then(() => {
        setHistory(prev => prev.filter(r => r.id !== id))
        showToast('success', 'Record Deleted', 'The speed test record was removed.')
      })
      .catch((err) => {
        console.error('Failed to delete record:', err)
        showToast('error', 'Database Error', 'Could not delete the record.')
      })
  }, [showToast])

  /* ── Sort indicator helper ── */
  const sortIndicator = (field: SortField): string => {
    if (field !== sortField) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Speed Test History</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Analytics and trends from all recorded bandwidth tests on this device
          </p>
        </div>
        {count > 0 && (
          <Button variant="secondary" size="sm" leftIcon={<Trash2 size={14} />} onClick={clearAll}>
            Clear All Records
          </Button>
        )}
      </div>

      {/* ── Empty state ── */}
      {count === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-4 text-center">
            <Calendar size={40} className="text-primary-400 opacity-60" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No records yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Run a speed test on the <strong>Speed Test</strong> page — results appear here
                automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Summary stat cards with sparklines ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Download summary */}
            <Card className="flex flex-col justify-between">
              <CardHeader
                title="Download Speed"
                icon={<ArrowDown className="text-primary-500" size={16} />}
              />
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-black font-mono text-primary-500">{avgDl}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-1 font-bold uppercase tracking-widest">
                      Mbps avg
                    </span>
                  </div>
                  <Badge variant={gradeVariant(gradeDownload(avgDl))} size="sm">
                    {gradeDownload(avgDl)}
                  </Badge>
                </div>
                <Sparkline
                  values={dlValues.slice().reverse()}
                  color="var(--color-primary, #6366f1)"
                  gradientId="dlGrad"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>Min: {min(dlValues)} Mbps</span>
                  <span>Max: {max(dlValues)} Mbps</span>
                </div>
              </CardContent>
            </Card>

            {/* Upload summary */}
            <Card className="flex flex-col justify-between">
              <CardHeader
                title="Upload Speed"
                icon={<ArrowUp className="text-accent-500" size={16} />}
              />
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-black font-mono text-accent-500">{avgUl}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-1 font-bold uppercase tracking-widest">
                      Mbps avg
                    </span>
                  </div>
                  <Badge variant={gradeVariant(gradeUpload(avgUl))} size="sm">
                    {gradeUpload(avgUl)}
                  </Badge>
                </div>
                <Sparkline
                  values={ulValues.slice().reverse()}
                  color="var(--color-accent, #10b981)"
                  gradientId="ulGrad"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>Min: {min(ulValues)} Mbps</span>
                  <span>Max: {max(ulValues)} Mbps</span>
                </div>
              </CardContent>
            </Card>

            {/* Ping / latency summary */}
            <Card className="flex flex-col justify-between">
              <CardHeader
                title="Ping Latency"
                icon={<Activity className="text-warning-500" size={16} />}
              />
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-black font-mono text-warning-500">
                      {Math.round(avgPing)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-1 font-bold uppercase tracking-widest">
                      ms avg
                    </span>
                  </div>
                  <Badge variant={gradeVariant(gradePing(avgPing))} size="sm">
                    {gradePing(avgPing)}
                  </Badge>
                </div>
                <Sparkline
                  values={pingValues.slice().reverse()}
                  color="var(--color-warning, #f59e0b)"
                  gradientId="pingGrad"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span>Best: {min(pingValues)} ms</span>
                  <span>Worst: {max(pingValues)} ms</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Session meta card ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { label: 'Tests Recorded', value: String(count), icon: <History size={14} /> },
                {
                  label: 'Best Download',
                  value: `${max(dlValues)} Mbps`,
                  icon: <ArrowDown size={14} className="text-primary-500" />
                },
                {
                  label: 'Best Upload',
                  value: `${max(ulValues)} Mbps`,
                  icon: <ArrowUp size={14} className="text-accent-500" />
                },
                {
                  label: 'Best Ping',
                  value: `${min(pingValues)} ms`,
                  icon: <Activity size={14} className="text-warning-500" />
                }
              ] as const
            ).map((item) => (
              <Card key={item.label}>
                <CardContent className="py-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                    {item.icon}
                    {item.label}
                  </div>
                  <div className="text-xl font-black font-mono text-[var(--text-primary)]">
                    {item.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Sortable log table ── */}
          <Card>
            <CardHeader
              title="Test Run Log"
              subtitle={`${filteredHistory.length} of ${count} recorded test${count !== 1 ? 's' : ''} shown`}
              icon={<History size={16} />}
              action={
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Search history..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-[var(--surface-input)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-[var(--text-primary)] w-full sm:w-48 transition-all"
                    />
                  </div>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value as GradeFilter)}
                    className="py-1.5 pl-3 pr-8 text-xs bg-[var(--surface-input)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="all">All Grades</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              }
            />
            <CardContent>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[var(--surface-card)]">
                    <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                      {/* Timestamp */}
                      <th className="py-2.5 pr-4 font-semibold">
                        <button
                          onClick={() => toggleSort('timestamp')}
                          className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <Calendar size={11} />
                          Timestamp{sortIndicator('timestamp')}
                        </button>
                      </th>
                      {/* Download */}
                      <th className="py-2.5 pr-4 font-semibold">
                        <button
                          onClick={() => toggleSort('downloadMbps')}
                          className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <ArrowDown size={11} />
                          Download{sortIndicator('downloadMbps')}
                        </button>
                      </th>
                      {/* Upload */}
                      <th className="py-2.5 pr-4 font-semibold">
                        <button
                          onClick={() => toggleSort('uploadMbps')}
                          className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <ArrowUp size={11} />
                          Upload{sortIndicator('uploadMbps')}
                        </button>
                      </th>
                      {/* Ping */}
                      <th className="py-2.5 pr-4 font-semibold">
                        <button
                          onClick={() => toggleSort('pingMs')}
                          className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <Activity size={11} />
                          Ping / Jitter{sortIndicator('pingMs')}
                        </button>
                      </th>
                      {/* Server */}
                      <th className="py-2.5 pr-4 font-semibold">
                        <span className="flex items-center gap-1">
                          <ArrowDownUp size={11} />
                          Server
                        </span>
                      </th>
                      {/* Grade */}
                      <th className="py-2.5 font-semibold">Grade</th>
                      {/* Actions */}
                      <th className="py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 ? (
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-primary)]">
                        <td className="py-4" colSpan={7}>
                          <div className="text-center text-[var(--text-muted)] py-2">
                            No records match your search.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sorted.map((item, idx) => {
                        const overall = scoreResult(item)
                        return (
                          <tr
                            key={item.id || idx}
                            className="border-b border-[var(--border-color)]/40 last:border-0 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
                          >
                            <td className="py-2.5 pr-4 font-mono text-[var(--text-muted)]">
                              {item.timestamp}
                            </td>
                            <td className="py-2.5 pr-4 font-mono font-bold text-primary-500">
                              {item.downloadMbps} Mbps
                            </td>
                            <td className="py-2.5 pr-4 font-mono font-bold text-accent-500">
                              {item.uploadMbps} Mbps
                            </td>
                            <td className="py-2.5 pr-4 font-mono text-[var(--text-secondary)]">
                              {item.pingMs} ms / {item.jitterMs} ms
                            </td>
                            <td className="py-2.5 pr-4 text-[var(--text-secondary)] max-w-[140px] truncate">
                              {item.server}
                            </td>
                            <td className="py-2.5">
                              <Badge variant={gradeVariant(overall)} size="sm">
                                {overall}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => deleteRecord(item.id)}
                                className="text-[var(--text-muted)] hover:text-danger-500 transition-colors p-1"
                                title="Delete record"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
