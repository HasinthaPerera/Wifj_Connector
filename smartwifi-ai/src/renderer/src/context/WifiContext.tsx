/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface WifiStatus {
  ssid: string
  signal: number
  state: string
  isConnected: boolean
  bssid: string
  channel: number
  isSimulated: boolean
  loading: boolean
}

interface WifiContextValue {
  status: WifiStatus
  refreshStatus: () => Promise<void>
  lastRefreshTime: number
}

const WifiContext = createContext<WifiContextValue | undefined>(undefined)

const INITIAL_STATUS: WifiStatus = {
  ssid: 'Scanning...',
  signal: 0,
  state: 'disconnected',
  isConnected: false,
  bssid: '',
  channel: 0,
  isSimulated: false,
  loading: true
}

/**
 * WifiProvider — Polls and serves global SSID, connection states, and adapter signal metrics.
 */
export function WifiProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<WifiStatus>(INITIAL_STATUS)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(() => Date.now())

  const refreshStatus = useCallback(async () => {
    try {
      const details = await window.api.detectAdapter()
      setStatus({
        ssid: details.state === 'connected' ? details.ssid : 'Offline',
        signal: details.signal,
        state: details.state,
        isConnected: details.state === 'connected',
        bssid: details.bssid,
        channel: details.channel,
        isSimulated: details.isSimulated,
        loading: false
      })
      setLastRefreshTime(Date.now())
    } catch (err) {
      console.error('Global SSID detection query failed:', err)
      setStatus((prev) => ({ ...prev, loading: false, isConnected: false, ssid: 'Unknown' }))
    }
  }, [])

  // Poll status every 4 seconds
  useEffect(() => {
    let active = true
    const poll = async (): Promise<void> => {
      try {
        const details = await window.api.detectAdapter()
        if (active) {
          setStatus({
            ssid: details.state === 'connected' ? details.ssid : 'Offline',
            signal: details.signal,
            state: details.state,
            isConnected: details.state === 'connected',
            bssid: details.bssid,
            channel: details.channel,
            isSimulated: details.isSimulated,
            loading: false
          })
        }
      } catch (err) {
        console.error('Global SSID detection query failed:', err)
        if (active) {
          setStatus((prev) => ({ ...prev, loading: false, isConnected: false, ssid: 'Unknown' }))
        }
      }
    }

    poll()
    const timer = setInterval(poll, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  return (
    <WifiContext.Provider value={{ status, refreshStatus, lastRefreshTime }}>
      {children}
    </WifiContext.Provider>
  )
}

/**
 * useWifi — Context hook to consume global wireless link status & SSID parameters.
 */
export function useWifi(): WifiContextValue {
  const context = useContext(WifiContext)
  if (!context) {
    throw new Error('useWifi must be used within a WifiProvider')
  }
  return context
}
