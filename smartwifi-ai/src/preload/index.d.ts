import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      detectAdapter: () => Promise<{
        name: string
        description: string
        physicalAddress: string
        state: string
        ssid: string
        bssid: string
        radioType: string
        authentication: string
        cipher: string
        channel: number
        receiveRate: number
        transmitRate: number
        signal: number
        isSimulated: boolean
      }>
      scanNetworks: () => Promise<
        Array<{
          ssid: string
          signal: number
          channel: number
          security: string
          bssid: string
        }>
      >
    }
  }
}
