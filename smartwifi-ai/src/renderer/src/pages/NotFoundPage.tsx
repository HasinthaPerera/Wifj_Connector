import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Card, Button } from '@/components/ui'

/**
 * NotFoundPage — Fallback view when a router path matches no configured route.
 * Employs premium design semantics with a subtle alert indicator and an action button to redirect home.
 */
export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 space-y-6">
      <Card className="flex flex-col items-center justify-center text-center p-10 max-w-md w-full shadow-lg">
        {/* Animated Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-danger-50 dark:bg-danger-950/30 flex items-center justify-center text-danger-500 mb-6 animate-pulse-soft">
          <AlertCircle size={36} />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm font-bold text-danger-500 mt-1">Error 404</p>

        {/* Description */}
        <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed max-w-sm">
          The requested system parameter view or tool path is invalid or is currently undergoing
          synchronization.
        </p>

        {/* Back Home CTA Button */}
        <div className="mt-8 w-full">
          <Link to="/" className="w-full block">
            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              leftIcon={<ArrowLeft size={16} />}
            >
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
