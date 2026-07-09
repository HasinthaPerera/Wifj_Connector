import {
  Wifi,
  Activity,
  Gauge,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Signal,
  Clock
} from 'lucide-react'
import { Card, CardHeader, CardContent, Badge, ProgressBar } from '@/components/ui'

interface StatCardData {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: { value: string; positive: boolean }
  color: string
}

const statCards: StatCardData[] = [
  {
    title: 'Download Speed',
    value: '—',
    subtitle: 'Run a speed test',
    icon: <Gauge size={20} />,
    color: 'primary'
  },
  {
    title: 'Upload Speed',
    value: '—',
    subtitle: 'Run a speed test',
    icon: <ArrowUpRight size={20} />,
    color: 'accent'
  },
  {
    title: 'Ping',
    value: '—',
    subtitle: 'Waiting for data',
    icon: <Activity size={20} />,
    color: 'warning'
  },
  {
    title: 'Signal Strength',
    value: '—',
    subtitle: 'Checking connection',
    icon: <Signal size={20} />,
    color: 'primary'
  }
]

const colorMap: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  primary: {
    bg: 'bg-primary-50',
    text: 'text-primary-600',
    darkBg: 'dark:bg-primary-950',
    darkText: 'dark:text-primary-400'
  },
  accent: {
    bg: 'bg-accent-50',
    text: 'text-accent-600',
    darkBg: 'dark:bg-accent-950',
    darkText: 'dark:text-accent-400'
  },
  warning: {
    bg: 'bg-warning-50',
    text: 'text-warning-600',
    darkBg: 'dark:bg-warning-950',
    darkText: 'dark:text-warning-400'
  }
}

function DashboardPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card variant="gradient" padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome to SmartWiFi AI</h1>
            <p className="text-primary-100 text-sm max-w-lg">
              Your intelligent network health assistant. Monitor, analyze, and optimize your Wi-Fi
              connection with AI-powered insights.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="accent" dot>
              Connected
            </Badge>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const colors = colorMap[stat.color] || colorMap.primary
          return (
            <Card key={stat.title} hoverable>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {stat.trend ? (
                      <>
                        <span
                          className={`inline-flex items-center text-xs font-medium ${
                            stat.trend.positive ? 'text-accent-500' : 'text-danger-500'
                          }`}
                        >
                          {stat.trend.positive ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {stat.trend.value}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">vs last hour</span>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">{stat.subtitle}</span>
                    )}
                  </div>
                </div>
                <div
                  className={`
                    flex-shrink-0 p-2.5 rounded-xl
                    ${colors.bg} ${colors.text}
                    ${colors.darkBg} ${colors.darkText}
                  `.trim()}
                >
                  {stat.icon}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Health */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Network Health"
            subtitle="Real-time connection quality"
            icon={<HeartPulseIcon />}
            action={
              <Badge variant="accent" size="sm" dot>
                Good
              </Badge>
            }
          />
          <CardContent>
            <div className="space-y-4">
              <HealthMetric label="Signal Quality" value={0} maxLabel="Not measured" />
              <HealthMetric label="Connection Stability" value={0} maxLabel="Not measured" />
              <HealthMetric label="Speed Performance" value={0} maxLabel="Not measured" />
              <HealthMetric label="Latency Score" value={0} maxLabel="Not measured" />
              <HealthMetric label="Security Score" value={0} maxLabel="Not measured" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader
            title="Connection Info"
            subtitle="Current Wi-Fi details"
            icon={<Wifi size={16} />}
          />
          <CardContent>
            <div className="space-y-3">
              <InfoRow label="Status" value="Checking..." />
              <InfoRow label="SSID" value="—" />
              <InfoRow label="IP Address" value="—" />
              <InfoRow label="Gateway" value="—" />
              <InfoRow label="DNS" value="—" />
              <InfoRow label="Security" value="—" />
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Clock size={12} />
                <span>Data will refresh automatically</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader
          title="Quick Actions"
          subtitle="Common network tasks"
          icon={<Shield size={16} />}
        />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              icon={<Gauge size={20} />}
              label="Speed Test"
              description="Test your connection"
            />
            <QuickAction
              icon={<Activity size={20} />}
              label="Ping Test"
              description="Check latency"
            />
            <QuickAction
              icon={<Signal size={20} />}
              label="Signal Scan"
              description="Analyze Wi-Fi signal"
            />
            <QuickAction
              icon={<Shield size={20} />}
              label="Security Check"
              description="Review security"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HeartPulseIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  )
}

interface HealthMetricProps {
  label: string
  value: number
  maxLabel?: string
}

function HealthMetric({ label, value, maxLabel }: HealthMetricProps): React.JSX.Element {
  const getVariant = (): 'accent' | 'primary' | 'warning' | 'danger' => {
    if (value >= 80) return 'accent'
    if (value >= 60) return 'primary'
    if (value >= 40) return 'warning'
    return 'danger'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {value > 0 ? `${value}%` : maxLabel || '—'}
        </span>
      </div>
      <ProgressBar value={value} variant={value > 0 ? getVariant() : 'primary'} size="sm" />
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className="text-xs font-medium text-[var(--text-primary)] text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  )
}

interface QuickActionProps {
  icon: React.ReactNode
  label: string
  description: string
}

function QuickAction({ icon, label, description }: QuickActionProps): React.JSX.Element {
  return (
    <button
      className="
        flex flex-col items-center gap-2 p-4 rounded-xl
        bg-surface-50 dark:bg-surface-800/50
        border border-transparent
        hover:border-primary-200 hover:bg-primary-50
        dark:hover:border-primary-800 dark:hover:bg-primary-950/50
        transition-all duration-200
        cursor-pointer group
      "
    >
      <div className="p-2.5 rounded-xl bg-white dark:bg-surface-800 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
        <span className="text-primary-500">{icon}</span>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
    </button>
  )
}

export { DashboardPage }
