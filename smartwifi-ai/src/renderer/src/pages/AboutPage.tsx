import { Wifi } from 'lucide-react'
import { Card } from '@/components/ui'

export function AboutPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">About Application</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Details about SmartWiFi AI architecture and copyright specifications
        </p>
      </div>

      <Card className="flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white mb-4">
          <Wifi size={36} />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">SmartWiFi AI</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Version 1.0.0 (Production Build)
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-4 max-w-md">
          SmartWiFi AI is an intelligent networking assistant designed to help users diagnose, scan,
          and optimize wireless adapter configurations locally.
        </p>
      </Card>
    </div>
  )
}
