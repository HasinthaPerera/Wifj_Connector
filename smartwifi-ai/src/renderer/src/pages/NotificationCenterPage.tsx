import React, { useState, useMemo } from 'react'
import {
  Bell,
  BellRing,
  AlertTriangle,
  Info,
  CheckCircle2,
  Brain,
  Volume2,
  Trash2,
  CheckCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Check
} from 'lucide-react'
import { useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export type NotificationPriority = 'critical' | 'warning' | 'info' | 'success'
export type NotificationCategory = 'network' | 'ai' | 'security' | 'system' | 'optimization'
export type NotificationFilter = 'all' | 'unread' | 'critical' | 'ai' | 'network'

export interface SystemNotificationItem {
  id: string
  title: string
  message: string
  timestamp: string
  rawTime: number
  priority: NotificationPriority
  category: NotificationCategory
  isRead: boolean
  actionText?: string
  actionPath?: string
}

export interface NotificationPreferenceRule {
  id: string
  title: string
  description: string
  enabled: boolean
}

/* ─────────────────────────────────────────────────────────────
   Initial Mock Notifications Catalog
───────────────────────────────────────────────────────────── */

const INITIAL_NOTIFICATIONS: SystemNotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Jitter & Packet Loss Detected',
    message:
      'Ping jitter spiked to 24.8ms on Wi-Fi interface (Channel 36). AI recommends running Auto-Optimization.',
    timestamp: '8 mins ago',
    rawTime: Date.now() - 8 * 60 * 1000,
    priority: 'critical',
    category: 'network',
    isRead: false,
    actionText: 'Run Auto-Fix',
    actionPath: '/auto-optimization'
  },
  {
    id: 'notif-2',
    title: 'AI DNS Recommendation Ready',
    message:
      'Cloudflare 1.1.1.1 benchmarked at 11ms latency (38% faster than gateway default 192.168.1.1).',
    timestamp: '25 mins ago',
    rawTime: Date.now() - 25 * 60 * 1000,
    priority: 'info',
    category: 'ai',
    isRead: false,
    actionText: 'View Recommendation',
    actionPath: '/dns-recommendation'
  },
  {
    id: 'notif-3',
    title: 'TCP Socket Stack Re-Aligned',
    message:
      'Auto-Optimization suite successfully flushed DNS resolver cache and reset TCP window scaling.',
    timestamp: '1 hour ago',
    rawTime: Date.now() - 60 * 60 * 1000,
    priority: 'success',
    category: 'optimization',
    isRead: true
  },
  {
    id: 'notif-4',
    title: 'Unrecognized Device Connection Alert',
    message: 'New MAC address BC:3B:AD:12:F1:C0 detected on local subnet gateway 192.168.1.1.',
    timestamp: '2 hours ago',
    rawTime: Date.now() - 2 * 60 * 60 * 1000,
    priority: 'warning',
    category: 'security',
    isRead: false,
    actionText: 'Inspect Network',
    actionPath: '/network-info'
  },
  {
    id: 'notif-5',
    title: 'Heavy Bandwidth Process Warning',
    message: 'Process chrome.exe consuming 8.4 MB/s (64% of network interface capacity).',
    timestamp: '3 hours ago',
    rawTime: Date.now() - 3 * 60 * 60 * 1000,
    priority: 'warning',
    category: 'system',
    isRead: true,
    actionText: 'Process Scanner',
    actionPath: '/process-scanner'
  },
  {
    id: 'notif-6',
    title: 'DHCP Lease Renewal Completed',
    message: 'Assigned IPv4 lease renewed successfully: 192.168.1.105 from gateway router.',
    timestamp: '5 hours ago',
    rawTime: Date.now() - 5 * 60 * 60 * 1000,
    priority: 'success',
    category: 'network',
    isRead: true
  }
]

/* ─────────────────────────────────────────────────────────────
   NotificationCenterPage Component
───────────────────────────────────────────────────────────── */

export function NotificationCenterPage(): React.JSX.Element {
  const { showToast } = useToast()

  // Feed State
  const [notifications, setNotifications] =
    useState<SystemNotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')

  // Notification Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferenceRule[]>([
    {
      id: 'desktopToasts',
      title: 'Windows Native Notification Toasts',
      description: 'Show OS desktop toast banners when high-priority network alerts trigger',
      enabled: true
    },
    {
      id: 'soundChime',
      title: 'Audible Alert Sound Chimes',
      description: 'Play subtle alert sound effect on critical packet loss or disconnection',
      enabled: true
    },
    {
      id: 'autoTuneNotif',
      title: 'Auto-Tuning Execution Logs',
      description: 'Notify when background AI rule engine applies automatic socket optimizations',
      enabled: true
    },
    {
      id: 'latencySpikeNotif',
      title: 'Latency Spike Threshold Alerts',
      description: 'Trigger notification when ping response latency exceeds 45 ms threshold',
      enabled: true
    }
  ])

  /* ── Filter Handler ── */
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'unread') return !n.isRead
      if (activeFilter === 'critical') return n.priority === 'critical' || n.priority === 'warning'
      if (activeFilter === 'ai') return n.category === 'ai' || n.category === 'optimization'
      if (activeFilter === 'network') return n.category === 'network' || n.category === 'security'
      return true
    })
  }, [notifications, activeFilter])

  /* ── Counts Calculation ── */
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])
  const criticalCount = useMemo(
    () => notifications.filter((n) => n.priority === 'critical').length,
    [notifications]
  )

  /* ── Notification Actions ── */
  const handleMarkAsRead = (id: string): void => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const handleMarkAllRead = (): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    showToast('success', 'Notifications Updated', 'Marked all notifications as read.')
  }

  const handleDeleteNotification = (id: string): void => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    showToast('info', 'Notification Removed', 'Deleted notification from feed.')
  }

  const handleClearAll = (): void => {
    setNotifications([])
    showToast('info', 'Feed Cleared', 'Cleared all notification entries.')
  }

  const handleTestPushNotification = (): void => {
    const testItem: SystemNotificationItem = {
      id: `test-${Date.now()}`,
      title: 'Test System Notification Push',
      message: 'Notification Center system test. Real-time event propagation verified.',
      timestamp: 'Just now',
      rawTime: Date.now(),
      priority: 'info',
      category: 'system',
      isRead: false
    }
    setNotifications((prev) => [testItem, ...prev])
    showToast('info', 'Test Notification Triggered', 'Added test notification to feed.')
  }

  const handleTogglePreference = (id: string): void => {
    setPreferences((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Top Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Notification Center</h1>
            {unreadCount > 0 && (
              <Badge variant="danger" size="sm">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Centralized feed of real-time network alerts, AI diagnostic warnings, and auto-tune
            execution logs
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BellRing size={14} />}
            onClick={handleTestPushNotification}
          >
            Test Push
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck size={14} />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={handleClearAll}
              className="text-danger-500 hover:text-danger-600"
            >
              Clear Feed
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. Top Metric Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Feed Items */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Bell size={15} className="text-primary-500" />
              Total Feed Volume
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-[var(--text-primary)]">
                {notifications.length}
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">entries</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Active notification feed</p>
          </CardContent>
        </Card>

        {/* Metric 2: Unread Alerts */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Sparkles size={15} className="text-accent-500" />
              Unread Action Items
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-accent-500">{unreadCount}</span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">unread</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {unreadCount > 0 ? 'Requires user review' : 'All notifications read'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Critical System Alerts */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-danger-500" />
              Critical Priority Alerts
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-danger-500">{criticalCount}</span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">critical</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {criticalCount > 0 ? 'High-priority packet jitter' : 'Zero critical warnings'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: AI & Security Triggers */}
        <Card className="border-[var(--border-color)] shadow-card">
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-[var(--text-muted)] font-semibold flex items-center gap-1.5">
              <Brain size={15} className="text-sky-500" />
              AI Engine Diagnostics
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)] truncate pt-0.5">
              {notifications.filter((n) => n.category === 'ai').length} AI Events
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Smart recommendation feed</p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Multi-Category Filter Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <FilterTab
          id="all"
          label={`All Feed (${notifications.length})`}
          active={activeFilter}
          onClick={setActiveFilter}
        />
        <FilterTab
          id="unread"
          label={`Unread Only (${unreadCount})`}
          active={activeFilter}
          onClick={setActiveFilter}
        />
        <FilterTab
          id="critical"
          label="Critical & Alerts"
          active={activeFilter}
          onClick={setActiveFilter}
        />
        <FilterTab
          id="ai"
          label="AI & Optimization"
          active={activeFilter}
          onClick={setActiveFilter}
        />
        <FilterTab
          id="network"
          label="Network & Security"
          active={activeFilter}
          onClick={setActiveFilter}
        />
      </div>

      {/* ── 4. Main Feed & Preferences Grid (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Notification Feed List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Activity & Alert Feed"
              subtitle={`Showing ${filteredNotifications.length} notifications`}
              icon={<Bell size={18} className="text-primary-500" />}
            />
            <CardContent className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <CheckCircle2 size={32} className="text-accent-500 mx-auto opacity-80" />
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">No Notifications</h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Your notification feed is clear for this filter category.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`
                        p-4 rounded-xl border transition-all duration-150 space-y-2 relative
                        ${
                          !notif.isRead
                            ? 'bg-surface-50 dark:bg-surface-900/60 border-primary-500/30 shadow-sm'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-85'
                        }
                      `.trim()}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Priority Icon */}
                          <div className="mt-0.5 flex-shrink-0">
                            {notif.priority === 'critical' && (
                              <div className="p-1.5 rounded-lg bg-danger-500/10 text-danger-500">
                                <AlertTriangle size={18} />
                              </div>
                            )}
                            {notif.priority === 'warning' && (
                              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                <AlertTriangle size={18} />
                              </div>
                            )}
                            {notif.priority === 'info' && (
                              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                                <Info size={18} />
                              </div>
                            )}
                            {notif.priority === 'success' && (
                              <div className="p-1.5 rounded-lg bg-accent-500/10 text-accent-500">
                                <CheckCircle2 size={18} />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs text-[var(--text-primary)]">
                                {notif.title}
                              </h4>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                              )}
                              <Badge
                                variant={
                                  notif.priority === 'critical'
                                    ? 'danger'
                                    : notif.priority === 'warning'
                                      ? 'warning'
                                      : notif.priority === 'success'
                                        ? 'accent'
                                        : 'default'
                                }
                                size="sm"
                              >
                                {notif.category.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        </div>

                        {/* Top Right Action & Delete */}
                        <div className="flex items-center gap-1.5">
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              title="Mark as read"
                              className="text-xs text-[var(--text-muted)] hover:text-primary-500 p-1"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notif.id)}
                            title="Delete notification"
                            className="text-xs text-[var(--text-muted)] hover:text-danger-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Timestamp & Quick Action Link */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/40 text-[11px]">
                        <span className="text-[var(--text-muted)] font-mono flex items-center gap-1">
                          <Clock size={12} />
                          {notif.timestamp}
                        </span>
                        {notif.actionText && (
                          <a
                            href={`#${notif.actionPath}`}
                            className="text-primary-500 hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>{notif.actionText}</span>
                            <ArrowRight size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1-Col: Delivery Preferences & Settings */}
        <div className="space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Notification Delivery Preferences"
              subtitle="Manage OS toast banners and alert audio"
              icon={<Volume2 size={18} className="text-primary-500" />}
            />
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {preferences.map((pref) => (
                  <div
                    key={pref.id}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-[var(--text-primary)]">{pref.title}</h4>
                      <button
                        onClick={() => handleTogglePreference(pref.id)}
                        className={`
                          w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer
                          ${pref.enabled ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                        `.trim()}
                      >
                        <span
                          className={`
                            w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200
                            ${pref.enabled ? 'left-4.5' : 'left-0.75'}
                          `.trim()}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                      {pref.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary Card */}
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Notification Policy"
              subtitle="How SmartWiFi AI handles alerts"
              icon={<ShieldCheck size={18} className="text-accent-500" />}
            />
            <CardContent className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                SmartWiFi AI processes all network diagnostics locally on your device. Notifications
                are never sent to external servers or cloud services.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FilterTab({
  id,
  label,
  active,
  onClick
}: {
  id: NotificationFilter
  label: string
  active: NotificationFilter
  onClick: (id: NotificationFilter) => void
}): React.JSX.Element {
  const isSelected = active === id
  return (
    <button
      onClick={() => onClick(id)}
      className={`
        px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex-shrink-0 cursor-pointer
        ${
          isSelected
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-primary-500/50'
        }
      `.trim()}
    >
      {label}
    </button>
  )
}
