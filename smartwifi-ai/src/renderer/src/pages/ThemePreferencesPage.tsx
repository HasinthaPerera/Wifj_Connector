import React, { useState } from 'react'
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Sparkles,
  Sliders,
  Eye,
  RotateCcw,
  Zap,
  Activity
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/context'
import { Card, CardHeader, CardContent, Button, Badge } from '@/components/ui'
import { ACCENT_COLORS } from '@/types'
import type { Theme, AccentColor } from '@/types'

/* ─────────────────────────────────────────────────────────────
   Types & Interfaces
───────────────────────────────────────────────────────────── */

export type ContrastMode = 'standard' | 'high' | 'soft'
export type BlurIntensity = 'none' | 'low' | 'medium' | 'high'

/* ─────────────────────────────────────────────────────────────
   ThemePreferencesPage Component
───────────────────────────────────────────────────────────── */

export function ThemePreferencesPage(): React.JSX.Element {
  const { theme, resolvedTheme, setTheme, toggleTheme, accentColor, setAccentColor } = useTheme()
  const { showToast } = useToast()

  // Local Visual Preference States
  const [contrastMode, setContrastMode] = useState<ContrastMode>('standard')
  const [blurIntensity, setBlurIntensity] = useState<BlurIntensity>('medium')
  const [enableGlassmorphism, setEnableGlassmorphism] = useState(true)
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [fontSizeScale, setFontSizeScale] = useState<'normal' | 'large'>('normal')

  /* ── Mode Options ── */
  const modes: { id: Theme; title: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      id: 'dark',
      title: 'Sleek Dark Mode',
      subtitle:
        'Modern high-contrast dark palette tailored for low-light environments and OLED displays',
      icon: <Moon size={20} className="text-violet-400" />
    },
    {
      id: 'light',
      title: 'Vibrant Light Mode',
      subtitle:
        'Clean, high-visibility bright layout optimized for daytime work and sunlight reading',
      icon: <Sun size={20} className="text-amber-500" />
    },
    {
      id: 'system',
      title: 'Auto System Sync',
      subtitle: 'Automatically syncs with your operating system light/dark schedule',
      icon: <Monitor size={20} className="text-sky-400" />
    }
  ]

  /* ── Reset Handler ── */
  const handleResetTheme = (): void => {
    setTheme('dark')
    setAccentColor('indigo')
    setContrastMode('standard')
    setBlurIntensity('medium')
    setEnableGlassmorphism(true)
    setEnableAnimations(true)
    showToast('info', 'Theme Reset', 'Restored default Dark theme & Indigo accent.')
  }

  /* ── Mode Selection Handler ── */
  const handleModeSelect = (m: Theme): void => {
    setTheme(m)
    showToast('success', 'Theme Mode Updated', `Switched theme mode to ${m.toUpperCase()}.`)
  }

  /* ── Accent Color Selection Handler ── */
  const handleAccentSelect = (cId: AccentColor, name: string): void => {
    setAccentColor(cId)
    showToast('success', 'Accent Color Updated', `Applied ${name} color palette.`)
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Theme Preferences</h1>
            <Badge variant="accent" size="sm">
              Active: {resolvedTheme.toUpperCase()} / {accentColor.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Customize appearance modes, curated color swatches, glassmorphism density, contrast, and
            visual accents
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={handleResetTheme}
          >
            Reset Defaults
          </Button>

          <Button
            variant="primary"
            size="md"
            leftIcon={resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            onClick={toggleTheme}
          >
            Toggle {resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
        </div>
      </div>

      {/* ── 2. Appearance Mode Selection Grid (Light, Dark, System) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles size={16} className="text-primary-500" />
            Appearance Mode Selection
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Select your preferred color scheme mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((m) => {
            const isSelected = theme === m.id
            return (
              <div
                key={m.id}
                onClick={() => handleModeSelect(m.id)}
                className={`
                  p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3
                  ${
                    isSelected
                      ? 'bg-[var(--bg-card)] border-primary-500 shadow-md ring-2 ring-primary-500/20'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-primary-500/50'
                  }
                `.trim()}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800">
                      {m.icon}
                    </div>
                    {isSelected && (
                      <Badge variant="accent" size="sm">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">{m.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {m.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3. Curated Accent Color Swatches Palette ── */}
      <Card className="border-[var(--border-color)] shadow-card">
        <CardHeader
          title="Curated Accent Color Swatches"
          subtitle="Choose your primary brand accent color used for buttons, charts, badges, and progress indicators"
          icon={<Palette size={18} className="text-primary-500" />}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {ACCENT_COLORS.map((c) => {
              const isSelected = accentColor === c.id
              const hex = resolvedTheme === 'dark' ? c.darkHex : c.hex
              return (
                <div
                  key={c.id}
                  onClick={() => handleAccentSelect(c.id as AccentColor, c.label)}
                  className={`
                    p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col items-center gap-2 text-center
                    ${
                      isSelected
                        ? 'bg-surface-100 dark:bg-surface-800 border-primary-500 ring-2 ring-primary-500/20 scale-105 shadow-sm'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-primary-400 hover:scale-102'
                    }
                  `.trim()}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-transform"
                    style={{ backgroundColor: hex }}
                  >
                    {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] capitalize">
                    {c.label}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Main Visual Options & Live Showcase Grid (2 cols + 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Advanced Visual Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Advanced Visual & Density Tuning"
              subtitle="Adjust glassmorphism blur, contrast modes, micro-animations, and typography scaling"
              icon={<Sliders size={18} className="text-sky-500" />}
            />
            <CardContent className="space-y-4">
              {/* Option 1: Contrast Mode */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">Contrast Mode</h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Tune UI text contrast for improved legibility
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['standard', 'high', 'soft'] as ContrastMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setContrastMode(mode)}
                        className={`
                          px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer
                          ${
                            contrastMode === mode
                              ? 'bg-primary-500 text-white'
                              : 'bg-surface-100 dark:bg-surface-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }
                        `.trim()}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Option 2: Glassmorphism Backdrop Blur */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">
                      Glassmorphism Backdrop Blur
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Enable translucent cards and background blur effects
                    </p>
                  </div>
                  <button
                    onClick={() => setEnableGlassmorphism(!enableGlassmorphism)}
                    className={`
                      w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                      ${enableGlassmorphism ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                    `.trim()}
                  >
                    <span
                      className={`
                        w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                        ${enableGlassmorphism ? 'left-6' : 'left-1'}
                      `.trim()}
                    />
                  </button>
                </div>

                {enableGlassmorphism && (
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/40 text-xs">
                    <span className="text-[var(--text-muted)]">Blur Intensity:</span>
                    <div className="flex items-center gap-1.5">
                      {(['low', 'medium', 'high'] as BlurIntensity[]).map((b) => (
                        <button
                          key={b}
                          onClick={() => setBlurIntensity(b)}
                          className={`
                            px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition-all cursor-pointer
                            ${
                              blurIntensity === b
                                ? 'bg-accent-500 text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-[var(--text-secondary)]'
                            }
                          `.trim()}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Smooth Micro-animations */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Smooth Micro-Animations
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Enable hover transitions, pulsing status indicators, and smooth card reveals
                  </p>
                </div>
                <button
                  onClick={() => setEnableAnimations(!enableAnimations)}
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-200 relative cursor-pointer
                    ${enableAnimations ? 'bg-accent-500' : 'bg-surface-300 dark:bg-surface-700'}
                  `.trim()}
                >
                  <span
                    className={`
                      w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200
                      ${enableAnimations ? 'left-6' : 'left-1'}
                    `.trim()}
                  />
                </button>
              </div>

              {/* Option 4: Typography Scale */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-[var(--text-primary)]">
                    Typography Scaling
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Increase font size scale across titles and metric values
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFontSizeScale('normal')}
                    className={`
                      px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer
                      ${
                        fontSizeScale === 'normal'
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-100 dark:bg-surface-800 text-[var(--text-secondary)]'
                      }
                    `.trim()}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setFontSizeScale('large')}
                    className={`
                      px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer
                      ${
                        fontSizeScale === 'large'
                          ? 'bg-primary-500 text-white'
                          : 'bg-surface-100 dark:bg-surface-800 text-[var(--text-secondary)]'
                      }
                    `.trim()}
                  >
                    Large (+10%)
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1-Col: Live Real-time UI Components Showcase */}
        <div className="space-y-6">
          <Card className="border-[var(--border-color)] shadow-card">
            <CardHeader
              title="Live UI Components Showcase"
              subtitle="Real-time preview of buttons, badges, and progress meters"
              icon={<Eye size={18} className="text-emerald-500" />}
            />
            <CardContent className="space-y-4">
              {/* Showcase 1: Buttons */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Button Variants
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="primary" size="sm" leftIcon={<Zap size={14} />}>
                    Primary
                  </Button>
                  <Button variant="secondary" size="sm">
                    Secondary
                  </Button>
                  <Button variant="ghost" size="sm">
                    Ghost
                  </Button>
                </div>
              </div>

              {/* Showcase 2: Badges & Status */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Badges & Pills
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="accent" size="sm" dot>
                    Online
                  </Badge>
                  <Badge variant="primary" size="sm">
                    {accentColor.toUpperCase()}
                  </Badge>
                  <Badge variant="warning" size="sm">
                    Warning
                  </Badge>
                  <Badge variant="danger" size="sm">
                    Alert
                  </Badge>
                </div>
              </div>

              {/* Showcase 3: Progress & Metric Card */}
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-surface-50 dark:bg-surface-900 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-primary)] flex items-center gap-1.5">
                    <Activity size={14} className="text-primary-500" />
                    Network Capacity
                  </span>
                  <span className="text-primary-500 font-mono font-bold">88%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full w-[88%] rounded-full bg-primary-500 transition-all duration-300" />
                </div>
              </div>

              {/* Showcase 4: Theme Summary Box */}
              <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1 text-xs">
                <div className="flex items-center justify-between text-[var(--text-primary)] font-bold">
                  <span>Resolved Mode:</span>
                  <span className="capitalize text-accent-500">{resolvedTheme}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Accent Color:</span>
                  <span className="capitalize font-mono text-primary-500">{accentColor}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
