/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react'

export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
  testedAt: Date
}

interface SpeedTestContextValue {
  lastResult: SpeedTestResult | null
  setLastResult: (result: SpeedTestResult) => void
  clearResult: () => void
}

const SpeedTestContext = createContext<SpeedTestContextValue | undefined>(undefined)

/**
 * SpeedTestProvider — Stores the most-recent completed speed test result globally
 * so the Dashboard and other pages can display real measured bandwidth values.
 */
export function SpeedTestProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [lastResult, setLastResultState] = useState<SpeedTestResult | null>(null)

  const setLastResult = useCallback((result: SpeedTestResult) => {
    setLastResultState(result)
  }, [])

  const clearResult = useCallback(() => {
    setLastResultState(null)
  }, [])

  return (
    <SpeedTestContext.Provider value={{ lastResult, setLastResult, clearResult }}>
      {children}
    </SpeedTestContext.Provider>
  )
}

/**
 * useSpeedTest — Context hook to read and update global speed test results.
 */
export function useSpeedTest(): SpeedTestContextValue {
  const context = useContext(SpeedTestContext)
  if (!context) {
    throw new Error('useSpeedTest must be used within a SpeedTestProvider')
  }
  return context
}
