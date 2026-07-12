import React from 'react'

interface PageLoaderProps {
  /** If true, makes the loader take up the entire viewport */
  fullScreen?: boolean
  /** Optional custom message shown under the spinner */
  message?: string
}

/**
 * PageLoader — A premium, animated loading indicator matching the SmartWiFi AI aesthetic.
 * Includes a smooth rotating dual-ring gradient spinner and fading text.
 */
export function PageLoader({
  fullScreen = false,
  message = 'Loading system parameters...'
}: PageLoaderProps): React.JSX.Element {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4 transition-all duration-300
        ${fullScreen ? 'fixed inset-0 z-50 h-screen w-screen bg-[var(--bg-app)]' : 'h-full w-full min-h-[300px] bg-transparent'}
      `.trim()}
    >
      {/* Outer Glow & Spinner Container */}
      <div className="relative flex items-center justify-center">
        {/* Animated glowing backdrop */}
        <div className="absolute w-16 h-16 rounded-full bg-primary-500/10 dark:bg-primary-400/5 blur-xl animate-pulse-soft" />

        {/* Double-ring gradient spinner */}
        <div className="relative w-12 h-12">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-solid border-primary-500/20 dark:border-primary-400/10" />
          <div className="absolute inset-0 rounded-full border-4 border-solid border-t-primary-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />

          {/* Inner reverse-spinning ring */}
          <div className="absolute inset-1.5 rounded-full border-4 border-solid border-accent-500/10" />
          <div className="absolute inset-1.5 rounded-full border-4 border-solid border-b-accent-500 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:1.2s] [animation-direction:reverse]" />
        </div>
      </div>

      {/* Message */}
      {message && (
        <p className="text-xs font-medium tracking-wide text-[var(--text-secondary)] animate-pulse-soft max-w-[200px] text-center select-none">
          {message}
        </p>
      )}
    </div>
  )
}
