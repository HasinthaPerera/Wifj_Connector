import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Menu,
  Sun,
  Moon,
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  ChevronRight,
  Home,
  X,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'

import { useTheme } from '@/context/ThemeContext'
import { ThemeManagerDropdown } from '@/components/ui/ThemeManager'
import type { AppNotification } from '@/types'

/* ─────────────────────────────────────────────────────────────
   Prop types
───────────────────────────────────────────────────────────── */

interface BreadcrumbSegment {
  label: string
  /** When omitted the segment is rendered as plain text (current page) */
  path?: string
}

export interface TopBarProps {
  /** Current page title shown prominently on the left */
  pageTitle: string
  /** Optional breadcrumb trail. If empty, only the title is shown. */
  breadcrumbs?: BreadcrumbSegment[]
  /** Callback to toggle the sidebar collapsed state */
  onToggleSidebar?: () => void
  /** Whether the sidebar is currently in the collapsed state */
  sidebarCollapsed?: boolean
  /** Simulated connection state for the status indicator */
  isConnected?: boolean
  /** Signal quality 0–100; shown as coloured bars */
  signalStrength?: number
}

/* ─────────────────────────────────────────────────────────────
   Static demo notification seed (replaced by real IPC data later)
───────────────────────────────────────────────────────────── */

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'warning',
    title: 'Signal Degradation',
    message: 'Wi-Fi signal dropped below 50% in the last 5 minutes.',
    timestamp: Date.now() - 1000 * 60 * 3,
    read: false
  },
  {
    id: 'n2',
    type: 'info',
    title: 'Speed Test Available',
    message: 'A new server in your region is available for speed testing.',
    timestamp: Date.now() - 1000 * 60 * 12,
    read: false
  },
  {
    id: 'n3',
    type: 'success',
    title: 'Optimization Applied',
    message: 'DNS configuration optimized. Latency improved by 18 ms.',
    timestamp: Date.now() - 1000 * 60 * 60,
    read: true
  },
  {
    id: 'n4',
    type: 'error',
    title: 'Packet Loss Detected',
    message: '12% packet loss detected on gateway 192.168.1.1.',
    timestamp: Date.now() - 1000 * 60 * 90,
    read: true
  }
]

/* ─────────────────────────────────────────────────────────────
   Signal bars sub-component
───────────────────────────────────────────────────────────── */

interface SignalBarsProps {
  strength: number // 0-100
  isConnected: boolean
}

function SignalBars({ strength, isConnected }: SignalBarsProps): React.JSX.Element {
  const bars = 4
  const activeBars = isConnected ? Math.ceil((strength / 100) * bars) : 0

  const getColor = (): string => {
    if (!isConnected) return 'text-[var(--text-muted)]'
    if (strength >= 75) return 'text-accent-500'
    if (strength >= 50) return 'text-warning-500'
    if (strength >= 25) return 'text-warning-600'
    return 'text-danger-500'
  }

  return (
    <span
      className={`inline-flex items-end gap-[2px] h-4 ${getColor()}`}
      aria-label={isConnected ? `Signal: ${strength}%` : 'Disconnected'}
      role="img"
    >
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={`
            inline-block w-[3px] rounded-sm transition-all duration-300
            ${i < activeBars ? 'opacity-100' : 'opacity-25'}
          `.trim()}
          style={{ height: `${4 + i * 3}px` }}
        />
      ))}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   Notification type icon
───────────────────────────────────────────────────────────── */

function NotificationIcon({ type }: { type: AppNotification['type'] }): React.JSX.Element {
  switch (type) {
    case 'success':
      return <CheckCircle2 size={14} className="text-accent-500 flex-shrink-0" />
    case 'warning':
      return <AlertTriangle size={14} className="text-warning-500 flex-shrink-0" />
    case 'error':
      return <AlertCircle size={14} className="text-danger-500 flex-shrink-0" />
    default:
      return <Info size={14} className="text-primary-500 flex-shrink-0" />
  }
}

/* ─────────────────────────────────────────────────────────────
   Relative time helper (no external dep)
───────────────────────────────────────────────────────────── */

function relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ─────────────────────────────────────────────────────────────
   Notification panel
───────────────────────────────────────────────────────────── */

interface NotificationPanelProps {
  notifications: AppNotification[]
  onMarkAllRead: () => void
  onDismiss: (id: string) => void
  onClose: () => void
}

function NotificationPanel({
  notifications,
  onMarkAllRead,
  onDismiss,
  onClose
}: NotificationPanelProps): React.JSX.Element {
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div
      className="
        absolute top-full right-0 mt-2 w-[340px] z-50
        bg-[var(--bg-card)] border border-[var(--border-color)]
        rounded-xl shadow-[var(--shadow-modal)]
        animate-slide-in-up overflow-hidden
      "
      role="dialog"
      aria-label="Notifications"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-[var(--text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-danger-500 text-white">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              onClick={onMarkAllRead}
              className="
                flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium
                text-[var(--text-secondary)] hover:text-primary-500
                hover:bg-primary-50 dark:hover:bg-primary-950/50
                transition-colors duration-150 cursor-pointer
              "
              title="Mark all as read"
            >
              <CheckCheck size={12} />
              All read
            </button>
          )}
          <button
            onClick={onClose}
            className="
              p-1 rounded-md text-[var(--text-muted)]
              hover:text-[var(--text-primary)] hover:bg-surface-100 dark:hover:bg-surface-800
              transition-colors duration-150 cursor-pointer
            "
            aria-label="Close notifications"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-[380px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <BellOff size={28} className="text-[var(--text-muted)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">All caught up</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                No new notifications right now.
              </p>
            </div>
          </div>
        ) : (
          <ul className="py-1" role="list">
            {notifications.map((notif) => (
              <li key={notif.id} className="group relative">
                <div
                  className={`
                    flex gap-3 px-4 py-3
                    transition-colors duration-150
                    ${notif.read ? '' : 'bg-primary-50/60 dark:bg-primary-950/30'}
                    hover:bg-surface-50 dark:hover:bg-surface-800/60
                  `.trim()}
                >
                  {/* Unread indicator dot */}
                  <div className="flex-shrink-0 pt-[3px]">
                    {!notif.read && (
                      <span className="block w-1.5 h-1.5 rounded-full bg-primary-500 mt-0.5" />
                    )}
                    {notif.read && <span className="block w-1.5 h-1.5" />}
                  </div>

                  <NotificationIcon type={notif.type} />

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        notif.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {relativeTime(notif.timestamp)}
                    </p>
                  </div>

                  <button
                    onClick={() => onDismiss(notif.id)}
                    className="
                      opacity-0 group-hover:opacity-100
                      flex-shrink-0 self-start mt-0.5 p-1 rounded-md
                      text-[var(--text-muted)] hover:text-danger-500
                      hover:bg-danger-50 dark:hover:bg-danger-950/50
                      transition-all duration-150 cursor-pointer
                    "
                    aria-label={`Dismiss notification: ${notif.title}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={() => notifications.forEach((n) => onDismiss(n.id))}
            className="
              text-[10px] font-medium text-[var(--text-muted)]
              hover:text-danger-500 transition-colors duration-150 cursor-pointer
            "
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main TopBar component
───────────────────────────────────────────────────────────── */

/**
 * TopBar — Premium top navigation bar for SmartWiFi AI.
 *
 * Features:
 * - Sidebar toggle (hamburger)
 * - Page title with optional breadcrumb trail
 * - Live connection status badge with animated indicator
 * - Signal quality bars
 * - Notification bell with unread count badge and dropdown panel
 * - Light / dark theme toggle
 *
 * Designed to sit flush at the top of the main content area within RootLayout.
 */
function TopBar({
  pageTitle,
  breadcrumbs = [],
  onToggleSidebar,
  sidebarCollapsed = false,
  isConnected = true,
  signalStrength = 80
}: TopBarProps): React.JSX.Element {
  const { resolvedTheme } = useTheme()

  const [notifOpen, setNotifOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>(DEMO_NOTIFICATIONS)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  /* Close panel on outside click */
  useEffect(() => {
    if (!notifOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  /* Close panel on Escape key */
  useEffect(() => {
    if (!notifOpen) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [notifOpen])

  const handleMarkAllRead = useCallback((): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const handleDismiss = useCallback((id: string): void => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1200)
  }, [])

  /* Connection status colour tokens */
  const statusDotClass = isConnected ? 'bg-accent-500 animate-pulse-soft' : 'bg-danger-500'
  const statusLabel = isConnected ? 'Connected' : 'Offline'
  const statusTextClass = isConnected ? 'text-accent-600 dark:text-accent-400' : 'text-danger-500'

  return (
    <header
      className="
        flex items-center justify-between
        h-16 px-5
        border-b border-[var(--border-color)]
        bg-[var(--bg-sidebar)]
        flex-shrink-0 relative
      "
      role="banner"
    >
      {/* ── Left section ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Sidebar toggle */}
        {onToggleSidebar && (
          <button
            id="topbar-sidebar-toggle"
            onClick={onToggleSidebar}
            className="
              flex-shrink-0 p-2 rounded-lg
              text-[var(--text-secondary)]
              hover:bg-surface-100 dark:hover:bg-surface-800
              active:scale-95
              transition-all duration-150 cursor-pointer
            "
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={18} />
          </button>
        )}

        {/* Page title + breadcrumbs */}
        <div className="min-w-0">
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 mb-0.5" aria-label="Breadcrumb">
              <Home size={10} className="text-[var(--text-muted)] flex-shrink-0" />
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  <ChevronRight size={10} className="text-[var(--text-muted)]" />
                  <span
                    className={`text-[10px] font-medium truncate ${
                      idx === breadcrumbs.length - 1
                        ? 'text-[var(--text-muted)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer'
                    }`}
                  >
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          )}

          <h2
            className="
              text-base font-semibold text-[var(--text-primary)]
              leading-tight truncate
            "
          >
            {pageTitle}
          </h2>
        </div>
      </div>

      {/* ── Right section ─────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Signal + Connection status */}
        <div
          className="
            hidden sm:flex items-center gap-2
            px-3 py-1.5 rounded-lg
            bg-surface-50 dark:bg-surface-800/60
            border border-[var(--border-color)]
          "
          title={`${statusLabel} · Signal ${signalStrength}%`}
        >
          {isConnected ? (
            <Wifi size={13} className="text-accent-500 flex-shrink-0" />
          ) : (
            <WifiOff size={13} className="text-danger-500 flex-shrink-0" />
          )}
          <SignalBars strength={signalStrength} isConnected={isConnected} />
          <div className="flex items-center gap-1.5 border-l border-[var(--border-color)] pl-2 ml-0.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotClass}`} />
            <span className={`text-[11px] font-semibold ${statusTextClass}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Refresh button */}
        <button
          id="topbar-refresh"
          onClick={handleRefresh}
          className="
            p-2 rounded-lg
            text-[var(--text-secondary)]
            hover:bg-surface-100 dark:hover:bg-surface-800
            active:scale-95
            transition-all duration-150 cursor-pointer
          "
          title="Refresh data"
          aria-label="Refresh data"
        >
          <RefreshCw
            size={16}
            className={`transition-transform duration-700 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            id="topbar-notifications"
            onClick={() => setNotifOpen((prev) => !prev)}
            className={`
              relative p-2 rounded-lg
              text-[var(--text-secondary)]
              hover:bg-surface-100 dark:hover:bg-surface-800
              active:scale-95
              transition-all duration-150 cursor-pointer
              ${notifOpen ? 'bg-surface-100 dark:bg-surface-800' : ''}
            `.trim()}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className="
                  absolute top-1 right-1
                  flex items-center justify-center
                  min-w-[16px] h-4 px-1
                  text-[9px] font-bold leading-none
                  bg-danger-500 text-white rounded-full
                  ring-2 ring-[var(--bg-sidebar)]
                  pointer-events-none
                "
                aria-hidden="true"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationPanel
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onDismiss={handleDismiss}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        {/* Theme toggle / manager */}
        <div className="relative" ref={themeRef}>
          <button
            id="topbar-theme-toggle"
            onClick={() => setThemeOpen((prev) => !prev)}
            className={`
              p-2 rounded-lg
              text-[var(--text-secondary)]
              hover:bg-surface-100 dark:hover:bg-surface-800
              active:scale-95
              transition-all duration-150 cursor-pointer
              ${themeOpen ? 'bg-surface-100 dark:bg-surface-800 text-primary-500' : ''}
            `.trim()}
            aria-label="Open theme manager"
            aria-expanded={themeOpen}
            aria-haspopup="dialog"
            title="Theme manager"
          >
            {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <ThemeManagerDropdown isOpen={themeOpen} onClose={() => setThemeOpen(false)} />
        </div>
      </div>
    </header>
  )
}

export { TopBar }
