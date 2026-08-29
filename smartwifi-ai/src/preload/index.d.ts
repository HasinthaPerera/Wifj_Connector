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
      reconnectWifi: (
        interfaceName?: string,
        ssid?: string
      ) => Promise<{
        success: boolean
        message: string
        output: string
        interfaceName: string
        ssid: string
        timestamp: string
        isSimulated: boolean
      }>
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
      runNativeSpeedTest: () => Promise<{
        pingMs: number
        jitterMs: number
        downloadMbps: number
        uploadMbps: number
        server: string
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
      optimization: {
        flushDns: () => Promise<{
          success: boolean
          message: string
          output?: string
          timestamp: string
        }>
        releaseLease: () => Promise<{
          success: boolean
          message: string
          output?: string
          timestamp: string
        }>
        renewLease: () => Promise<{
          success: boolean
          message: string
          output?: string
          timestamp: string
        }>
        resetTcpStack: () => Promise<{
          success: boolean
          message: string
          output?: string
          timestamp: string
        }>
        benchmarkDns: () => Promise<
          Array<{
            id: string
            name: string
            primaryDns: string
            secondaryDns: string
            latencyMs: number
            status: 'fast' | 'average' | 'slow'
          }>
        >
        autoOptimize: (preset?: 'gaming' | 'streaming' | 'work' | 'balanced') => Promise<{
          preset: string
          scoreBefore: number
          scoreAfter: number
          latencyBeforeMs: number
          latencyAfterMs: number
          appliedActions: string[]
          timestamp: string
          isSimulated: boolean
        }>
        resolveDomain: (domain: string) => Promise<{
          domain: string
          addresses: string[]
          latencyMs: number
          resolver: string
          timestamp: string
          success: boolean
          error?: string
        }>
        resetNetwork: (options?: {
          resetWinsock?: boolean
          resetTcpIp?: boolean
          flushDns?: boolean
          clearArp?: boolean
          renewDhcp?: boolean
        }) => Promise<{
          success: boolean
          timestamp: string
          stepsExecuted: Array<{ step: string; success: boolean; output: string }>
          combinedOutput: string
          rebootRecommended: boolean
          isSimulated: boolean
        }>
      }
      exportCsv: (content: string) => Promise<boolean>
      exportPdf: () => Promise<boolean>
    }
  }
}
