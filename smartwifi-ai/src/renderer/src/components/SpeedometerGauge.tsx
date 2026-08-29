import React from 'react'
import { formatSpeedUnit } from '@/utils/speedTestRunner'

interface SpeedometerGaugeProps {
  value: number // Live speed in Mbps
  maxMbps?: number // Scale maximum (default 500)
  phase: 'idle' | 'ping' | 'download' | 'upload' | 'completed'
  progress: number
  pingMs?: number
  jitterMs?: number
}

/**
 * Ookla-Style Circular Speedometer Gauge with sweeping needle,
 * glowing progress arc, dynamic tick marks, auto-unit formatting (Kbps / Mbps / Gbps),
 * and real-time phase indicator.
 */
export function SpeedometerGauge({
  value,
  maxMbps = 500,
  phase,
  progress
}: SpeedometerGaugeProps): React.JSX.Element {
  // Auto format unit (Kbps, Mbps, Gbps)
  const formatted = formatSpeedUnit(value)

  // Map value to gauge angle (-120deg to +120deg = 240deg total sweep)
  const normalizedSpeed = Math.min(Math.max(value, 0), maxMbps)

  // Logarithmic scale mapping so needle moves smoothly across all speeds
  const speedRatio =
    normalizedSpeed === 0
      ? 0
      : Math.min(1, Math.log10(1 + (normalizedSpeed / maxMbps) * 9))

  const angleDeg = -120 + speedRatio * 240

  // Gauge colors based on test phase
  const getPhaseColor = () => {
    switch (phase) {
      case 'ping':
        return '#eab308' // Amber
      case 'download':
        return '#10b981' // Emerald
      case 'upload':
        return '#06b6d4' // Cyan
      case 'completed':
        return '#6366f1' // Indigo
      default:
        return 'var(--text-muted)'
    }
  }

  const phaseColor = getPhaseColor()

  return (
    <div className="relative flex flex-col items-center justify-center py-4 select-none">
      <svg
        viewBox="0 0 300 240"
        className="w-64 h-52 sm:w-80 sm:h-64 drop-shadow-xl overflow-visible"
        aria-label="Speedometer Gauge"
      >
        <defs>
          {/* Active Speed Arc Gradient */}
          <linearGradient id="speedArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Decorative Dial Rim */}
        <circle
          cx="150"
          cy="150"
          r="124"
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Background Track Arc */}
        <path
          d="M 46.08 210 A 120 120 0 1 1 253.92 210"
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Active Measured Speed Arc */}
        <path
          d="M 46.08 210 A 120 120 0 1 1 253.92 210"
          fill="none"
          stroke="url(#speedArcGrad)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray="502.65"
          strokeDashoffset={502.65 * (1 - speedRatio)}
          className="transition-all duration-300 ease-out"
          filter="url(#needleGlow)"
        />

        {/* Scale Ticks & Numbers */}
        {[0, 10, 25, 50, 100, 250, 500].map((speedMark) => {
          const markRatio =
            speedMark === 0
              ? 0
              : Math.min(1, Math.log10(1 + (speedMark / maxMbps) * 9))
          const markAngleRad = ((-120 + markRatio * 240) * Math.PI) / 180 - Math.PI / 2
          const tickOuterR = 110
          const tickInnerR = 100
          const textR = 86

          const x1 = 150 + tickInnerR * Math.cos(markAngleRad)
          const y1 = 150 + tickInnerR * Math.sin(markAngleRad)
          const x2 = 150 + tickOuterR * Math.cos(markAngleRad)
          const y2 = 150 + tickOuterR * Math.sin(markAngleRad)

          const tx = 150 + textR * Math.cos(markAngleRad)
          const ty = 150 + textR * Math.sin(markAngleRad)

          return (
            <g key={speedMark}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--text-muted)"
                strokeWidth="2"
                opacity="0.7"
              />
              <text
                x={tx}
                y={ty + 4}
                fill="var(--text-muted)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                className="font-mono select-none"
              >
                {speedMark}
              </text>
            </g>
          )
        })}

        {/* Center Hub */}
        <circle cx="150" cy="150" r="14" fill="#0f172a" stroke={phaseColor} strokeWidth="3" />
        <circle cx="150" cy="150" r="6" fill={phaseColor} />

        {/* Dynamic Sweeping Needle */}
        <g
          style={{
            transform: `rotate(${angleDeg}deg)`,
            transformOrigin: '150px 150px',
            transition: 'transform 180ms cubic-bezier(0.1, 0.9, 0.2, 1.0)'
          }}
          filter="url(#needleGlow)"
        >
          <polygon points="146,150 154,150 151,46 149,46" fill={phaseColor} />
          <circle cx="150" cy="45" r="3" fill="#ffffff" />
        </g>

        {/* Live Digital Display with Auto-Unit Formatting */}
        <text
          x="150"
          y="188"
          fill="var(--text-primary)"
          fontSize="36"
          fontWeight="900"
          textAnchor="middle"
          className="font-mono tracking-tight"
        >
          {formatted.value}
        </text>
        <text
          x="150"
          y="206"
          fill="var(--text-muted)"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          className="uppercase tracking-widest"
        >
          {formatted.unit}
        </text>
      </svg>

      {/* Dynamic Status / Phase Badge */}
      <div className="mt-1 flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full animate-ping"
          style={{ backgroundColor: phaseColor }}
        />
        <span
          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border border-[var(--border-color)]"
          style={{ color: phaseColor, backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          {phase === 'idle' && 'Ready to Test'}
          {phase === 'ping' && `Measuring Ping Latency... (${progress}%)`}
          {phase === 'download' && `Testing Download Speed... (${progress}%)`}
          {phase === 'upload' && `Testing Upload Speed... (${progress}%)`}
          {phase === 'completed' && 'Test Complete'}
        </span>
      </div>
    </div>
  )
}
