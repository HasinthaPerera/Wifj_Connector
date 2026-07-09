import { useEffect, useRef, type HTMLAttributes } from 'react'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  /** If true, the modal dialog is rendered and displayed */
  isOpen: boolean
  /** Callback function triggered when modal requests to close (ESC key, overlay click, close button) */
  onClose: () => void
  /** Main header title of the modal */
  title?: string
  /** Horizontal max-width size constraint of the dialog */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Enable closing the modal when clicking outside the dialog card */
  closeOnOverlayClick?: boolean
  /** Render the standard header top-right close cross button */
  showCloseButton?: boolean
  /** Render custom footer buttons (typically cancel/confirm button actions) */
  footer?: React.ReactNode
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
}

/**
 * Clean overlay modal dialog.
 * Provides backdrop-blur layout, ESC dismiss, focus trapping, scroll prevention,
 * entry slide-in transitions, and clean theme styling.
 */
function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  footer,
  children,
  className = '',
  ...props
}: ModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Focus trap: focus the dialog on open
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-[var(--bg-card)] border border-[var(--border-color)]
          rounded-2xl shadow-modal
          animate-slide-in-up
          focus:outline-none
          ${className}
        `.trim()}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
            {title && <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-1.5 rounded-lg
                  text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                  hover:bg-surface-100 dark:hover:bg-surface-800
                  transition-colors duration-150
                  cursor-pointer
                "
                aria-label="Close dialog"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-color)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export { Modal }
export type { ModalProps }
