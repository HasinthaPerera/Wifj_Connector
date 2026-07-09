import { type HTMLAttributes } from 'react'

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** The current numeric progress value */
  value: number
  /** The upper limit for the progress value */
  max?: number
  /** Height dimension of the progress container */
  size?: 'sm' | 'md' | 'lg'
  /** Color theme of the filled bar */
  variant?: 'primary' | 'accent' | 'warning' | 'danger' | 'gradient'
  /** Render standard percentage label text on the top right */
  showLabel?: boolean
  /** Enable smooth CSS animation on value changes */
  animated?: boolean
}

const variantClasses: Record<string, string> = {
  primary: 'bg-primary-500',
  accent: 'bg-accent-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  gradient: 'bg-gradient-to-r from-primary-500 to-accent-500'
}

const sizeClasses: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4'
}

/**
 * Standard Progress Bar indicator.
 * Supports multiple size thickness classes, state coloring schemes,
 * and ARIA attributes for accessibility.
 */
function ProgressBar({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  animated = true,
  className = '',
  ...props
}: ProgressBarProps): React.JSX.Element {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={`w-full ${className}`} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Progress</span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={`
          w-full rounded-full overflow-hidden
          bg-surface-100 dark:bg-surface-800
          ${sizeClasses[size]}
        `.trim()}
      >
        <div
          className={`
            h-full rounded-full
            ${variantClasses[variant]}
            ${animated ? 'transition-all duration-500 ease-out' : ''}
          `.trim()}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

export { ProgressBar }
export type { ProgressBarProps }
