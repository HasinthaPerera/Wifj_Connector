import { Settings, Shield, Bell, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardContent, Button } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'

export function SettingsPage(): React.JSX.Element {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Application Settings</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Manage app configurations, alerts, and automatic refreshing rules
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Appearance & Themes" icon={<Settings size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Theme Mode</span>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="General Preferences" icon={<Shield size={16} />} />
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary-500" />
                <span className="text-[var(--text-primary)]">System Alerts</span>
              </div>
              <BadgeToggle active={true} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-accent-500" />
                <span className="text-[var(--text-primary)]">Auto Refresh</span>
              </div>
              <BadgeToggle active={true} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BadgeToggle({ active }: { active: boolean }): React.JSX.Element {
  return (
    <button
      className={`
        px-3 py-1 rounded-full text-[10px] font-bold select-none cursor-pointer
        ${active ? 'bg-accent-100 text-accent-700' : 'bg-surface-100 text-surface-600'}
      `.trim()}
    >
      {active ? 'Enabled' : 'Disabled'}
    </button>
  )
}
