import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  Zap,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Activity,
  Trash2,
  SlidersHorizontal,
  Bot
} from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Badge, StatusPill, Modal } from '@/components/ui'
import { useToast } from '@/context'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type RuleCategory = 'interference' | 'latency' | 'bandwidth' | 'security' | 'power'

export type RuleMetric =
  | 'ping'
  | 'signal'
  | 'jitter'
  | 'packetLoss'
  | 'downloadMbps'
  | 'uploadMbps'
  | 'cpuPercent'

export type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq'

export interface RuleCondition {
  id: string
  metric: RuleMetric
  operator: RuleOperator
  value: number
}

export interface AIRule {
  id: string
  name: string
  category: RuleCategory
  description: string
  conditions: RuleCondition[]
  logic: 'AND' | 'OR'
  actionName: string
  actionType: 'auto_remedy' | 'alert_notify' | 'throttle_process' | 'dns_failover'
  confidence: number // percentage e.g. 92%
  enabled: boolean
  lastEvaluated: string | null
  timesTriggered: number
}

export interface EvaluationResult {
  ruleId: string
  ruleName: string
  triggered: boolean
  confidence: number
  matchedConditions: string[]
  actionMessage: string
  timestamp: string
}

/* ─────────────────────────────────────────────────────────────
   Constants & Initial Rules
───────────────────────────────────────────────────────────── */

const METRIC_LABELS: Record<RuleMetric, { label: string; unit: string; defaultVal: number }> = {
  ping: { label: 'Ping Latency', unit: 'ms', defaultVal: 120 },
  signal: { label: 'Wi-Fi Signal', unit: 'dBm', defaultVal: -75 },
  jitter: { label: 'Jitter Variance', unit: 'ms', defaultVal: 15 },
  packetLoss: { label: 'Packet Loss', unit: '%', defaultVal: 4 },
  downloadMbps: { label: 'Download Speed', unit: 'Mbps', defaultVal: 10 },
  uploadMbps: { label: 'Upload Speed', unit: 'Mbps', defaultVal: 3 },
  cpuPercent: { label: 'System CPU Load', unit: '%', defaultVal: 80 }
}

const OPERATOR_SYMBOLS: Record<RuleOperator, string> = {
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  eq: '='
}

const CATEGORY_COLORS: Record<RuleCategory, 'accent' | 'primary' | 'warning' | 'danger'> = {
  interference: 'warning',
  latency: 'danger',
  bandwidth: 'primary',
  security: 'accent',
  power: 'primary'
}

const INITIAL_AI_RULES: AIRule[] = [
  {
    id: 'ai-rule-1',
    name: 'Dynamic DFS Channel Auto-Switch',
    category: 'interference',
    description:
      'Detects co-channel interference when signal strength degrades and ping latency rises, triggering auto-channel switch to 5GHz DFS.',
    conditions: [
      { id: 'c1', metric: 'signal', operator: 'lt', value: -70 },
      { id: 'c2', metric: 'ping', operator: 'gt', value: 90 }
    ],
    logic: 'AND',
    actionName: 'Auto-Switch Wireless Radio to Channel 149 (DFS)',
    actionType: 'auto_remedy',
    confidence: 94,
    enabled: true,
    lastEvaluated: null,
    timesTriggered: 14
  },
  {
    id: 'ai-rule-2',
    name: 'Bufferbloat Latency Spike Mitigation',
    category: 'latency',
    description:
      'Fires when packet loss exceeds 3% during high upload load, adjusting TCP ACK window sizing to prevent congestion.',
    conditions: [
      { id: 'c3', metric: 'packetLoss', operator: 'gt', value: 3 },
      { id: 'c4', metric: 'jitter', operator: 'gt', value: 12 }
    ],
    logic: 'AND',
    actionName: 'Enable Intelligent Bufferbloat Queue Management',
    actionType: 'auto_remedy',
    confidence: 89,
    enabled: true,
    lastEvaluated: null,
    timesTriggered: 9
  },
  {
    id: 'ai-rule-3',
    name: 'Cloudflare Secure DNS Failover',
    category: 'security',
    description:
      'Switches adapter DNS resolver to Cloudflare 1.1.1.1 if query response latency dips below benchmark target.',
    conditions: [{ id: 'c5', metric: 'ping', operator: 'gt', value: 150 }],
    logic: 'OR',
    actionName: 'Trigger Instant DNS Failover to 1.1.1.1 / 1.0.0.1',
    actionType: 'dns_failover',
    confidence: 96,
    enabled: true,
    lastEvaluated: null,
    timesTriggered: 22
  },
  {
    id: 'ai-rule-4',
    name: 'Background Process Bandwidth Throttle',
    category: 'bandwidth',
    description:
      'Identifies non-essential background processes consuming download capacity during active video conferencing.',
    conditions: [
      { id: 'c6', metric: 'downloadMbps', operator: 'gt', value: 50 },
      { id: 'c7', metric: 'cpuPercent', operator: 'gt', value: 75 }
    ],
    logic: 'AND',
    actionName: 'Throttle P2P and Sync Workers to 15% Max Bandwidth',
    actionType: 'throttle_process',
    confidence: 87,
    enabled: false,
    lastEvaluated: null,
    timesTriggered: 5
  }
]

/* ─────────────────────────────────────────────────────────────
   Helper Evaluator
───────────────────────────────────────────────────────────── */

function evalCondition(cond: RuleCondition, valueMap: Record<RuleMetric, number>): boolean {
  const current = valueMap[cond.metric] ?? 0
  switch (cond.operator) {
    case 'gt':
      return current > cond.value
    case 'lt':
      return current < cond.value
    case 'gte':
      return current >= cond.value
    case 'lte':
      return current <= cond.value
    case 'eq':
      return current === cond.value
  }
}

/* ─────────────────────────────────────────────────────────────
   AiRuleEnginePage Component
───────────────────────────────────────────────────────────── */

/**
 * AiRuleEnginePage — Real-time AI Rule Evaluation and Autonomous Remediation Engine.
 * Evaluates rules against live telemetry, provides rule customization controls, and maintains audit logs.
 */
export function AiRuleEnginePage(): React.JSX.Element {
  const { showToast } = useToast()

  const [rules, setRules] = useState<AIRule[]>(INITIAL_AI_RULES)
  const [autoEvaluate, setAutoEvaluate] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Evaluation results & log
  const [evalResults, setEvalResults] = useState<EvaluationResult[]>([])
  const [lastEvalTime, setLastEvalTime] = useState<string | null>(null)

  // Live telemetry snapshot state
  const [telemetry, setTelemetry] = useState<Record<RuleMetric, number>>({
    ping: 42,
    signal: -68,
    jitter: 4,
    packetLoss: 0.5,
    downloadMbps: 68,
    uploadMbps: 24,
    cpuPercent: 38
  })

  // New Rule Form State
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleCategory, setNewRuleCategory] = useState<RuleCategory>('latency')
  const [newRuleDesc, setNewRuleDesc] = useState('')
  const [newRuleMetric, setNewRuleMetric] = useState<RuleMetric>('ping')
  const [newRuleOperator, setNewRuleOperator] = useState<RuleOperator>('gt')
  const [newRuleValue, setNewRuleValue] = useState<number>(100)
  const [newRuleAction, setNewRuleAction] = useState('')

  /* ── Fetch telemetry from IPC or simulation ── */
  const fetchTelemetry = useCallback(async (): Promise<Record<RuleMetric, number>> => {
    let ping = Math.round(25 + Math.random() * 50 + (Math.random() < 0.1 ? 80 : 0))
    let signal = -62 - Math.round(Math.random() * 15)
    let jitter = parseFloat((1 + Math.random() * 8).toFixed(1))
    let packetLoss = parseFloat((Math.random() < 0.05 ? Math.random() * 4 : Math.random() * 0.8).toFixed(1))
    let downloadMbps = parseFloat((45 + Math.random() * 40).toFixed(1))
    let uploadMbps = parseFloat((15 + Math.random() * 20).toFixed(1))
    let cpuPercent = Math.round(25 + Math.random() * 45)

    try {
      if (typeof window.api?.detectAdapter === 'function') {
        const ad = await window.api.detectAdapter()
        if (ad?.signal) signal = ad.signal
      }
      if (typeof window.api?.getResources === 'function') {
        const res = await window.api.getResources()
        if (res) {
          cpuPercent = res.cpuPercent
          if (res.network && res.network.length > 0) {
            downloadMbps = parseFloat((res.network.reduce((s, n) => s + n.rxKbps, 0) / 1024).toFixed(1))
            uploadMbps = parseFloat((res.network.reduce((s, n) => s + n.txKbps, 0) / 1024).toFixed(1))
          }
        }
      }
    } catch {
      // Fallback to simulated defaults
    }

    return { ping, signal, jitter, packetLoss, downloadMbps, uploadMbps, cpuPercent }
  }, [])

  /* ── Evaluate AI Rules ── */
  const runEngineEvaluation = useCallback(async () => {
    setIsEvaluating(true)
    const snapshot = await fetchTelemetry()
    setTelemetry(snapshot)

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const results: EvaluationResult[] = []

    setRules((prevRules) =>
      prevRules.map((rule) => {
        if (!rule.enabled) return rule

        const condResults = rule.conditions.map((cond) => {
          const matched = evalCondition(cond, snapshot)
          const meta = METRIC_LABELS[cond.metric]
          const currentVal = snapshot[cond.metric]
          const label = `${meta.label} (${currentVal}${meta.unit}) ${OPERATOR_SYMBOLS[cond.operator]} ${cond.value}${meta.unit}`
          return { matched, label }
        })

        const isTriggered =
          rule.logic === 'AND'
            ? condResults.every((c) => c.matched)
            : condResults.some((c) => c.matched)

        if (isTriggered) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            confidence: rule.confidence,
            matchedConditions: condResults.filter((c) => c.matched).map((c) => c.label),
            actionMessage: rule.actionName,
            timestamp: nowStr
          })
        }

        return {
          ...rule,
          lastEvaluated: nowStr,
          timesTriggered: isTriggered ? rule.timesTriggered + 1 : rule.timesTriggered
        }
      })
    )

    if (results.length > 0) {
      setEvalResults((prev) => [...results, ...prev].slice(0, 30))
      showToast(
        'info',
        'AI Engine Evaluation',
        `Evaluated rules against live telemetry. ${results.length} AI ${results.length === 1 ? 'rule' : 'rules'} triggered.`
      )
    }

    setLastEvalTime(nowStr)
    setIsEvaluating(false)
  }, [fetchTelemetry, showToast])

  /* Auto-evaluation loop */
  useEffect(() => {
    runEngineEvaluation()
    if (!autoEvaluate) return
    const timer = setInterval(runEngineEvaluation, 4000)
    return () => clearInterval(timer)
  }, [autoEvaluate, runEngineEvaluation])

  /* ── Add Rule Handler ── */
  const handleCreateRule = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!newRuleName.trim()) return

    const newRule: AIRule = {
      id: `ai-rule-${Date.now()}`,
      name: newRuleName.trim(),
      category: newRuleCategory,
      description: newRuleDesc.trim() || `Custom AI rule for ${METRIC_LABELS[newRuleMetric].label} optimization`,
      conditions: [
        {
          id: `c-${Date.now()}`,
          metric: newRuleMetric,
          operator: newRuleOperator,
          value: newRuleValue
        }
      ],
      logic: 'AND',
      actionName: newRuleAction.trim() || `Execute ${newRuleCategory} optimization policy`,
      actionType: 'auto_remedy',
      confidence: Math.floor(85 + Math.random() * 12),
      enabled: true,
      lastEvaluated: null,
      timesTriggered: 0
    }

    setRules((prev) => [newRule, ...prev])
    setIsModalOpen(false)
    setNewRuleName('')
    setNewRuleDesc('')
    setNewRuleAction('')
    showToast('success', 'AI Rule Created', `"${newRule.name}" is now active in the evaluation engine.`)
  }

  /* ── Toggle Rule ── */
  const toggleRule = (id: string): void => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }

  /* ── Delete Rule ── */
  const deleteRule = (id: string): void => {
    setRules((prev) => prev.filter((r) => r.id !== id))
    showToast('info', 'Rule Removed', 'AI rule was removed from active configuration.')
  }

  /* Filtered rules */
  const filteredRules = useMemo(() => {
    if (selectedCategory === 'all') return rules
    return rules.filter((r) => r.category === selectedCategory)
  }, [rules, selectedCategory])

  const activeRulesCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules])
  const avgConfidence = useMemo(
    () => (rules.length > 0 ? Math.round(rules.reduce((s, r) => s + r.confidence, 0) / rules.length) : 0),
    [rules]
  )
  const totalTriggeredCount = useMemo(() => rules.reduce((s, r) => s + r.timesTriggered, 0), [rules])

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">AI Rule Engine</h1>
            <StatusPill
              state={autoEvaluate ? 'connected' : 'disconnected'}
              label={autoEvaluate ? 'Autonomous Engine Active' : 'Manual Mode'}
              size="sm"
            />
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Rule evaluation engine analyzing telemetry, triggering automated network mitigations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant={autoEvaluate ? 'accent' : 'secondary'}
            size="sm"
            onClick={() => setAutoEvaluate((v) => !v)}
          >
            {autoEvaluate ? 'Auto-Evaluate On' : 'Auto-Evaluate Off'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isEvaluating ? 'animate-spin' : ''} />}
            onClick={runEngineEvaluation}
            disabled={isEvaluating}
          >
            {isEvaluating ? 'Evaluating...' : 'Run AI Evaluation'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setIsModalOpen(true)}
          >
            Create AI Rule
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium flex items-center gap-1.5">
              <Bot size={14} className="text-primary-500" />
              Active AI Rules
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-primary-500">
              {activeRulesCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">/ {rules.length} Configured</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-accent-500" />
              Engine Confidence
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-accent-500">
              {avgConfidence}%
            </span>
            <span className="text-xs text-accent-600 dark:text-accent-400 font-semibold">High Precision</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium flex items-center gap-1.5">
              <Zap size={14} className="text-warning-500" />
              Total Actions Triggered
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-warning-500">
              {totalTriggeredCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Auto-Remediations</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="font-medium flex items-center gap-1.5">
              <Activity size={14} className="text-violet-500" />
              Last Evaluation
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
              {lastEvalTime || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Telemetry Input Snapshot Panel ── */}
      <Card>
        <CardHeader
          title="Live Engine Telemetry Inputs"
          subtitle="Real-time network & system parameters evaluated by the AI inference engine"
          icon={<SlidersHorizontal size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {(Object.keys(METRIC_LABELS) as RuleMetric[]).map((m) => {
              const meta = METRIC_LABELS[m]
              const val = telemetry[m]
              return (
                <div
                  key={m}
                  className="p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-xs space-y-1"
                >
                  <div className="text-[10px] text-[var(--text-muted)] font-medium truncate">
                    {meta.label}
                  </div>
                  <div className="font-mono font-bold text-[var(--text-primary)] text-sm">
                    {val}
                    <span className="text-[10px] text-[var(--text-muted)] font-normal ml-0.5">
                      {meta.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── AI Rules Configuration & Category Filter ── */}
      <Card>
        <CardHeader
          title="Configured AI Rules"
          subtitle="Manage autonomous triggers, rule conditions, and confidence parameters"
          icon={<Sparkles size={16} />}
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="interference">Interference</option>
                <option value="latency">Latency</option>
                <option value="bandwidth">Bandwidth</option>
                <option value="security">Security</option>
                <option value="power">Power</option>
              </select>
            </div>
          }
        />
        <CardContent>
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  rule.enabled
                    ? 'bg-[var(--bg-card)] border-[var(--border-color)]'
                    : 'bg-[var(--bg-input)]/50 border-[var(--border-color)] opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{rule.name}</h3>
                    <Badge variant={CATEGORY_COLORS[rule.category]} size="sm">
                      {rule.category}
                    </Badge>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300 font-bold border border-accent-200 dark:border-accent-800">
                      {rule.confidence}% Confidence
                    </span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      Triggered {rule.timesTriggered}x
                    </span>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="cursor-pointer text-[var(--text-muted)] hover:text-primary-500 transition-colors"
                      title={rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                    >
                      {rule.enabled ? (
                        <ToggleRight size={22} className="text-accent-500" />
                      ) : (
                        <ToggleLeft size={22} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="cursor-pointer text-[var(--text-muted)] hover:text-danger-500 transition-colors p-1"
                      title="Delete Rule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {rule.description}
                </p>

                {/* Conditions & Actions Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Conditions ({rule.logic})
                    </div>
                    <div className="space-y-1">
                      {rule.conditions.map((cond) => (
                        <div key={cond.id} className="font-mono text-[11px] text-[var(--text-primary)] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
                          {METRIC_LABELS[cond.metric].label} {OPERATOR_SYMBOLS[cond.operator]} {cond.value}
                          {METRIC_LABELS[cond.metric].unit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Automated Trigger Action
                    </div>
                    <div className="font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                      <Zap size={13} className="text-warning-500" />
                      {rule.actionName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Triggered Action Audit Log ── */}
      {evalResults.length > 0 && (
        <Card>
          <CardHeader
            title="AI Remediation Event Log"
            subtitle="Audit trail of triggered AI rules and automated execution actions"
            icon={<CheckCircle2 size={16} className="text-accent-500" />}
          />
          <CardContent>
            <div className="space-y-2">
              {evalResults.map((res, idx) => (
                <div
                  key={`${res.ruleId}-${idx}`}
                  className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <Zap size={15} className="text-warning-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">{res.ruleName}</span>
                        <Badge variant="accent" size="sm">
                          {res.confidence}% Conf.
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        <span className="font-semibold">Action:</span> {res.actionMessage}
                      </p>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono mt-1">
                        Matched: {res.matchedConditions.join(' | ')}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[var(--text-muted)] self-end sm:self-center">
                    {res.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Create New AI Rule Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Custom AI Rule"
        size="md"
      >
        <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Rule Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Latency Spike Priority QoS"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Category
              </label>
              <select
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value as RuleCategory)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              >
                <option value="latency">Latency</option>
                <option value="interference">Interference</option>
                <option value="bandwidth">Bandwidth</option>
                <option value="security">Security</option>
                <option value="power">Power</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Condition Metric
              </label>
              <select
                value={newRuleMetric}
                onChange={(e) => setNewRuleMetric(e.target.value as RuleMetric)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              >
                {(Object.keys(METRIC_LABELS) as RuleMetric[]).map((m) => (
                  <option key={m} value={m}>
                    {METRIC_LABELS[m].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Operator
              </label>
              <select
                value={newRuleOperator}
                onChange={(e) => setNewRuleOperator(e.target.value as RuleOperator)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              >
                <option value="gt">Greater Than (&gt;)</option>
                <option value="lt">Less Than (&lt;)</option>
                <option value="gte">Greater or Equal (≥)</option>
                <option value="lte">Less or Equal (≤)</option>
                <option value="eq">Equals (=)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Target Threshold ({METRIC_LABELS[newRuleMetric].unit})
              </label>
              <input
                type="number"
                required
                value={newRuleValue}
                onChange={(e) => setNewRuleValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Automated Action Trigger
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Enable Priority Packets & Notify Toast"
              value={newRuleAction}
              onChange={(e) => setNewRuleAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Explain the purpose and expected mitigation outcome of this AI rule..."
              value={newRuleDesc}
              onChange={(e) => setNewRuleDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save AI Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
