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
      getNetworkConfig: () => Promise<
        Array<{
          name: string
          description: string
          macAddress: string
          ipAddress: string
          subnetMask: string
          gateway: string
          dnsServers: string[]
          dhcpServer: string
          leaseObtained: string
          leaseExpires: string
          type: 'wifi' | 'ethernet' | 'loopback' | 'other'
          status: 'connected' | 'disconnected'
          isDhcpEnabled: boolean
          isSimulated?: boolean
        }>
      >
      getPublicIp: () => Promise<{
        ip: string
        isp: string
        location: string
        countryCode: string
        isSimulated?: boolean
      }>
      scanProcesses: () => Promise<
        Array<{
          pid: number
          name: string
          connections: Array<{
            localAddress: string
            localPort: number
            remoteAddress: string
            remotePort: number
            state: string
            protocol: 'TCP' | 'UDP'
          }>
          connectionCount: number
          estimatedKbps: number
          category: 'browser' | 'system' | 'media' | 'security' | 'development' | 'game' | 'other'
          isSimulated: boolean
        }>
      >
      getResources: () => Promise<{
        timestamp: string
        cpuPercent: number
        ramUsedMb: number
        ramTotalMb: number
        ramPercent: number
        cpuCores: number
        cpuModel: string
        diskReadKbps: number
        diskWriteKbps: number
        network: Array<{
          name: string
          rxBytes: number
          txBytes: number
          rxKbps: number
          txKbps: number
        }>
        platform: string
        uptimeSeconds: number
        isSimulated: boolean
      }>
      db: {
        getSpeedTests: () => Promise<
          Array<{
            id: number
            timestamp: string
            downloadMbps: number
            uploadMbps: number
            pingMs: number
            jitterMs: number
            server: string
          }>
        >
        insertSpeedTest: (result: {
          timestamp: string
          downloadMbps: number
          uploadMbps: number
          pingMs: number
          jitterMs: number
          server: string
        }) => Promise<number>
        clearSpeedTests: () => Promise<void>
        deleteSpeedTest: (id: number) => Promise<void>
      }
      exportCsv: (content: string) => Promise<boolean>
      exportPdf: () => Promise<boolean>
    }
  }
}
