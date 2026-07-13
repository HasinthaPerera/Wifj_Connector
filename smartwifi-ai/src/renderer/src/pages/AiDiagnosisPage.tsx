import { useState } from 'react'
import { Brain, Sparkles, AlertCircle, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react'
import { Card, CardHeader, CardContent, Button, Skeleton } from '@/components/ui'

interface DiagnosticRecommendation {
  id: string
  type: 'warning' | 'critical' | 'info'
  title: string
  description: string
  action: string
}

export function AiDiagnosisPage(): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [recommendations, setRecommendations] = useState<DiagnosticRecommendation[]>([])
  const [metrics, setMetrics] = useState({ nodes: 0, risk: 'None', healthIndex: 0 })

  const runAnalysis = (): void => {
    setLoading(true)
    setHasRun(false)

    // Simulate complex AI calculation steps
    setTimeout(() => {
      setRecommendations([
        {
          id: 'rec1',
          type: 'critical',
          title: 'Co-Channel Interference Detected',
          description:
            'Channel 36 has heavy congestion from 4 neighboring networks. High packet collisions are affecting transmission rates.',
          action: 'Switch router settings to Channel 149 (DFS) or enable auto-channel allocation.'
        },
        {
          id: 'rec2',
          type: 'warning',
          title: 'Suboptimal DNS Resolution',
          description:
            'Primary gateway DNS (192.168.1.1) takes over 42ms to resolve queries. Google DNS or Cloudflare would improve response latency.',
          action: 'Update adapter settings to use Cloudflare Secure DNS (1.1.1.1 / 1.0.0.1).'
        },
        {
          id: 'rec3',
          type: 'info',
          title: 'WPA3 Encryption Active',
          description:
            'Wireless handshake utilizes WPA3-Personal. Security configuration meets enterprise level standard protection.',
          action: 'No action required.'
        }
      ])
      setMetrics({
        nodes: 14,
        risk: 'Minimal (Congestion)',
        healthIndex: 85
      })
      setLoading(false)
      setHasRun(true)
    }, 2500)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">AI Diagnosis Assistant</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Diagnose network drops and latency spikes using machine intelligence tips
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          leftIcon={<Sparkles size={14} />}
          onClick={runAnalysis}
          isLoading={loading}
        >
          {loading ? 'Analyzing Interface...' : 'Run AI Analysis'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader title="AI Troubleshooting Recommendations" icon={<Brain size={16} />} />
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {/* skeleton representation for AI diagnosis items */}
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-surface-50/50 dark:bg-surface-800/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton variant="circle" width="1.25rem" height="1.25rem" />
                      <Skeleton variant="text" width="40%" height="0.875rem" />
                    </div>
                    <Skeleton variant="text" width="90%" height="0.75rem" />
                    <Skeleton variant="text" width="70%" height="0.75rem" />
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-surface-50/50 dark:bg-surface-800/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton variant="circle" width="1.25rem" height="1.25rem" />
                      <Skeleton variant="text" width="35%" height="0.875rem" />
                    </div>
                    <Skeleton variant="text" width="85%" height="0.75rem" />
                  </div>
                </div>
              ) : !hasRun ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-800 text-xs text-[var(--text-muted)]">
                  <AlertCircle size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1">
                      Waiting for diagnostic request
                    </p>
                    <p>
                      Click &quot;Run AI Analysis&quot; above to evaluate network properties and
                      discover recommendations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`
                        p-4 rounded-xl border flex gap-3 text-xs
                        ${
                          rec.type === 'critical'
                            ? 'bg-danger-50/30 border-danger-200/50 dark:bg-danger-950/10 dark:border-danger-900/20'
                            : rec.type === 'warning'
                              ? 'bg-warning-50/30 border-warning-200/50 dark:bg-warning-950/10 dark:border-warning-900/20'
                              : 'bg-accent-50/30 border-accent-200/50 dark:bg-accent-950/10 dark:border-accent-900/20'
                        }
                      `.trim()}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {rec.type === 'critical' ? (
                          <ShieldAlert size={16} className="text-danger-500" />
                        ) : rec.type === 'warning' ? (
                          <AlertCircle size={16} className="text-warning-500" />
                        ) : (
                          <CheckCircle2 size={16} className="text-accent-500" />
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h4 className="font-bold text-[var(--text-primary)]">{rec.title}</h4>
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                          {rec.description}
                        </p>
                        <div className="pt-1.5 border-t border-[var(--border-color)]/30 mt-2">
                          <span className="font-semibold text-[var(--text-muted)]">
                            Recommendation:{' '}
                          </span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {rec.action}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Environment Summary" icon={<Sparkles size={16} />} />
            <CardContent className="space-y-3 text-xs">
              {loading ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton variant="text" width="40%" height="0.75rem" />
                    <Skeleton variant="text" width="15%" height="0.75rem" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton variant="text" width="40%" height="0.75rem" />
                    <Skeleton variant="text" width="15%" height="0.75rem" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton variant="text" width="40%" height="0.75rem" />
                    <Skeleton variant="text" width="15%" height="0.75rem" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Local Nodes</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {hasRun ? metrics.nodes : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Security Risks</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {hasRun ? metrics.risk : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Health Index</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {hasRun ? `${metrics.healthIndex} / 100` : '—'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Engine Status Card */}
          <Card>
            <CardHeader title="Diagnosis Engine" icon={<Cpu size={16} />} />
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Engine Status</span>
                <span
                  className={`inline-flex items-center gap-1 font-bold ${loading ? 'text-warning-500' : 'text-accent-500'}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-warning-500 animate-pulse' : 'bg-accent-500'}`}
                  />
                  {loading ? 'Analyzing' : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Model Version</span>
                <span className="text-[var(--text-primary)] font-mono">1.4.2-local</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
