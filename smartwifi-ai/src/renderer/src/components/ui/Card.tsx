import { type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'glass' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const variantClasses: Record<string, string> = {
  default:
    'bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card',
  outlined:
    'bg-transparent border border-[var(--border-color)]',
  glass:
    'glass shadow-card',
  gradient:
    'gradient-primary text-white border-0'
}

const paddingClasses: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7'
}

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
          ${hoverable ? 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer' : ''}
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
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

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
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
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

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

function CardContent({
  className = '',
  children,
  ...props
}: CardContentProps): React.JSX.Element {
  return (
    <div className={`mt-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardContent }
export type { CardProps, CardHeaderProps, CardContentProps }
