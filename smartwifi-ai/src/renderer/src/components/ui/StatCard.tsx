import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './Card'

export interface StatCardProps {
  title: string
  value: string
  unit: string
  icon: React.ReactNode
  trendValue: number // positive = improving
  trendLabel: string
  colorClass: string
  bgClass: string
}

export function StatCard({
  title,
  value,
  unit,
  icon,
  trendValue,
  trendLabel,
  colorClass,
  bgClass
}: StatCardProps): React.JSX.Element {
  const isPositive = trendValue >= 0
  const isFlat = Math.abs(trendValue) < 0.5

  return (
    <Card hoverable>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-[26px] font-black text-[var(--text-primary)] leading-none">
              {value}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">{unit}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            {isFlat ? (
              <Minus size={11} className="text-[var(--text-muted)]" />
            ) : isPositive ? (
              <TrendingUp size={11} className="text-accent-500" />
            ) : (
              <TrendingDown size={11} className="text-danger-500" />
            )}
            <span
              className={`text-[11px] font-medium ${
                isFlat
                  ? 'text-[var(--text-muted)]'
                  : isPositive
                    ? 'text-accent-500'
                    : 'text-danger-500'
              }`}
            >
              {trendLabel}
            </span>
          </div>
        </div>
        <div className={`flex-shrink-0 p-2.5 rounded-xl ${bgClass} ${colorClass}`}>{icon}</div>
      </div>
    </Card>
  )
}
