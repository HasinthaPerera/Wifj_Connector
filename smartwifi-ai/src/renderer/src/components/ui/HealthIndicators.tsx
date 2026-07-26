/**
 * HealthIndicators — Reusable network health indicator primitives.
 *
 * Exports:
 *  - StatusPill         — animated live/offline/warning pill
 *  - SignalBars         — 4-bar Wi-Fi signal strength display
 *  - QualityDot         — pulsing coloured status dot
 *  - ScoreBadge         — numeric health score with colour-coded ring
 *  - HealthMeter        — segmented arc gauge (0-100)
 *  - HealthIndicatorRow — label + score + bar in a single compact row
 *  - ConnectionQualityCard — self-contained card combining multiple indicators
 */

import { type HTMLAttributes } from 'react'
import { ProgressBar } from './ProgressBar'

/* ─────────────────────────────────────────────────────────────
   Shared types
───────────────────────────────────────────────────────────── */

export type HealthGrade = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
export type HealthVariant = 'accent' | 'primary' | 'warning' | 'danger'
export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error'

/* ─────────────────────────────────────────────────────────────
   Pure helper — derive variant from score (0-100)
───────────────────────────────────────────────────────────── */

export function scoreToVariant(score: number): HealthVariant {
  if (score >= 85) return 'accent'
  if (score >= 65) return 'primary'
  if (score >= 40) return 'warning'
  return 'danger'
}

export function scoreToGrade(score: number): HealthGrade {
  if (score >= 85) return 'excellent'
  if (score >= 65) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}

export function gradeToLabel(grade: HealthGrade): string {
  switch (grade) {
    case 'excellent': return 'Excellent'
    case 'good':      return 'Good'
    case 'fair':      return 'Fair'
    case 'poor':      return 'Poor'
    default:          return 'Unknown'
  }
}

/** CSS custom property colour for each variant */
export function variantToColor(variant: HealthVariant): string {
  switch (variant) {
    case 'accent':  return 'var(--color-accent-500)'
    case 'primary': return 'var(--color-primary-500)'
    case 'warning': return 'var(--color-warning-500)'
    case 'danger':  return 'var(--color-danger-500)'
  }
}

/* ─────────────────────────────────────────────────────────────
   StatusPill
   Animated live/connecting/disconnected/error pill.
───────────────────────────────────────────────────────────── */

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  /** Connection state to visually represent */
  state: ConnectionState
  /** Optional override label (default: state name) */
  label?: string
  size?: 'sm' | 'md'
}

const STATE_CLASSES: Record<ConnectionState, { pill: string; dot: string }> = {
  connected:    { pill: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300 border-accent-200 dark:border-accent-800', dot: 'bg-accent-500' },
  connecting:   { pill: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 border-primary-200 dark:border-primary-800', dot: 'bg-primary-500' },
  disconnected: { pill: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 border-surface-200 dark:border-surface-700', dot: 'bg-surface-400' },
  error:        { pill: 'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300 border-danger-200 dark:border-danger-800', dot: 'bg-danger-500' }
}

const STATE_LABELS: Record<ConnectionState, string> = {
  connected: 'Connected', connecting: 'Connecting…', disconnected: 'Offline', error: 'Error'
}

/**
 * StatusPill — Shows a connection state as an animated pill with a pulsing dot.
 * "connected" state gets a soft pulse; "connecting" gets a faster blink.
 */
export function StatusPill({ state, label, size = 'md', className = '', ...props }: StatusPillProps): React.JSX.Element {
  const { pill, dot } = STATE_CLASSES[state]
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1.5' : 'px-2.5 py-1 text-xs gap-2'
  const dotSize  = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const animate  = state === 'connected' ? 'animate-pulse-soft' : state === 'connecting' ? 'animate-pulse' : ''

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${pill} ${sizeClass} ${className}`}
      {...props}
    >
      <span className={`${dotSize} rounded-full flex-shrink-0 ${dot} ${animate}`} />
      {label ?? STATE_LABELS[state]}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   QualityDot
   A compact pulsing coloured dot — useful as a table/list status indicator.
───────────────────────────────────────────────────────────── */

interface QualityDotProps extends HTMLAttributes<HTMLSpanElement> {
  /** 0-100 score */
  score: number
  /** Optional explicit size (default 8px) */
  dotSize?: string
  /** Whether to show the pulse animation (default true for ≥ 65) */
  pulse?: boolean
}

/**
 * QualityDot — A tiny coloured status circle derived from a 0-100 score.
 * Useful for table rows, list items, and sidebar labels.
 */
export function QualityDot({ score, dotSize = 'w-2 h-2', pulse, className = '', ...props }: QualityDotProps): React.JSX.Element {
  const variant = scoreToVariant(score)
  const shouldPulse = pulse ?? score >= 65

  const colorMap: Record<HealthVariant, string> = {
    accent:  'bg-accent-500',
    primary: 'bg-primary-500',
    warning: 'bg-warning-500',
    danger:  'bg-danger-500'
  }

  return (
    <span
      className={`rounded-full flex-shrink-0 ${dotSize} ${colorMap[variant]} ${shouldPulse ? 'animate-pulse-soft' : ''} ${className}`}
      aria-label={`Quality: ${gradeToLabel(scoreToGrade(score))}`}
      role="img"
      {...props}
    />
  )
}

/* ─────────────────────────────────────────────────────────────
   SignalBars
   Wi-Fi-style 4-bar signal strength indicator.
───────────────────────────────────────────────────────────── */

interface SignalBarsProps extends HTMLAttributes<HTMLDivElement> {
  /** Signal percentage 0-100 */
  percent: number
  /** Number of bars to render (default 4) */
  bars?: number
  size?: 'sm' | 'md' | 'lg'
}

/**
 * SignalBars — Renders classic Wi-Fi style ascending bars.
 * Bars light up proportionally to the signal percentage.
 * Colours shift from danger → warning → primary → accent as signal improves.
 */
export function SignalBars({ percent, bars = 4, size = 'md', className = '', ...props }: SignalBarsProps): React.JSX.Element {
  const activeBars = Math.ceil((percent / 100) * bars)

  const { gap, width, baseH, heightStep } = {
    sm: { gap: 'gap-0.5', width: 'w-1',   baseH: 4, heightStep: 3 },
    md: { gap: 'gap-1',   width: 'w-1.5', baseH: 6, heightStep: 4 },
    lg: { gap: 'gap-1.5', width: 'w-2',   baseH: 8, heightStep: 5 }
  }[size]

  const totalH = baseH + heightStep * (bars - 1) + 2
  const activeColor = percent >= 75 ? 'bg-accent-500' : percent >= 50 ? 'bg-primary-500' : percent >= 25 ? 'bg-warning-500' : 'bg-danger-500'

  return (
    <div
      className={`flex items-end ${gap} ${className}`}
      style={{ height: totalH }}
      aria-label={`Signal: ${percent}%`}
      role="img"
      {...props}
    >
      {Array.from({ length: bars }, (_, i) => {
        const isActive = i < activeBars
        const h = baseH + i * heightStep
        return (
          <div
            key={i}
            className={`${width} rounded-sm transition-all duration-500 ${isActive ? activeColor : 'bg-surface-200 dark:bg-surface-700'}`}
            style={{ height: h }}
          />
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ScoreBadge
   A numeric score displayed inside a coloured ring badge.
───────────────────────────────────────────────────────────── */

interface ScoreBadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** 0-100 score */
  score: number
  /** Badge diameter in px (default 48) */
  size?: number
  /** Show grade label below the number */
  showGrade?: boolean
}

/**
 * ScoreBadge — Compact SVG ring badge for showing a 0-100 score at a glance.
 * Ring fills clockwise; colour matches the grade.
 */
export function ScoreBadge({ score, size = 48, showGrade = false, className = '', ...props }: ScoreBadgeProps): React.JSX.Element {
  const R = (size - 6) / 2
  const circumference = 2 * Math.PI * R
  const offset = circumference - (score / 100) * circumference
  const color = variantToColor(scoreToVariant(score))
  const grade = scoreToGrade(score)

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`} {...props}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Score: ${score}/100`} role="img">
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--color-surface-200)" strokeWidth="5"
            className="dark:[stroke:var(--color-surface-700)]" />
          <circle
            cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.7s ease-out, stroke 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black leading-none tabular-nums"
            style={{ fontSize: size * 0.28, color }}
          >
            {score}
          </span>
        </div>
      </div>
      {showGrade && (
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {gradeToLabel(grade)}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HealthMeter
   Segmented arc gauge (270° sweep) — the definitive health indicator.
───────────────────────────────────────────────────────────── */

interface HealthMeterProps extends HTMLAttributes<HTMLDivElement> {
  /** 0-100 score */
  score: number
  /** Optional label below the gauge */
  label?: string
  /** Outer diameter in px */
  size?: number
  /** Whether to show tick marks at the grade thresholds */
  showTicks?: boolean
}

/**
 * HealthMeter — A 270° segmented arc gauge for displaying health scores.
 * The track is divided into 4 coloured segments (danger→warning→primary→accent).
 * The indicator needle fills up to the current score value.
 */
export function HealthMeter({ score, label, size = 160, showTicks = true, className = '', ...props }: HealthMeterProps): React.JSX.Element {
  const strokeW = 12
  const R = (size - strokeW) / 2
  const cx = size / 2
  const cy = size / 2
  const arcLength = 2 * Math.PI * R * 0.75  // 270° arc
  const circumference = 2 * Math.PI * R

  // The 270° arc starts at 135° (rotate to start at lower-left)
  const ROTATE = 135

  // Segment boundaries (mapped onto 270° arc)
  const segments = [
    { from: 0,  to: 40,  color: 'var(--color-danger-500)',  opacity: 0.25 },
    { from: 40, to: 65,  color: 'var(--color-warning-500)', opacity: 0.25 },
    { from: 65, to: 85,  color: 'var(--color-primary-500)', opacity: 0.25 },
    { from: 85, to: 100, color: 'var(--color-accent-500)',  opacity: 0.25 }
  ]

  const scoreArcLen = (score / 100) * arcLength
  const scoreOffset = arcLength - scoreArcLen
  const color = variantToColor(scoreToVariant(score))

  // Tick positions for grade thresholds (40, 65, 85)
  const tickScores = [40, 65, 85]

  function segmentDash(from: number, to: number): { dashArray: string; dashOffset: string } {
    const segLen = ((to - from) / 100) * arcLength
    const segOff = circumference - ((from / 100) * arcLength + segLen)
    return {
      dashArray: `${segLen} ${circumference - segLen}`,
      dashOffset: `${segOff}`
    }
  }


  return (
    <div className={`flex flex-col items-center ${className}`} {...props}>
      <div className="relative" style={{ width: size, height: size * 0.78 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ marginTop: -(size * 0.22) }}
          aria-label={`Health score: ${score}`}
          role="img"
        >
          {/* Track */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke="var(--color-surface-200)" strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${ROTATE} ${cx} ${cy})`}
            className="dark:[stroke:var(--color-surface-700)]"
          />

          {/* Coloured background segments */}
          {segments.map((seg) => {
            const { dashArray, dashOffset } = segmentDash(seg.from, seg.to)
            return (
              <circle key={seg.from} cx={cx} cy={cy} r={R}
                fill="none" stroke={seg.color} strokeWidth={strokeW - 2}
                strokeLinecap="butt"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                transform={`rotate(${ROTATE} ${cx} ${cy})`}
                opacity={seg.opacity}
              />
            )
          })}

          {/* Value arc */}
          <circle cx={cx} cy={cy} r={R} fill="none"
            stroke={color} strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={scoreOffset}
            transform={`rotate(${ROTATE} ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.4s ease' }}
          />

          {/* Threshold ticks */}
          {showTicks && tickScores.map((ts) => {
            // Convert score to angle: 135 + (score/100)*270 degrees
            const angleDeg = ROTATE + (ts / 100) * 270
            const angleRad = (angleDeg * Math.PI) / 180
            const innerR = R - strokeW / 2 - 1
            const outerR = R + strokeW / 2 + 1
            const x1 = cx + innerR * Math.cos(angleRad)
            const y1 = cy + innerR * Math.sin(angleRad)
            const x2 = cx + outerR * Math.cos(angleRad)
            const y2 = cy + outerR * Math.sin(angleRad)
            return (
              <line key={ts} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--bg-card)" strokeWidth="2" strokeLinecap="round"
              />
            )
          })}

          {/* Centre score */}
          <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.22} fontWeight="900" fill={color}
            style={{ transition: 'fill 0.4s ease', fontFamily: 'var(--font-sans)' }}
          >
            {score}
          </text>
          <text x={cx} y={cy + size * 0.11} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.09} fontWeight="600"
            fill="var(--color-surface-400)"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            / 100
          </text>
        </svg>
      </div>

      {/* Grade label */}
      {label !== undefined ? (
        <span className="text-xs font-bold tracking-wide mt-1" style={{ color }}>
          {label}
        </span>
      ) : (
        <span className="text-xs font-bold tracking-wide mt-1" style={{ color }}>
          {gradeToLabel(scoreToGrade(score))}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   HealthIndicatorRow
   A single-line label + score + animated progress bar.
───────────────────────────────────────────────────────────── */

interface HealthIndicatorRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Dimension label */
  label: string
  /** 0-100 score */
  score: number
  /** Optional raw measurement string (e.g. "87 Mbps") */
  rawValue?: string
  /** Leading icon node */
  icon?: React.ReactNode
  /** Weight label (e.g. "25%") */
  weight?: string
  /** Show the numeric score on the right (default true) */
  showScore?: boolean
  /** Bar height variant */
  barSize?: 'sm' | 'md' | 'lg'
}

/**
 * HealthIndicatorRow — Compact row combining icon, label, optional raw value,
 * weight annotation, animated progress bar, and score number.
 * Designed to be composed into breakdown panels.
 */
export function HealthIndicatorRow({
  label,
  score,
  rawValue,
  icon,
  weight,
  showScore = true,
  barSize = 'sm',
  className = '',
  ...props
}: HealthIndicatorRowProps): React.JSX.Element {
  const variant = scoreToVariant(score)
  const color = variantToColor(variant)

  return (
    <div className={`space-y-1.5 ${className}`} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs min-w-0">
          {icon && <span className="text-[var(--text-muted)] flex-shrink-0">{icon}</span>}
          <span className="font-medium text-[var(--text-primary)] truncate">{label}</span>
          {rawValue && (
            <>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="text-[var(--text-secondary)] font-mono">{rawValue}</span>
            </>
          )}
          {weight && (
            <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">({weight})</span>
          )}
        </div>
        {showScore && (
          <span className="text-xs font-bold tabular-nums flex-shrink-0 ml-2" style={{ color }}>
            {score} <span className="text-[var(--text-muted)] font-normal">/ 100</span>
          </span>
        )}
      </div>
      <ProgressBar value={score} max={100} size={barSize} variant={variant} animated />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ConnectionQualityCard
   Self-contained card showing a gauge + all indicator rows.
───────────────────────────────────────────────────────────── */

export interface DimensionScore {
  label: string
  score: number
  rawValue?: string
  icon?: React.ReactNode
  weight?: string
}

interface ConnectionQualityCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Overall composite score (0-100) */
  overallScore: number
  /** Per-dimension breakdowns */
  dimensions: DimensionScore[]
  /** Card title (default "Connection Quality") */
  title?: string
  /** Show the HealthMeter gauge (default true) */
  showGauge?: boolean
  /** Gauge size in px */
  gaugeSize?: number
}

/**
 * ConnectionQualityCard — A self-contained panel combining a HealthMeter gauge
 * with a vertical list of HealthIndicatorRows.
 * Drop this anywhere you need a full-featured health summary block.
 */
export function ConnectionQualityCard({
  overallScore,
  dimensions,
  title = 'Connection Quality',
  showGauge = true,
  gaugeSize = 148,
  className = '',
  ...props
}: ConnectionQualityCardProps): React.JSX.Element {
  const variant = scoreToVariant(overallScore)
  const color = variantToColor(variant)

  return (
    <div
      className={`rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-card p-5 space-y-4 ${className}`}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <ScoreBadge score={overallScore} size={40} />
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Gauge */}
        {showGauge && (
          <div className="flex-shrink-0">
            <HealthMeter score={overallScore} size={gaugeSize} showTicks />
          </div>
        )}

        {/* Rows */}
        <div className="flex-1 w-full space-y-3.5">
          {dimensions.map((dim) => (
            <HealthIndicatorRow
              key={dim.label}
              label={dim.label}
              score={dim.score}
              rawValue={dim.rawValue}
              icon={dim.icon}
              weight={dim.weight}
            />
          ))}
        </div>
      </div>

      {/* Footer grade bar */}
      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">Overall Grade</span>
        <span className="font-bold" style={{ color }}>
          {gradeToLabel(scoreToGrade(overallScore))}
        </span>
      </div>
    </div>
  )
}
