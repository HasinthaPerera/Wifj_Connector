import { useState, useCallback } from 'react'
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
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { NavigationSection } from '@/types'

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
      { id: 'packet-loss', label: 'Packet Loss', icon: 'AlertTriangle', path: '/packet-loss' },
      { id: 'signal-strength', label: 'Signal Strength', icon: 'Signal', path: '/signal-strength' },
      { id: 'bandwidth', label: 'Bandwidth', icon: 'BarChart3', path: '/bandwidth' }
    ]
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      { id: 'health-score', label: 'Health Score', icon: 'HeartPulse', path: '/health-score' },
      { id: 'ai-diagnosis', label: 'AI Diagnosis', icon: 'Brain', path: '/ai-diagnosis' },
      { id: 'optimization', label: 'Optimization', icon: 'Wrench', path: '/optimization' }
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
  Info
}

function RootLayout(): React.JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { resolvedTheme, toggleTheme } = useTheme()
  const location = useLocation()

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  const getPageTitle = (): string => {
    for (const section of navigationSections) {
      for (const item of section.items) {
        if (item.path === location.pathname) return item.label
      }
    }
    return 'Dashboard'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col h-full
          bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]
          transition-all duration-300 ease-out
          ${sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'}
        `.trim()}
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Wifi size={16} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 animate-fade-in">
              <h1 className="text-sm font-bold text-[var(--text-primary)] truncate">
                SmartWiFi AI
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] truncate">Network Assistant</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5">
          {navigationSections.map((section) => (
            <div key={section.id} className="mb-4">
              {!sidebarCollapsed && (
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
                        title={sidebarCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `
                            flex items-center gap-3 px-2.5 py-2 rounded-lg
                            text-sm font-medium transition-all duration-150
                            ${
                              isActive
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 shadow-sm'
                                : 'text-[var(--text-secondary)] hover:bg-surface-50 hover:text-[var(--text-primary)] dark:hover:bg-surface-800'
                            }
                            ${sidebarCollapsed ? 'justify-center' : ''}
                          `.trim()
                        }
                      >
                        {IconComponent && <IconComponent size={18} className="flex-shrink-0" />}
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        {!sidebarCollapsed && item.badge && (
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

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 border-t border-[var(--border-color)] p-2.5">
          <button
            onClick={toggleSidebar}
            className="
              w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg
              text-sm text-[var(--text-secondary)]
              hover:bg-surface-50 dark:hover:bg-surface-800
              transition-colors duration-150 cursor-pointer
            "
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="
                lg:hidden p-2 rounded-lg
                text-[var(--text-secondary)] hover:bg-surface-100 dark:hover:bg-surface-800
                transition-colors duration-150 cursor-pointer
              "
            >
              <Menu size={18} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{getPageTitle()}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              className="
                relative p-2 rounded-lg
                text-[var(--text-secondary)] hover:bg-surface-100 dark:hover:bg-surface-800
                transition-colors duration-150 cursor-pointer
              "
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="
                p-2 rounded-lg
                text-[var(--text-secondary)] hover:bg-surface-100 dark:hover:bg-surface-800
                transition-colors duration-150 cursor-pointer
              "
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export { RootLayout }
