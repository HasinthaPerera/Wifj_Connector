import { useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, Check, Palette, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { ACCENT_COLORS } from '@/types'
import type { Theme, AccentColor } from '@/types'

/* ─────────────────────────────────────────────────────────────
   Sub-component: ModeCard
   A selectable card for Light / Dark / System theme modes
───────────────────────────────────────────────────────────── */

interface ModeCardProps {
  id: Theme
  label: string
  icon: React.ReactNode
  preview: React.ReactNode
  isActive: boolean
  onClick: () => void
}

function ModeCard({
  id,
  label,
  icon,
  preview,
  isActive,
  onClick
}: ModeCardProps): React.JSX.Element {
  return (
    <button
      id={`theme-mode-${id}`}
      onClick={onClick}
      aria-pressed={isActive}
      className={`
        relative flex flex-col gap-2 p-3 rounded-xl border-2 cursor-pointer
        transition-all duration-200 text-left w-full
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        ${
          isActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 shadow-[0_0_0_1px_var(--color-primary-500)]'
            : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-primary-300 dark:hover:border-primary-700 hover:bg-surface-50 dark:hover:bg-surface-800/60'
        }
      `.trim()}
    >
      {/* Active check badge */}
      {isActive && (
        <span className="absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 shadow-sm">
          <Check size={9} className="text-white stroke-[3]" />
        </span>
      )}

      {/* Mini UI preview */}
      <div className="w-full h-14 rounded-lg overflow-hidden border border-[var(--border-color)] flex-shrink-0">
        {preview}
      </div>

      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <span
          className={`${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-[var(--text-secondary)]'}`}
        >
          {icon}
        </span>
        <span
          className={`text-xs font-semibold ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-[var(--text-primary)]'}`}
        >
          {label}
        </span>
      </div>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Mini preview thumbnails for each mode card
───────────────────────────────────────────────────────────── */

function LightPreview(): React.JSX.Element {
  return (
    <div className="w-full h-full bg-surface-50 flex gap-1 p-1.5">
      <div className="w-5 h-full rounded bg-white border border-surface-200 flex flex-col gap-1 p-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-surface-200"
            style={{ width: `${70 - i * 15}%` }}
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-3 rounded bg-white border border-surface-200" />
        <div className="flex-1 rounded bg-white border border-surface-200 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-indigo-400 opacity-70" />
        </div>
      </div>
    </div>
  )
}

function DarkPreview(): React.JSX.Element {
  return (
    <div className="w-full h-full bg-surface-950 flex gap-1 p-1.5">
      <div className="w-5 h-full rounded bg-surface-900 border border-surface-700 flex flex-col gap-1 p-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-surface-700"
            style={{ width: `${70 - i * 15}%` }}
          />
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-3 rounded bg-surface-900 border border-surface-700" />
        <div className="flex-1 rounded bg-surface-800 border border-surface-700 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-indigo-500 opacity-70" />
        </div>
      </div>
    </div>
  )
}

function SystemPreview(): React.JSX.Element {
  return (
    <div className="w-full h-full flex">
      <div className="w-1/2 h-full bg-surface-50 flex flex-col p-1.5 gap-1">
        <div className="h-2 rounded bg-white border border-surface-200" />
        <div className="flex-1 rounded bg-surface-100 border border-surface-200" />
      </div>
      <div className="w-1/2 h-full bg-surface-900 flex flex-col p-1.5 gap-1">
        <div className="h-2 rounded bg-surface-800 border border-surface-700" />
        <div className="flex-1 rounded bg-surface-800 border border-surface-700" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sub-component: AccentSwatch
───────────────────────────────────────────────────────────── */

interface AccentSwatchProps {
  color: (typeof ACCENT_COLORS)[number]
  isActive: boolean
  resolvedTheme: 'light' | 'dark'
  onClick: () => void
}

function AccentSwatch({
  color,
  isActive,
  resolvedTheme,
  onClick
}: AccentSwatchProps): React.JSX.Element {
  const hex = resolvedTheme === 'dark' ? color.darkHex : color.hex

  return (
    <button
      id={`accent-swatch-${color.id}`}
      onClick={onClick}
      aria-label={`Set accent color to ${color.label}`}
      aria-pressed={isActive}
      title={color.label}
      className={`
        relative w-8 h-8 rounded-full cursor-pointer
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]
        ${isActive ? 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-card)]' : 'hover:scale-110 hover:shadow-md'}
      `.trim()}
      style={{
        backgroundColor: hex,
        // ring color matches the swatch
        ...(isActive ? { boxShadow: `0 0 0 2px var(--bg-card), 0 0 0 4px ${hex}` } : {})
      }}
    >
      {isActive && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Check size={13} className="text-white stroke-[3] drop-shadow" />
        </span>
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   Sub-component: LivePreviewStrip
   Shows how the active accent looks across typical UI elements
───────────────────────────────────────────────────────────── */

function LivePreviewStrip(): React.JSX.Element {
  return (
    <div
      className="
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        bg-[var(--bg-app)] border border-[var(--border-color)]
      "
      aria-label="Live theme preview"
    >
      {/* Badge */}
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 flex-shrink-0">
        Primary
      </span>

      {/* Mini button */}
      <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-primary-600 text-white flex-shrink-0 select-none">
        Button
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-primary-100 dark:bg-primary-950 overflow-hidden min-w-0">
        <div className="h-full w-2/3 rounded-full bg-primary-500 transition-all duration-500" />
      </div>

      {/* Dot */}
      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0" />

      {/* Link-style text */}
      <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400 flex-shrink-0 truncate">
        Accent text
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main ThemeManagerPanel – inline variant (for SettingsPage)
───────────────────────────────────────────────────────────── */

export interface ThemeManagerPanelProps {
  /** When true the panel fills its container without extra card chrome */
  inline?: boolean
}

export function ThemeManagerPanel({ inline = false }: ThemeManagerPanelProps): React.JSX.Element {
  const { theme, resolvedTheme, setTheme, accentColor, setAccentColor } = useTheme()

  const modes: { id: Theme; label: string; icon: React.ReactNode; preview: React.ReactNode }[] = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun size={13} />,
      preview: <LightPreview />
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon size={13} />,
      preview: <DarkPreview />
    },
    {
      id: 'system',
      label: 'System',
      icon: <Monitor size={13} />,
      preview: <SystemPreview />
    }
  ]

  return (
    <div className={inline ? '' : 'p-1'}>
      {/* ── Mode selector ─────────────────────────────────── */}
      <section aria-label="Theme mode">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
          Mode
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {modes.map((m) => (
            <ModeCard
              key={m.id}
              id={m.id}
              label={m.label}
              icon={m.icon}
              preview={m.preview}
              isActive={theme === m.id}
              onClick={() => setTheme(m.id)}
            />
          ))}
        </div>
      </section>

      <div className="my-4 border-t border-[var(--border-color)]" />

      {/* ── Accent colour picker ───────────────────────────── */}
      <section aria-label="Accent color">
        <div className="flex items-center gap-2 mb-2.5">
          <Palette size={13} className="text-[var(--text-muted)]" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Accent Colour
          </p>
          <span className="ml-auto text-[10px] font-medium text-primary-600 dark:text-primary-400 capitalize">
            {accentColor}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_COLORS.map((c) => (
            <AccentSwatch
              key={c.id}
              color={c}
              isActive={accentColor === c.id}
              resolvedTheme={resolvedTheme}
              onClick={() => setAccentColor(c.id as AccentColor)}
            />
          ))}
        </div>
      </section>

      <div className="my-4 border-t border-[var(--border-color)]" />

      {/* ── Live preview strip ─────────────────────────────── */}
      <section aria-label="Live preview">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2.5">
          Preview
        </p>
        <LivePreviewStrip />
      </section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ThemeManagerDropdown – floating panel variant (for TopBar)
   Renders a compact version as a dropdown anchored to a trigger
───────────────────────────────────────────────────────────── */

export interface ThemeManagerDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function ThemeManagerDropdown({
  isOpen,
  onClose
}: ThemeManagerDropdownProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)

  /* Close on outside click */
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent): void => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Theme manager"
      className="
        absolute top-full right-0 mt-2 w-[320px] z-50
        bg-[var(--bg-card)] border border-[var(--border-color)]
        rounded-2xl shadow-[var(--shadow-modal)]
        animate-slide-in-up overflow-hidden
      "
    >
      {/* Dropdown header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-primary-500" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Theme Manager</span>
        </div>
        <button
          onClick={onClose}
          className="
            p-1 rounded-md text-[var(--text-muted)]
            hover:text-[var(--text-primary)] hover:bg-surface-100 dark:hover:bg-surface-800
            transition-colors duration-150 cursor-pointer
          "
          aria-label="Close theme manager"
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel body */}
      <div className="px-4 py-4">
        <ThemeManagerPanel inline />
      </div>
    </div>
  )
}
