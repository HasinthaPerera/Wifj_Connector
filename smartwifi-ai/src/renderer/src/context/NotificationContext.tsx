/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AppNotification } from '@/types'

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  addNotification: (
    type: AppNotification['type'],
    title: string,
    message: string
  ) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-init-1',
    type: 'success',
    title: 'SmartWiFi AI Active',
    message: 'Real-time wireless telemetry and optimization engine running.',
    timestamp: Date.now() - 1000 * 60 * 2,
    read: false
  },
  {
    id: 'notif-init-2',
    type: 'info',
    title: 'Network Adapter Detected',
    message: 'Active interface monitoring initialized successfully.',
    timestamp: Date.now() - 1000 * 60 * 15,
    read: false
  }
]

export function NotificationProvider({
  children
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS)

  const addNotification = useCallback(
    (type: AppNotification['type'], title: string, message: string) => {
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false
      }
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
    },
    []
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Poll active Wi-Fi adapter state and push real alerts for real status changes
  useEffect(() => {
    let lastState = ''
    let lastSsid = ''
    let lastSignal = 0
    let isInitial = true

    const checkRealAdapterAlerts = async (): Promise<void> => {
      try {
        if (typeof window.api?.detectAdapter === 'function') {
          const details = await window.api.detectAdapter()
          if (!details) return

          const currentState = details.state || 'disconnected'
          const currentSsid = details.ssid || 'Offline'
          const currentSignal = details.signal || 0

          if (isInitial) {
            isInitial = false
            lastState = currentState
            lastSsid = currentSsid
            lastSignal = currentSignal

            if (currentState === 'connected' && currentSsid !== '[Not Connected]') {
              addNotification(
                'info',
                'Connected Network',
                `Associated with "${currentSsid}" (Signal Quality: ${currentSignal}%).`
              )
            }
            return
          }

          // Connection status changed
          if (currentState !== lastState || currentSsid !== lastSsid) {
            if (currentState === 'connected') {
              addNotification(
                'success',
                'Wi-Fi Re-associated',
                `Successfully connected to wireless network "${currentSsid}".`
              )
            } else {
              addNotification(
                'error',
                'Wi-Fi Disconnected',
                'Wireless adapter is disassociated from access point.'
              )
            }
            lastState = currentState
            lastSsid = currentSsid
          }

          // Signal drops significantly
          if (
            currentState === 'connected' &&
            currentSignal < 50 &&
            Math.abs(currentSignal - lastSignal) >= 15
          ) {
            addNotification(
              'warning',
              'Low Signal Strength',
              `Wireless signal dropped to ${currentSignal}%. Consider moving closer to AP.`
            )
          }

          lastSignal = currentSignal
        }
      } catch {
        // Fallback gracefully
      }
    }

    const interval = setInterval(checkRealAdapterAlerts, 5000)
    checkRealAdapterAlerts()

    return () => clearInterval(interval)
  }, [addNotification])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAllNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
