import { FileText, Download } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'

export function ReportsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Diagnostic Reports</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Generate or export connection summaries to PDF or CSV files
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Download size={14} />}>
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Available Reports" icon={<FileText size={16} />} />
        <CardContent>
          <div className="text-center text-[var(--text-muted)] text-xs py-8">
            No diagnostic events occurred to generate report sheets.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
