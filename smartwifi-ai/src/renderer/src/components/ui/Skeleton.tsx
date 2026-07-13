import React from 'react'

interface SkeletonProps {
  /** Shape type: 'text' | 'circle' | 'rectangle' */
  variant?: 'text' | 'circle' | 'rectangle'
  /** Width, e.g., '100%', '4rem', etc. */
  width?: string | number
  /** Height, e.g., '1rem', '2rem', etc. */
  height?: string | number
  /** Custom class names to append */
  className?: string
  /** Animation style: 'pulse' | 'shimmer' | 'none' */
  animation?: 'pulse' | 'shimmer' | 'none'
}

/**
 * Skeleton — A premium placeholder loading component.
 * Supports pulse or shimmer animations and different shapes (text lines, circular avatars, rectangular cards).
 */
export function Skeleton({
  variant = 'rectangle',
  width,
  height,
  className = '',
  animation = 'shimmer'
}: SkeletonProps): React.JSX.Element {
  const shapeClass =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded h-3 w-3/4' : 'rounded-lg'

  const animClass =
    animation === 'shimmer'
      ? 'bg-gradient-to-r from-surface-200 via-surface-300 to-surface-200 dark:from-surface-800 dark:via-surface-700 dark:to-surface-800 bg-[length:200%_100%] animate-shimmer'
      : animation === 'pulse'
        ? 'bg-surface-200 dark:bg-surface-800 animate-pulse-soft'
        : 'bg-surface-200 dark:bg-surface-800'

  const style: React.CSSProperties = {}
  if (width !== undefined) style.width = width
  if (height !== undefined) style.height = height

  return (
    <div
      className={`
        inline-block w-full min-h-[1em] select-none pointer-events-none
        ${shapeClass}
        ${animClass}
        ${className}
      `.trim()}
      style={style}
      aria-hidden="true"
    />
  )
}

/* ─────────────────────────────────────────────────────────────
   Premium Preset Skeletons
───────────────────────────────────────────────────────────── */

interface SkeletonCardProps {
  /** Number of body rows to render inside the card skeleton */
  rows?: number
  className?: string
}

/**
 * SkeletonCard — Pre-configured layout for mock data cards.
 */
export function SkeletonCard({ rows = 3, className = '' }: SkeletonCardProps): React.JSX.Element {
  return (
    <div
      className={`p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-card space-y-4 ${className}`.trim()}
    >
      {/* Header Row */}
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="2.25rem" height="2.25rem" />
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="text" width="40%" height="0.875rem" />
          <Skeleton variant="text" width="60%" height="0.75rem" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-color)]" />

      {/* Body Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <Skeleton variant="text" width="30%" height="0.75rem" />
            <Skeleton variant="text" width="20%" height="0.75rem" />
          </div>
        ))}
      </div>
    </div>
  )
}

interface SkeletonTableProps {
  columns?: number
  rows?: number
  className?: string
}

/**
 * SkeletonTable — Pre-configured structure representing standard data tables.
 */
export function SkeletonTable({
  columns = 4,
  rows = 5,
  className = ''
}: SkeletonTableProps): React.JSX.Element {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {/* Table Header */}
      <div className="flex gap-4 pb-2 border-b border-[var(--border-color)]">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            variant="text"
            width={`${80 / columns}%`}
            height="0.75rem"
            className="flex-1"
          />
        ))}
      </div>

      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex gap-4 py-2 border-b border-[var(--border-color)]/50 last:border-0 items-center"
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                variant="text"
                width={colIdx === 0 ? '40%' : `${80 / columns}%`}
                height="0.75rem"
                className="flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
