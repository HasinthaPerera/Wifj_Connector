import { useState, type HTMLAttributes } from 'react'

interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
}

const arrowClasses: Record<string, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-800 dark:border-t-surface-200 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-800 dark:border-b-surface-200 border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-800 dark:border-l-surface-200 border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-800 dark:border-r-surface-200 border-t-transparent border-b-transparent border-l-transparent'
}

function Tooltip({
  content,
  position = 'top',
  delay = 200,
  children,
  className = '',
  ...props
}: TooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

  const showTooltip = (): void => {
    const id = setTimeout(() => setVisible(true), delay)
    setTimeoutId(id)
  }

  const hideTooltip = (): void => {
    if (timeoutId) clearTimeout(timeoutId)
    setVisible(false)
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      {...props}
    >
      {children}
      {visible && (
        <div
          className={`
            absolute z-50 ${positionClasses[position]}
            px-2.5 py-1.5 text-xs font-medium
            bg-surface-800 text-white dark:bg-surface-200 dark:text-surface-900
            rounded-md shadow-lg whitespace-nowrap
            animate-fade-in pointer-events-none
          `.trim()}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}

export { Tooltip }
export type { TooltipProps }
