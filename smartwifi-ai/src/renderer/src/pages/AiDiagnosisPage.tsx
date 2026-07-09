import { Brain, Sparkles, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function AiDiagnosisPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">AI Diagnosis Assistant</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Diagnose network drops and latency spikes using machine intelligence tips
          </p>
        </div>
        <Button variant="accent" size="sm" leftIcon={<Sparkles size={14} />}>
          Run AI Analysis
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader title="AI Troubleshooting Recommendations" icon={<Brain size={16} />} />
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Environment Summary" icon={<Sparkles size={16} />} />
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Local Nodes</span>
              <span className="font-semibold text-[var(--text-primary)]">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-muted)]">Security Risks</span>
              <span className="font-semibold text-[var(--text-primary)]">None</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
