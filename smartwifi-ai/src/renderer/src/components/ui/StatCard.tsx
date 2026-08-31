import { useRef, useEffect } from 'react'
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

  // Trigger count-flash animation whenever value changes
  const valueRef = useRef<HTMLSpanElement>(null)
  const prevValueRef = useRef<string>(value)

  useEffect(() => {
    if (prevValueRef.current !== value && valueRef.current) {
      // Remove and re-add class to retrigger the animation
      valueRef.current.classList.remove('animate-count-flash')
      void valueRef.current.offsetWidth // force reflow
      valueRef.current.classList.add('animate-count-flash')
      prevValueRef.current = value
    }
  }, [value])

  const trendPillClass = isFlat
    ? 'bg-surface-100 dark:bg-surface-700/60 text-[var(--text-muted)]'
    : isPositive
      ? 'bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400'
      : 'bg-danger-50 dark:bg-danger-950/60 text-danger-600 dark:text-danger-400'

  return (
    <Card hoverable>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              ref={valueRef}
              className="text-[26px] font-black text-[var(--text-primary)] leading-none tabular-nums"
            >
              {value}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">{unit}</span>
          </div>
          <div className="mt-2">
            <span
              className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                ${trendPillClass}
              `.trim()}
            >
              {isFlat ? (
                <Minus size={10} />
              ) : isPositive ? (
                <TrendingUp size={10} />
              ) : (
                <TrendingDown size={10} />
              )}
              {trendLabel}
            </span>
          </div>
        </div>
        <div
          className={`flex-shrink-0 p-3 rounded-xl shadow-sm ${bgClass} ${colorClass}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}
