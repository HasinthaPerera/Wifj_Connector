import { useState, useCallback, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Wifi,
  Network,
  Gauge,
  Activity,
  AlertTriangle,
  Signal,
  HeartPulse,
  Brain,
  Wrench,
  BarChart3,
  History,
  FileText,
  Settings,
  Info,
  TrendingUp,
  Timer,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  ScanLine,
  MemoryStick,
  Flame,
  BellRing
} from 'lucide-react'
import { TopBar } from '@/components/ui'
import { useBreakpoint } from '@/hooks'
import type { NavigationSection } from '@/types'

/* ─────────────────────────────────────────────────────────────
   Navigation data
───────────────────────────────────────────────────────────── */

const navigationSections: NavigationSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' }]
  },
  {
    id: 'network',
    title: 'Network',
    items: [
      { id: 'wifi-info', label: 'Wi-Fi Info', icon: 'Wifi', path: '/wifi-info' },
      { id: 'network-info', label: 'Network Info', icon: 'Network', path: '/network-info' },
      { id: 'speed-test', label: 'Speed Test', icon: 'Gauge', path: '/speed-test' }
    ]
  },
  {
    id: 'monitoring',
    title: 'Monitoring',
    items: [
      { id: 'ping-monitor', label: 'Ping Monitor', icon: 'Activity', path: '/ping-monitor' },
      {
        id: 'jitter-monitor',
        label: 'Jitter Monitor',
        icon: 'TrendingUp',
        path: '/jitter-monitor'
      },
      { id: 'packet-loss', label: 'Packet Loss', icon: 'AlertTriangle', path: '/packet-loss' },
      {
        id: 'signal-strength',
        label: 'Signal Strength',
        icon: 'Signal',
        path: '/signal-strength'
      },
      { id: 'bandwidth', label: 'Bandwidth', icon: 'BarChart3', path: '/bandwidth' },
      { id: 'latency-charts', label: 'Latency Charts', icon: 'Timer', path: '/latency-charts' }
    ]
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      { id: 'health-score',     label: 'Health Score',     icon: 'HeartPulse',  path: '/health-score' },
      { id: 'health-dashboard', label: 'Health Dashboard', icon: 'LayoutGrid',  path: '/health-dashboard' },
      { id: 'ai-diagnosis',     label: 'AI Diagnosis',     icon: 'Brain',       path: '/ai-diagnosis' },
      { id: 'optimization',     label: 'Optimization',     icon: 'Wrench',      path: '/optimization' }
    ]
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'process-scanner',  label: 'Process Scanner',  icon: 'ScanLine',    path: '/process-scanner' },
      { id: 'resource-monitor', label: 'Resource Monitor', icon: 'MemoryStick', path: '/resource-monitor' },
      { id: 'heavy-usage',      label: 'Heavy Usage Detection', icon: 'Flame', path: '/heavy-usage' },
      { id: 'network-alerts',   label: 'Network Alerts',   icon: 'BellRing',   path: '/network-alerts' }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics',
    items: [
      { id: 'history', label: 'History', icon: 'History', path: '/history' },
      { id: 'reports', label: 'Reports', icon: 'FileText', path: '/reports' }
    ]
  },
  {
    id: 'app',
    title: 'Application',
    items: [
      { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
      { id: 'about', label: 'About', icon: 'Info', path: '/about' }
    ]
  }
]

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Wifi,
  Network,
  Gauge,
  Activity,
  AlertTriangle,
  Signal,
  HeartPulse,
  Brain,
  Wrench,
  BarChart3,
  History,
  FileText,
  Settings,
  Info,
  TrendingUp,
  Timer,
  LayoutGrid,
  ScanLine,
  MemoryStick,
  Flame,
  BellRing
}

/* ─────────────────────────────────────────────────────────────
   localStorage helper for sidebar-collapsed preference
───────────────────────────────────────────────────────────── */

const SIDEBAR_PREF_KEY = 'smartwifi-sidebar-collapsed'

function getSidebarPref(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_PREF_KEY) === 'true'
  } catch {
    return false
  }
}

function setSidebarPref(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_PREF_KEY, String(collapsed))
  } catch {
    // localStorage unavailable
  }
}

/* ─────────────────────────────────────────────────────────────
   Sidebar nav content (shared between desktop and drawer)
───────────────────────────────────────────────────────────── */

interface SidebarNavProps {
  collapsed: boolean
  onNavClick?: () => void
}

function SidebarNav({ collapsed, onNavClick }: SidebarNavProps): React.JSX.Element {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2.5 no-scrollbar" aria-label="Main navigation">
      {navigationSections.map((section) => (
        <div key={section.id} className="mb-4">
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const IconComponent = iconMap[item.icon]
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      `
                        flex items-center gap-3 px-2.5 py-2 rounded-lg
                        text-sm font-medium transition-all duration-150
                        touch-target
                        ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-surface-50 hover:text-[var(--text-primary)] dark:hover:bg-surface-800'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `.trim()
                    }
                  >
                    {IconComponent && <IconComponent size={18} className="flex-shrink-0" />}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sidebar logo area (shared)
───────────────────────────────────────────────────────────── */

interface SidebarLogoProps {
  collapsed: boolean
  onClose?: () => void
}

function SidebarLogo({ collapsed, onClose }: SidebarLogoProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border-color)] flex-shrink-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
        <Wifi size={16} className="text-white" />
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1 animate-fade-in">
          <h1 className="text-sm font-bold text-[var(--text-primary)] truncate">SmartWiFi AI</h1>
          <p className="text-[10px] text-[var(--text-muted)] truncate">Network Assistant</p>
        </div>
      )}
      {/* Close button – only shown in mobile drawer mode */}
      {onClose && (
        <button
          onClick={onClose}
          className="
            flex-shrink-0 p-1.5 rounded-lg
            text-[var(--text-secondary)]
            hover:bg-surface-100 dark:hover:bg-surface-800
            transition-colors duration-150 cursor-pointer
          "
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   RootLayout
───────────────────────────────────────────────────────────── */

function RootLayout(): React.JSX.Element {
  const location = useLocation()
  const { isMobile, isTablet } = useBreakpoint()

  /**
   * Desktop collapsed state — persisted to localStorage.
   * On mobile/tablet this is irrelevant because we use a drawer instead.
   */
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getSidebarPref)

  /**
   * Mobile/tablet drawer open state.
   * Always starts closed; closes automatically on route change.
   */
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  const drawerRef = useRef<HTMLElement>(null)

  /* Close drawer on route change */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false)
  }, [location.pathname])

  /* Lock body scroll when drawer is open */
  useEffect(() => {
    if (!isMobile) return
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen, isMobile])

  /* Close drawer on Escape key */
  useEffect(() => {
    if (!drawerOpen) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [drawerOpen])

  /* Toggle desktop sidebar collapse with persistence */
  const toggleSidebar = useCallback(() => {
    if (isMobile || isTablet) {
      // On small screens, toggle the drawer instead
      setDrawerOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev
        setSidebarPref(next)
        return next
      })
    }
  }, [isMobile, isTablet])

  /* ── Derived layout values ── */

  /**
   * On tablet (md < lg): sidebar is always icon-only unless drawer is open.
   * On mobile: sidebar never occupies layout space; it's an overlay drawer.
   * On desktop: full or collapsed based on preference.
   */
  const isDrawerMode = isMobile || isTablet
  const effectiveCollapsed = isDrawerMode ? false : sidebarCollapsed
  const sidebarWidth = effectiveCollapsed ? 68 : 240

  /* ── Page metadata ── */
  const getPageTitle = (): string => {
    for (const section of navigationSections) {
      for (const item of section.items) {
        if (item.path === location.pathname) return item.label
      }
    }
    return 'Dashboard'
  }

  const getBreadcrumbs = (): { label: string }[] => {
    for (const section of navigationSections) {
      for (const item of section.items) {
        if (item.path === location.pathname) {
          return [{ label: section.title }, { label: item.label }]
        }
      }
    }
    return []
  }

  /* ── Desktop sidebar ── (hidden on mobile/tablet — replaced by drawer) */
  const desktopSidebar = !isDrawerMode && (
    <aside
      id="sidebar-desktop"
      style={{ width: sidebarWidth }}
      className="
        flex flex-col h-full flex-shrink-0
        bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]
        transition-[width] duration-300 ease-out overflow-hidden
      "
      aria-label="Sidebar navigation"
    >
      <SidebarLogo collapsed={effectiveCollapsed} />
      <SidebarNav collapsed={effectiveCollapsed} />

      {/* Desktop collapse toggle */}
      <div className="flex-shrink-0 border-t border-[var(--border-color)] p-2.5">
        <button
          id="sidebar-collapse-toggle"
          onClick={toggleSidebar}
          className="
            w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg
            text-sm text-[var(--text-secondary)]
            hover:bg-surface-50 dark:hover:bg-surface-800
            transition-colors duration-150 cursor-pointer
          "
          title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {effectiveCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!effectiveCollapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  )

  /* ── Tablet sidebar ── (icon-only always-visible rail on md screens) */
  const tabletSidebar = isTablet && (
    <aside
      id="sidebar-tablet"
      style={{ width: 68 }}
      className="
        flex flex-col h-full flex-shrink-0
        bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]
        overflow-hidden
      "
      aria-label="Sidebar navigation"
    >
      <div className="flex items-center justify-center h-16 border-b border-[var(--border-color)] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <Wifi size={16} className="text-white" />
        </div>
      </div>
      <SidebarNav collapsed={true} />
    </aside>
  )

  /* ── Mobile/tablet drawer + backdrop ── */
  const mobileDrawer = isDrawerMode && (
    <>
      {/* Backdrop */}
      <div
        id="sidebar-backdrop"
        role="presentation"
        onClick={() => setDrawerOpen(false)}
        className={`
          fixed inset-0 z-40
          bg-surface-950/60 backdrop-blur-sm
          transition-opacity duration-300
          ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `.trim()}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        id="sidebar-drawer"
        style={{ width: 260 }}
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]
          shadow-[var(--shadow-modal)]
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
        `.trim()}
        aria-modal="true"
        aria-label="Navigation drawer"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? true : undefined}
      >
        <SidebarLogo collapsed={false} onClose={() => setDrawerOpen(false)} />
        <SidebarNav collapsed={false} onNavClick={() => setDrawerOpen(false)} />
      </aside>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      {/* Portal-like backdrop + drawer for mobile/tablet */}
      {mobileDrawer}

      {/* Tablet icon-rail sidebar */}
      {tabletSidebar}

      {/* Desktop sidebar */}
      {desktopSidebar}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          pageTitle={getPageTitle()}
          breadcrumbs={getBreadcrumbs()}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={isDrawerMode ? !drawerOpen : sidebarCollapsed}
          isConnected
          signalStrength={78}
        />

        {/* Page content — responsive padding */}
        <main
          id="main-content"
          className="
            flex-1 overflow-y-auto
            p-3 sm:p-4 md:p-5 lg:p-6
          "
        >
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export { RootLayout }
