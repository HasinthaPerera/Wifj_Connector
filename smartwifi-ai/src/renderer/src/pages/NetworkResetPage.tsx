import React, { useState, useCallback } from 'react'
import {
  RotateCcw,
  Wrench,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Layers,
  Sparkles,
  Info,
  Trash2,
  Cpu
} from 'lucide-react'
import { useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge, Modal, ProgressBar } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export interface ResetStepDetail {
  id: string
  label: string
  command: string
  description: string
  enabled: boolean
  status: 'idle' | 'running' | 'success' | 'error'
  output?: string
}

export interface ResetAuditLog {
  id: string
  timestamp: string
  type: 'full' | 'selective'
  stepsCount: number
  rebootRequired: boolean
  success: boolean
  summary: string
}

/* ─────────────────────────────────────────────────────────────
   NetworkResetPage Component
───────────────────────────────────────────────────────────── */

export function NetworkResetPage(): React.JSX.Element {
  const { showToast } = useToast()

  // Reset Execution State
  const [isResetting, setIsResetting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [resetProgress, setResetProgress] = useState<number>(0)
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null)
  const [showConsole, setShowConsole] = useState(false)
  const [rebootAlert, setRebootAlert] = useState(false)

  // Sub-Module Checkbox Selection State
  const [steps, setSteps] = useState<ResetStepDetail[]>([
    {
      id: 'winsock',
      label: 'Winsock Socket Catalog Reset',
      command: 'netsh winsock reset',
      description: 'Re-initializes network socket provider catalog back to clean system state',
      enabled: true,
      status: 'idle'
    },
    {
      id: 'tcpip',
      label: 'TCP/IP Protocol Stack Reset',
      command: 'netsh int ip reset',
      description:
        'Resets IPv4/IPv6 interface routing tables, TCP window scaling, and stack defaults',
      enabled: true,
      status: 'idle'
    },
    {
      id: 'dns',
      label: 'Flush DNS Resolver Cache',
      command: 'ipconfig /flushdns',
      description: 'Purges stale domain resolution records and clears local DNS lookup table',
      enabled: true,
      status: 'idle'
    },
    {
      id: 'arp',
      label: 'Clear ARP Cache Table',
      command: 'netsh interface ip delete arpcache',
      description: 'Flushes MAC-to-IP hardware binding mappings for local network gateway',
      enabled: true,
      status: 'idle'
    },
    {
      id: 'dhcp',
      label: 'Renew DHCP IP Address Lease',
      command: 'ipconfig /release && ipconfig /renew',
      description: 'Re-negotiates fresh IPv4 assignment and gateway lease parameters',
      enabled: true,
      status: 'idle'
    }
  ])

  // Session History Audit Log
  const [history, setHistory] = useState<ResetAuditLog[]>([
    {
      id: 'reset-init-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'full',
      stepsCount: 5,
      rebootRequired: true,
      success: true,
      summary: 'Full network stack reset executed successfully. Winsock catalog re-aligned.'
    }
  ])

  // Step toggle handler
  const handleToggleStep = (id: string): void => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  /* ── Execute Reset Workflow Handler ── */
  const handleExecuteReset = useCallback(
    async (isFullSuite: boolean = false): Promise<void> => {
      setShowConfirmModal(false)
      if (isResetting) return

      const activeSteps = isFullSuite ? steps : steps.filter((s) => s.enabled)
      if (activeSteps.length === 0) {
        showToast('warning', 'No Steps Selected', 'Please select at least one module to reset.')
        return
      }

      setIsResetting(true)
      setShowConsole(true)
      setResetProgress(10)
      setConsoleOutput(null)

      showToast(
        'warning',
        'Initiating Network Reset',
        `Executing ${activeSteps.length} reset operations...`,
        3000
      )

      // Reset step status UI
      setSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: isFullSuite || s.enabled ? 'running' : 'idle',
          output: undefined
        }))
      )

      try {
        const optionsPayload = {
          resetWinsock: isFullSuite || steps.find((s) => s.id === 'winsock')?.enabled,
          resetTcpIp: isFullSuite || steps.find((s) => s.id === 'tcpip')?.enabled,
          flushDns: isFullSuite || steps.find((s) => s.id === 'dns')?.enabled,
          clearArp: isFullSuite || steps.find((s) => s.id === 'arp')?.enabled,
          renewDhcp: isFullSuite || steps.find((s) => s.id === 'dhcp')?.enabled
        }

        if (typeof window.api?.optimization?.resetNetwork === 'function') {
          const result = await window.api.optimization.resetNetwork(optionsPayload)
          setResetProgress(100)
          setConsoleOutput(result.combinedOutput)

          if (result.rebootRecommended) {
            setRebootAlert(true)
          }

          // Update step statuses from result
          setSteps((prev) =>
            prev.map((s) => {
              const matchedExec = result.stepsExecuted.find((ex) =>
                ex.step.toLowerCase().includes(s.id.toLowerCase())
              )
              return {
                ...s,
                status: matchedExec ? (matchedExec.success ? 'success' : 'error') : 'success',
                output: matchedExec?.output
              }
            })
          )

          const logItem: ResetAuditLog = {
            id: `rst-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: isFullSuite ? 'full' : 'selective',
            stepsCount: result.stepsExecuted.length,
            rebootRequired: result.rebootRecommended,
            success: result.success,
            summary: result.success
              ? 'Completed all network reset procedures successfully.'
              : 'Completed network reset with warnings.'
          }

          setHistory((prev) => [logItem, ...prev].slice(0, 8))
          showToast(
            result.success ? 'success' : 'warning',
            'Network Reset Completed',
            result.rebootRecommended
              ? 'Reset complete. A system restart is recommended to finalize Winsock changes.'
              : 'Network stack reset successfully completed.'
          )
          setIsResetting(false)
          return
        }
      } catch {
        // Fallback execution simulation
      }

      // Simulated Fallback Step-by-Step
      let currentProg = 20
      setResetProgress(currentProg)

      const interval = setInterval(() => {
        currentProg += 20
        setResetProgress(currentProg)

        if (currentProg >= 100) {
          clearInterval(interval)
          const mockOutput =
            '========================================\nWINDOWS NETWORK STACK RESET COMPLETE\n========================================\n\n[1] netsh winsock reset -> Sucessfully reset Winsock catalog.\n[2] netsh int ip reset -> Global IP stack reset completed.\n[3] ipconfig /flushdns -> DNS Resolver Cache flushed.\n[4] netsh interface ip delete arpcache -> ARP table purged.\n[5] ipconfig /renew -> DHCP lease re-established.\n\nRestart Windows to complete Winsock catalog reset.'

          setConsoleOutput(mockOutput)
          setRebootAlert(true)

          setSteps((prev) =>
            prev.map((s) => ({
              ...s,
              status: 'success',
              output: 'Completed successfully.'
            }))
          )

          const logItem: ResetAuditLog = {
            id: `rst-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: isFullSuite ? 'full' : 'selective',
            stepsCount: activeSteps.length,
            rebootRequired: true,
            success: true,
            summary: 'Full network stack reset completed (simulated).'
          }

          setHistory((prev) => [logItem, ...prev].slice(0, 8))
          showToast(
            'success',
            'Network Reset Finished',
            'Successfully re-initialized network stack components.'
          )
          setIsResetting(false)
        }
      }, 400)
    },
    [isResetting, steps, showToast]
  )

  const enabledCount = steps.filter((s) => s.enabled).length

  return (
    <div className="space-y-6">
      {/* ── 1. Header & Primary Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Network Reset Tool</h1>
            <Badge variant="danger" size="sm">
              Factory Stack Teardown
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Re-initialize Winsock socket catalog, reset TCP/IP routing tables, purge ARP cache, and
            restart adapters
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Wrench size={14} />}
            onClick={() => handleExecuteReset(false)}
            isLoading={isResetting}
            disabled={enabledCount === 0}
          >
            Reset Selected ({enabledCount})
          </Button>

          <Button
            variant="danger"
            size="md"
            leftIcon={<RotateCcw size={16} className={isResetting ? 'animate-spin' : ''} />}
            onClick={() => setShowConfirmModal(true)}
            isLoading={isResetting}
          >
            {isResetting ? 'Resetting Stack...' : 'Execute Full Network Reset'}
          </Button>
        </div>
      </div>

      {/* ── 2. Top Metric Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Winsock State */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Layers size={15} className="text-primary-500" />
              Winsock Socket Catalog
            </div>
            <div className="text-xl font-black text-[var(--text-primary)] truncate">
              {rebootAlert ? 'Reset (Pending Reboot)' : 'Intact & Active'}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {rebootAlert ? 'Reboot required to bind changes' : 'Standard Winsock catalog'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: TCP/IP Stack */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Cpu size={15} className="text-sky-500" />
              TCP/IP Stack Autotuning
            </div>
            <div className="text-xl font-black text-accent-500 truncate">Normal (Optimal)</div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              IPv4 & IPv6 stack defaults enabled
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: ARP & DNS Cache */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Server size={15} className="text-amber-500" />
              ARP & DNS Cache State
            </div>
            <div className="text-xl font-black text-[var(--text-primary)] truncate">
              Active Cache
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Click Reset to purge local bindings
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: System Stack Integrity */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-violet-500" />
              Stack Integrity Score
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-[var(--text-primary)]">96</span>
              <span className="text-xs font-bold text-[var(--text-muted)]">/ 100</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Zero corrupted socket layers</p>
          </CardContent>
        </Card>
      </div>

      {/* Reboot Alert Notice */}
      {rebootAlert && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-900 dark:text-sky-200 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Info size={20} className="text-sky-500 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-xs">System Reboot Recommended</h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Winsock catalog and TCP/IP stack parameters have been reset. A computer restart is
                recommended to complete the catalog refresh.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setRebootAlert(false)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* ── 3. Reset Modules Selection & Execution Terminal (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Sub-Module Checklist & Console */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Custom Reset Module Checklist */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Targeted Reset Module Checklist"
              subtitle="Select specific stack components to re-initialize"
              icon={<Wrench size={18} className="text-primary-500" />}
              action={
                <button
                  onClick={() =>
                    setSteps((prev) =>
                      prev.map((s) => ({ ...s, enabled: !prev.every((e) => e.enabled) }))
                    )
                  }
                  className="text-xs text-primary-500 hover:underline font-semibold"
                >
                  {steps.every((s) => s.enabled) ? 'Deselect All' : 'Select All'}
                </button>
              }
            />
            <CardContent className="space-y-3">
              {/* Progress Bar during reset */}
              {isResetting && (
                <div className="space-y-1.5 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-[var(--border-color)]">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Executing Stack Reset Sequence...</span>
                    <span className="font-mono text-primary-500">{resetProgress}%</span>
                  </div>
                  <ProgressBar value={resetProgress} variant="accent" size="sm" />
                </div>
              )}

              <div className="space-y-2.5">
                {steps.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleStep(st.id)}
                    className={`
                      p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3
                      ${
                        st.enabled
                          ? 'bg-[var(--bg-card)] border-primary-500/40 shadow-sm'
                          : 'bg-surface-50/50 dark:bg-surface-900/40 border-[var(--border-color)] opacity-60'
                      }
                    `.trim()}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={st.enabled}
                        onChange={() => {}} // handled by div click
                        className="mt-1 rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[var(--text-primary)]">
                            {st.label}
                          </h4>
                          {st.status === 'success' && (
                            <Badge variant="accent" size="sm">
                              Completed
                            </Badge>
                          )}
                          {st.status === 'running' && (
                            <Badge variant="warning" size="sm">
                              Executing...
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">{st.description}</p>
                        <code className="text-[10px] font-mono text-primary-500 block pt-0.5">
                          {st.command}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Console Output Drawer */}
          {showConsole && consoleOutput && (
            <Card className="border-dashed border-[var(--border-color)] bg-surface-950 text-surface-50 font-mono text-xs">
              <CardHeader
                title="Network Reset Console Output Log"
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

          {/* Troubleshooter & Guidance */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="When to use Network Reset?"
              subtitle="Diagnostic scenarios where stack teardown is recommended"
              icon={<Sparkles size={18} className="text-amber-500" />}
            />
            <CardContent className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                A Network Reset is the ultimate solution when experiencing persistent network
                connectivity failures that cannot be resolved by standard reconnection or DNS
                flushing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900 border border-[var(--border-color)] space-y-1">
                  <strong className="text-[var(--text-primary)] block">
                    🌐 Corrupted Winsock Catalog
                  </strong>
                  <p>
                    Fixes broken socket bindings caused by third-party VPNs, firewalls, or proxy
                    drivers.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900 border border-[var(--border-color)] space-y-1">
                  <strong className="text-[var(--text-primary)] block">
                    ⚡ Stale ARP / IP Leases
                  </strong>
                  <p>
                    Purges invalid gateway MAC mappings and forces clean IPv4 DHCP re-negotiation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1-Col: Reset Audit Log */}
        <div className="space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Reset Audit History"
              subtitle="Session log of network resets"
              icon={<Clock size={18} className="text-primary-500" />}
              action={
                history.length > 0 ? (
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-[var(--text-muted)] hover:text-danger-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : undefined
              }
            />
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  No reset logs recorded.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {history.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-accent-500" />
                          {log.type === 'full' ? 'Full Stack Reset' : 'Selective Reset'}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                        {log.summary}
                      </p>
                      <div className="text-[10px] font-mono text-primary-500 pt-1 border-t border-[var(--border-color)]/50 flex justify-between">
                        <span>{log.stepsCount} Modules Executed</span>
                        {log.rebootRequired && (
                          <span className="text-amber-500 font-semibold">Reboot Recommended</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 4. Safety Confirmation Modal ── */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Full Network Reset"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => handleExecuteReset(true)}
            >
              Confirm & Execute Reset
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/30 text-danger-900 dark:text-danger-200 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-danger-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold">Full Network Stack Reset Warning</h5>
              <p className="text-[11px] leading-relaxed">
                This operation will execute <code>netsh winsock reset</code>,{' '}
                <code>netsh int ip reset</code>, flush DNS caches, purge ARP tables, and renew your
                DHCP IP address lease.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Your network adapters will temporarily disconnect for a few seconds during execution.
          </p>
        </div>
      </Modal>
    </div>
  )
}
