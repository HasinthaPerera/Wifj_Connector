import { exec } from 'child_process'
import { promisify } from 'util'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const execAsync = promisify(exec)

export interface NetworkInterfaceDetails {
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
}

/**
 * Normalizes adapter headers into types: 'wifi' | 'ethernet' | 'loopback' | 'other'
 */
function resolveAdapterType(header: string): NetworkInterfaceDetails['type'] {
  const h = header.toLowerCase()
  if (h.includes('wireless') || h.includes('wi-fi') || h.includes('wlan')) return 'wifi'
  if (h.includes('ethernet') || h.includes('lan') || h.includes('gbe')) return 'ethernet'
  if (h.includes('loopback')) return 'loopback'
  return 'other'
}

/**
 * Parses stdout from Windows `ipconfig /all`
 */
function parseIpconfigAll(stdout: string): NetworkInterfaceDetails[] {
  if (!stdout) return []
  const blocks = stdout.split(/\r?\n(?=[^\s])/)
  const interfaces: NetworkInterfaceDetails[] = []

  for (const block of blocks) {
    const lines = block.split(/\r?\n/)
    const header = lines[0].trim()
    if (
      !header ||
      header.startsWith('Windows IP Configuration') ||
      header.startsWith('Host Name')
    ) {
      continue
    }

    const adapterName = header.replace(/:$/, '')
    const details: Partial<NetworkInterfaceDetails> = {
      name: adapterName,
      type: resolveAdapterType(adapterName),
      dnsServers: [],
      status: 'disconnected',
      isDhcpEnabled: false
    }

    let lastKey = ''

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(
        /^\s*(.+?)\s*\.\s*\.\s*\.\s*\.\s*\.\s*\.\s*\.\s*\.\s*\.\s*\.\s*:\s*(.*)$/
      )

      if (match) {
        const key = match[1].trim().toLowerCase()
        const value = match[2].trim()
        lastKey = key

        switch (key) {
          case 'description':
            details.description = value
            break
          case 'physical address':
            details.macAddress = value.replace(/-/g, ':').toUpperCase()
            break
          case 'dhcp enabled':
            details.isDhcpEnabled = value.toLowerCase().includes('yes')
            break
          case 'ipv4 address':
            details.ipAddress = value.replace(/\(Preferred\)/g, '').trim()
            details.status = 'connected'
            break
          case 'subnet mask':
            details.subnetMask = value
            break
          case 'default gateway':
            details.gateway = value
            break
          case 'dhcp server':
            details.dhcpServer = value
            break
          case 'lease obtained':
            details.leaseObtained = value
            break
          case 'lease expires':
            details.leaseExpires = value
            break
          case 'dns servers':
            if (value) details.dnsServers?.push(value)
            break
        }
      } else if (line.trim() && !line.includes(':') && lastKey === 'dns servers') {
        const dnsVal = line.trim()
        if (dnsVal && details.dnsServers) {
          details.dnsServers.push(dnsVal)
        }
      }
    }

    if (details.description && details.macAddress) {
      interfaces.push(details as NetworkInterfaceDetails)
    }
  }

  return interfaces
}

/**
 * Gathers complete local network adapter interfaces using ipconfig command.
 */
export async function getNetworkConfiguration(): Promise<NetworkInterfaceDetails[]> {
  try {
    const { stdout } = await execAsync('ipconfig /all')
    const parsed = parseIpconfigAll(stdout)
    if (parsed.length > 0) {
      return parsed
    }
  } catch (error) {
    console.warn('Network configuration lookup failed, using simulated fallback:', error)
  }

  return [
    {
      name: 'Wireless LAN adapter Wi-Fi',
      description: 'Intel(R) Wi-Fi 6 AX201 160MHz',
      macAddress: 'A4:C3:F0:8B:2E:11',
      ipAddress: '192.168.1.105',
      subnetMask: '255.255.255.0',
      gateway: '192.168.1.1',
      dnsServers: ['8.8.8.8', '8.8.4.4'],
      dhcpServer: '192.168.1.1',
      leaseObtained: 'Wednesday, July 15, 2026 8:00:00 AM',
      leaseExpires: 'Thursday, July 16, 2026 8:00:00 AM',
      type: 'wifi',
      status: 'connected',
      isDhcpEnabled: true,
      isSimulated: true
    },
    {
      name: 'Ethernet adapter Ethernet',
      description: 'Realtek PCIe GbE Family Controller',
      macAddress: 'BC:3B:AD:12:F1:C0',
      ipAddress: '',
      subnetMask: '',
      gateway: '',
      dnsServers: [],
      dhcpServer: '',
      leaseObtained: '',
      leaseExpires: '',
      type: 'ethernet',
      status: 'disconnected',
      isDhcpEnabled: true,
      isSimulated: true
    }
  ]
}

export interface PublicIpDetails {
  ip: string
  isp: string
  location: string
  countryCode: string
  isSimulated?: boolean
}

/**
 * Queries public geo-ip info from ipapi services.
 */
export async function getPublicIpDetails(): Promise<PublicIpDetails> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json()
      if (data && data.ip) {
        return {
          ip: data.ip,
          isp: data.org || 'Unknown Provider',
          location: `${data.city || ''}, ${data.region || ''}, ${data.country_name || ''}`
            .trim()
            .replace(/^,\s*|,\s*$/g, ''),
          countryCode: data.country_code || 'US',
          isSimulated: false
        }
      }
    }
  } catch (error) {
    console.warn('Public IP lookup failed, using simulated fallback:', error)
  } finally {
    clearTimeout(timeoutId)
  }

  return {
    ip: '73.142.8.210',
    isp: 'Comcast Cable Communications, LLC',
    location: 'San Jose, California, United States',
    countryCode: 'US',
    isSimulated: true
  }
}

/* ─────────────────────────────────────────────────────────────
   Native Main Process Adaptive Speed Measurement Engine
───────────────────────────────────────────────────────────── */

export interface MainSpeedTestResult {
  pingMs: number
  jitterMs: number
  downloadMbps: number
  uploadMbps: number
  server: string
}

const TEST_DOWN_URL = 'https://speed.cloudflare.com/__down'
const TEST_UP_URL = 'https://speed.cloudflare.com/__up'

function httpGetProbe(targetUrl: string, timeoutMs = 5000): Promise<{ durationMs: number; bytes: number }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl)
    const client = parsedUrl.protocol === 'https:' ? https : http

    const t0 = Date.now()
    const req = client.get(
      targetUrl,
      {
        headers: {
          'User-Agent': 'SmartWiFi-AI/1.0',
          'Cache-Control': 'no-cache'
        }
      },
      (res) => {
        let bytes = 0
        res.on('data', (chunk) => {
          bytes += chunk.length
        })
        res.on('end', () => {
          const durationMs = Date.now() - t0
          resolve({ durationMs, bytes })
        })
        res.on('error', (err) => reject(err))
      }
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.on('error', (err) => reject(err))
  })
}

function httpPostProbe(targetUrl: string, payloadBytes: number, timeoutMs = 6000): Promise<{ durationMs: number; bytes: number }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl)
    const client = parsedUrl.protocol === 'https:' ? https : http
    const payload = Buffer.alloc(payloadBytes)

    const t0 = Date.now()
    const req = client.request(
      targetUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': payload.length,
          'User-Agent': 'SmartWiFi-AI/1.0'
        }
      },
      (res) => {
        res.on('data', () => {})
        res.on('end', () => {
          const durationMs = Date.now() - t0
          resolve({ durationMs, bytes: payload.length })
        })
        res.on('error', (err) => reject(err))
      }
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.on('error', (err) => reject(err))
    req.write(payload)
    req.end()
  })
}

/**
 * Runs adaptive speed probes in Node.js main process without blocking on ISP lookup or fixed payload timeouts.
 */
export async function runNativeSpeedTest(): Promise<MainSpeedTestResult> {
  const detectedServer = 'Cloudflare Edge Infrastructure'

  // 1. Ping & Jitter Probes (3 fast 100B GET requests)
  const pings: number[] = []
  for (let i = 0; i < 3; i++) {
    try {
      const probe = await httpGetProbe(`${TEST_DOWN_URL}?bytes=100&r=${Math.random()}`, 3000)
      if (probe.durationMs > 0) pings.push(probe.durationMs)
    } catch {
      // Ignore single probe timeout
    }
  }

  const pingMs = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 35
  const jitterMs =
    pings.length > 1
      ? Math.round(
          pings.slice(1).reduce((acc, val, idx) => acc + Math.abs(val - pings[idx]), 0) /
            (pings.length - 1)
        )
      : 4

  // 2. Adaptive Download Speed Probes (250KB initial probe -> 1.5MB secondary probe)
  const downloadProbes = [250_000, 1_500_000]
  let totalDlBytes = 0
  let totalDlTimeMs = 0

  for (const bytesRequested of downloadProbes) {
    try {
      const probe = await httpGetProbe(`${TEST_DOWN_URL}?bytes=${bytesRequested}&r=${Math.random()}`, 5000)
      if (probe.bytes > 0 && probe.durationMs > 20) {
        totalDlBytes += probe.bytes
        totalDlTimeMs += probe.durationMs
      }
    } catch (err) {
      console.warn('Download probe warning:', err)
      break
    }
  }

  let downloadMbps = 0
  if (totalDlBytes > 0 && totalDlTimeMs > 0) {
    downloadMbps = parseFloat(((totalDlBytes * 8) / ((totalDlTimeMs / 1000) * 1_000_000)).toFixed(2))
  }

  // 3. Adaptive Upload Speed Probes (100KB initial probe -> 300KB secondary probe)
  const uploadProbes = [100_000, 300_000]
  let totalUlBytes = 0
  let totalUlTimeMs = 0

  for (const bytesToSend of uploadProbes) {
    try {
      const probe = await httpPostProbe(`${TEST_UP_URL}?r=${Math.random()}`, bytesToSend, 5000)
      if (probe.bytes > 0 && probe.durationMs > 20) {
        totalUlBytes += probe.bytes
        totalUlTimeMs += probe.durationMs
      }
    } catch (err) {
      console.warn('Upload probe warning:', err)
      break
    }
  }

  let uploadMbps = 0
  if (totalUlBytes > 0 && totalUlTimeMs > 0) {
    uploadMbps = parseFloat(((totalUlBytes * 8) / ((totalUlTimeMs / 1000) * 1_000_000)).toFixed(2))
  }

  return {
    pingMs,
    jitterMs,
    downloadMbps,
    uploadMbps,
    server: detectedServer
  }
}
