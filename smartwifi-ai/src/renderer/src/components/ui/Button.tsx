import { type ButtonHTMLAttributes, forwardRef } from 'react'

/** Style variants for the Button component */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'

/** Size constraints for the Button component */
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The theme/color layout of the button */
  variant?: ButtonVariant
  /** Control the padding and font size of the button */
  size?: ButtonSize
  /** Show a loading spinner and disable interactions */
  isLoading?: boolean
  /** Render an element (typically an icon) to the left of the button text */
  leftIcon?: React.ReactNode
  /** Render an element (typically an icon) to the right of the button text */
  rightIcon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 hover:brightness-110 active:bg-primary-800 shadow-sm hover:shadow-md focus-visible:ring-primary-500',
  secondary:
    'bg-surface-100 text-surface-700 hover:bg-surface-200 active:bg-surface-300 border border-surface-200 dark:bg-surface-800 dark:text-surface-200 dark:border-surface-700 dark:hover:bg-surface-700 focus-visible:ring-surface-400',
  ghost:
    'text-surface-600 hover:bg-surface-100 active:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-800 dark:active:bg-surface-700 focus-visible:ring-surface-400',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm hover:shadow-md focus-visible:ring-danger-500',
  accent:
    'bg-accent-600 text-white hover:bg-accent-700 hover:brightness-110 active:bg-accent-800 shadow-sm hover:shadow-md focus-visible:ring-accent-500'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-2.5 text-base gap-2.5 rounded-lg',
  'icon-sm': 'p-1.5 rounded-md',
  'icon-md': 'p-2 rounded-lg'
}

/**
 * A highly interactive, reusable Button component.
 * Supports primary/secondary/ghost/danger/accent variants, sm/md/lg/icon-sm/icon-md sizes,
 * loading spinners, icons, and tactile active:scale micro-press animation.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-150 ease-out
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-surface-900
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          cursor-pointer select-none
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading ? (
          /* Pure CSS spinner — no SVG repaint jank */
          <span
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
            aria-hidden="true"
          />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps, ButtonVariant, ButtonSize }
