/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (type: Toast['type'], title: string, message?: string, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const toastIconMap: Record<
  Toast['type'],
  React.ComponentType<{ size?: number; className?: string }>
> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const toastColorClasses: Record<Toast['type'], string> = {
  success:
    'border-accent-200 bg-accent-50/90 text-accent-800 dark:border-accent-950 dark:bg-accent-950/90 dark:text-accent-300',
  error:
    'border-danger-200 bg-danger-50/90 text-danger-800 dark:border-danger-950 dark:bg-danger-950/90 dark:text-danger-300',
  warning:
    'border-warning-200 bg-warning-50/90 text-warning-800 dark:border-warning-950 dark:bg-warning-950/90 dark:text-warning-300',
  info: 'border-primary-200 bg-primary-50/90 text-primary-800 dark:border-primary-950 dark:bg-primary-950/90 dark:text-primary-300'
}

/**
 * ToastProvider — Globally serves notifications via toast floating cards.
 * Autoplay dismiss timelines can be customized per call.
 */
export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: Toast['type'], title: string, message?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random()}`
      const newToast: Toast = { id, type, title, message, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id)
        }, duration)
      }
    },
    [dismissToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}

      {/* Floating Toasts Portal Overlay Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none"
        role="live"
        aria-live="assertive"
      >
        {toasts.map((toast) => {
          const Icon = toastIconMap[toast.type]
          return (
            <div
              key={toast.id}
              className={`
                flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto
                backdrop-blur-sm transition-all duration-300 animate-slide-in-up
                ${toastColorClasses[toast.type]}
              `.trim()}
            >
              {/* Type Indicator Icon */}
              <Icon size={18} className="mt-0.5 flex-shrink-0" />

              {/* Message Details */}
              <div className="flex-1 space-y-0.5">
                <h4 className="text-xs font-bold leading-normal">{toast.title}</h4>
                {toast.message && (
                  <p className="text-[11px] opacity-80 leading-normal">{toast.message}</p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * useToast — Convenient consumer hook to trigger alert notifications dynamically.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
