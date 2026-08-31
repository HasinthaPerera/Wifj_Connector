import { type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variation of the card layout */
  variant?: 'default' | 'outlined' | 'glass' | 'gradient' | 'elevated'
  /** Inner padding sizing */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Enable hover scale, shadow and border-glow transitions */
  hoverable?: boolean
}

const variantClasses: Record<string, string> = {
  default: 'bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card',
  outlined: 'bg-transparent border border-[var(--border-color)]',
  glass: 'glass shadow-card',
  gradient: 'gradient-primary text-white border-0',
  elevated:
    'bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg'
}

const paddingClasses: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7'
}

/**
 * Standard container component.
 * Provides multiple theme variations (default, outlined, glassmorphism, gradient, elevated),
 * custom sizing paddings, and animated hover effects with border-glow.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', padding = 'md', hoverable = false, className = '', children, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-xl transition-all duration-200
          ${variantClasses[variant]}
          ${paddingClasses[padding]}
          ${
            hoverable
              ? 'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary-200/60 dark:hover:border-primary-700/50 cursor-pointer'
              : ''
          }
          ${className}
        `.trim()}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** The main bold title of the card header */
  title: string
  /** Subtext description under the title */
  subtitle?: string
  /** Action node rendered on the top right side (e.g. badge, button) */
  action?: React.ReactNode
  /** Left side decorative/context icon */
  icon?: React.ReactNode
}

/**
 * Clean card header component.
 * Displays title, optional description, optional icon, and optional actions.
 * Icon container uses alpha-based primary colour so it adapts to all accent themes.
 */
function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = '',
  ...props
}: CardHeaderProps): React.JSX.Element {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...props}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Top padding size. Defaults to 'md' (mt-4). Use 'none' to remove top spacing. */
  pt?: 'none' | 'sm' | 'md'
}

const contentPtClasses: Record<string, string> = {
  none: 'mt-0',
  sm: 'mt-2',
  md: 'mt-4'
}

/**
 * Standard content wrapper within a Card.
 * Sets the default spacing and alignment for children items.
 */
function CardContent({
  className = '',
  pt = 'md',
  children,
  ...props
}: CardContentProps): React.JSX.Element {
  return (
    <div className={`${contentPtClasses[pt]} ${className}`} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardContent }
export type { CardProps, CardHeaderProps, CardContentProps }
