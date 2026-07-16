import { exec } from 'child_process'
import { promisify } from 'util'

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
  // Split into adapter blocks (non-indented header followed by indented details)
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
            // Strip (Preferred) or duplicate values
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
      } else if (line.trim() && !line.includes(':') && lastKey === 'dns-servers') {
        // Handle secondary DNS servers on subsequent lines
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
 * Falls back to high-quality simulated mock adapter parameters if command fails.
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

  // Fallback high-quality mock database
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
 * Yields high-quality simulated mock public ip details if lookup fails or goes offline.
 */
export async function getPublicIpDetails(): Promise<PublicIpDetails> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3500)

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

  // Fallback high-quality mock IP details
  return {
    ip: '73.142.8.210',
    isp: 'Comcast Cable Communications, LLC',
    location: 'San Jose, California, United States',
    countryCode: 'US',
    isSimulated: true
  }
}
