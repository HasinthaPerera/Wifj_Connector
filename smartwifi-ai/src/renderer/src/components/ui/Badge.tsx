import { type HTMLAttributes, forwardRef } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Color theme style of the badge */
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'danger'
  /** Height and padding of the badge */
  size?: 'sm' | 'md'
  /** Show a small circular status indicator dot to the left of label */
  dot?: boolean
}

const variantClasses: Record<string, string> = {
  default: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-300',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300'
}

const dotVariantClasses: Record<string, string> = {
  default: 'bg-surface-400',
  primary: 'bg-primary-500',
  accent: 'bg-accent-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500'
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs'
}

/**
 * Standard status badge component.
 * Ideal for tags, indicator lights, notification counters, and active filters.
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, className = '', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-full
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `.trim()}
        {...props}
      >
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotVariantClasses[variant]}`} />}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
export type { BadgeProps }
