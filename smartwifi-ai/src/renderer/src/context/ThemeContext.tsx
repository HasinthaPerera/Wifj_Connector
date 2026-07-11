/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Theme, AccentColor } from '@/types'

/* ─────────────────────────────────────────────────────────────
   Context shape
───────────────────────────────────────────────────────────── */

interface ThemeContextValue {
  /** The user-selected theme preference (may be 'system') */
  theme: Theme
  /** The resolved light/dark value actually applied to the DOM */
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  /** Cycles resolved theme between light and dark (ignores 'system' preference) */
  toggleTheme: () => void
  /** Currently active accent color */
  accentColor: AccentColor
  setAccentColor: (color: AccentColor) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

/* ─────────────────────────────────────────────────────────────
   Storage helpers
───────────────────────────────────────────────────────────── */

const THEME_KEY = 'smartwifi-theme'
const ACCENT_KEY = 'smartwifi-accent'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable
  }
  return 'dark'
}

function getStoredAccent(): AccentColor {
  try {
    const stored = localStorage.getItem(ACCENT_KEY)
    const valid: AccentColor[] = [
      'indigo',
      'violet',
      'sky',
      'emerald',
      'rose',
      'amber',
      'cyan',
      'fuchsia'
    ]
    if (stored && valid.includes(stored as AccentColor)) return stored as AccentColor
  } catch {
    // localStorage unavailable
  }
  return 'indigo'
}

/* ─────────────────────────────────────────────────────────────
   Provider
───────────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)
  const [accentColor, setAccentState] = useState<AccentColor>(getStoredAccent)

  // Track OS theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Derived resolved theme
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  // Sync accent color via data attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor)
  }, [accentColor])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_KEY, newTheme)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentState(color)
    try {
      localStorage.setItem(ACCENT_KEY, color)
    } catch {
      // localStorage unavailable
    }
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme, accentColor, setAccentColor }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

/* ─────────────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────────────── */

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
