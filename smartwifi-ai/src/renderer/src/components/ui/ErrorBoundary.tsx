import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronRight, ChevronDown } from 'lucide-react'
import { Card, Button } from '@/components/ui'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

/**
 * ErrorBoundary — Premium React Error Boundary class component.
 * Catches runtime crashes in child components, displays a beautiful fallback card,
 * and lets the user inspect stack traces or retry rendering.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught an unhandled runtime exception:', error, errorInfo)
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    })
  }

  private toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev }))
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-4 select-none">
          <Card className="max-w-xl w-full p-8 border-danger-200/50 dark:border-danger-900/20 shadow-xl bg-[var(--bg-card)]">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Header Icon */}
              <div className="w-14 h-14 rounded-2xl bg-danger-50 dark:bg-danger-950/20 flex items-center justify-center text-danger-500 animate-pulse-soft">
                <AlertTriangle size={30} />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Interface Execution Halted
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  An unhandled diagnostic exception occurred within this module framework.
                </p>
              </div>

              {/* Error Message summary */}
              <div className="w-full p-3 rounded-lg bg-surface-50 dark:bg-surface-800 text-left text-xs font-mono text-danger-600 dark:text-danger-400 border border-danger-100/50 dark:border-danger-950/30 break-all">
                <strong>Exception:</strong>{' '}
                {this.state.error?.toString() || 'Unknown runtime error'}
              </div>

              {/* Action CTAs */}
              <div className="flex flex-wrap gap-3 pt-2 justify-center w-full">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={this.handleReset}
                >
                  Reload Module
                </Button>
                <a href="/" className="inline-flex">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Home size={14} />}
                    onClick={this.handleReset}
                  >
                    Go to Dashboard
                  </Button>
                </a>
              </div>

              {/* Stack Trace Toggler */}
              <div className="w-full pt-4 border-t border-[var(--border-color)] text-left">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-expanded={this.state.showDetails}
                >
                  {this.state.showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Diagnostic Stack Trace
                </button>

                {this.state.showDetails && (
                  <pre className="mt-3 p-3 rounded-lg bg-surface-900 text-surface-200 dark:bg-surface-950 text-[10px] font-mono overflow-auto max-h-48 whitespace-pre-wrap select-text leading-relaxed">
                    {this.state.error?.stack}
                    {'\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
