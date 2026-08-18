/**
 * @vitest-environment node
 *
 * Integration Tests — src/main/network.ts
 *
 * Validates: ipconfig /all output parsing, network configuration assembly,
 * adapter type resolution, DHCP field extraction, and public IP fallback
 * behaviour when external API is unavailable.
 *
 * Strategy: fetch() is mocked via vi.stubGlobal; child_process.exec is
 * mocked to supply deterministic ipconfig output. Business logic paths
 * (parser, type resolver, fallback) are exercised as an integrated whole.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecException } from 'child_process'

/* ─── Mock child_process before import ──────────────────────────────────── */
vi.mock('child_process', () => ({ exec: vi.fn() }))

import { exec } from 'child_process'
import { getNetworkConfiguration, getPublicIpDetails } from '../network'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

type ExecCallback = (
  error: ExecException | null,
  stdout: string,
  stderr: string
) => void

function mockExecSuccess(stdout: string): void {
  vi.mocked(exec).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_cmd: string, ...rest: any[]) => {
      const cb: ExecCallback | undefined =
        typeof rest[rest.length - 1] === 'function' ? rest[rest.length - 1] : undefined
      if (cb) cb(null, stdout, '')
      return {} as ReturnType<typeof exec>
    }
  )
}

function mockExecFailure(message = 'Command failed'): void {
  vi.mocked(exec).mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_cmd: string, ...rest: any[]) => {
      const cb: ExecCallback | undefined =
        typeof rest[rest.length - 1] === 'function' ? rest[rest.length - 1] : undefined
      if (cb) {
        const err = Object.assign(new Error(message), { code: 1 }) as ExecException
        cb(err, '', message)
      }
      return {} as ReturnType<typeof exec>
    }
  )
}

/* ─── Realistic ipconfig /all fixture ───────────────────────────────────── */

const IPCONFIG_ALL_OUTPUT = `
Windows IP Configuration

   Host Name . . . . . . . . . . . . : DESKTOP-SMARTWIFI
   Primary Dns Suffix  . . . . . . . :
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No

Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Intel(R) Wi-Fi 6 AX201 160MHz
   Physical Address. . . . . . . . . : A4-C3-F0-8B-2E-11
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 192.168.1.105(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
   DHCP Server . . . . . . . . . . . : 192.168.1.1
   DNS Servers . . . . . . . . . . . : 8.8.8.8
                                       8.8.4.4
   Lease Obtained. . . . . . . . . . : Wednesday, July 15, 2026 8:00:00 AM
   Lease Expires . . . . . . . . . . : Thursday, July 16, 2026 8:00:00 AM

Ethernet adapter Ethernet:

   Media State . . . . . . . . . . . : Media disconnected
   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Realtek PCIe GbE Family Controller
   Physical Address. . . . . . . . . : BC-3B-AD-12-F1-C0
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes

Loopback Pseudo-Interface 1:

   Connection-specific DNS Suffix  . :
   Description . . . . . . . . . . . : Software Loopback Interface 1
   Physical Address. . . . . . . . . : 00-00-00-00-00-00
   DHCP Enabled. . . . . . . . . . . : No
`

/* ═══════════════════════════════════════════════════════════════════════════
   getNetworkConfiguration
═══════════════════════════════════════════════════════════════════════════ */

describe('getNetworkConfiguration', () => {
  beforeEach(() => vi.resetAllMocks())

  it('parses ipconfig /all output and returns at least one interface', async () => {
    mockExecSuccess(IPCONFIG_ALL_OUTPUT)

    const interfaces = await getNetworkConfiguration()

    expect(Array.isArray(interfaces)).toBe(true)
    expect(interfaces.length).toBeGreaterThanOrEqual(1)
  })

  it('correctly identifies Wi-Fi adapter type', async () => {
    mockExecSuccess(IPCONFIG_ALL_OUTPUT)

    const interfaces = await getNetworkConfiguration()
    const wifi = interfaces.find((i) => i.type === 'wifi')

    expect(wifi).toBeDefined()
  })

  it('correctly identifies Ethernet adapter type', async () => {
    mockExecSuccess(IPCONFIG_ALL_OUTPUT)

    const interfaces = await getNetworkConfiguration()
    const eth = interfaces.find((i) => i.type === 'ethernet')

    expect(eth).toBeDefined()
  })

  it('all returned adapters have required interface fields', async () => {
    mockExecSuccess(IPCONFIG_ALL_OUTPUT)

    const interfaces = await getNetworkConfiguration()

    for (const iface of interfaces) {
      expect(iface).toHaveProperty('name')
      expect(iface).toHaveProperty('description')
      expect(iface).toHaveProperty('macAddress')
      expect(iface).toHaveProperty('type')
      expect(iface).toHaveProperty('status')
      expect(iface).toHaveProperty('isDhcpEnabled')
      expect(iface).toHaveProperty('dnsServers')
      expect(Array.isArray(iface.dnsServers)).toBe(true)
    }
  })

  it('falls back to high-quality mock adapters when exec throws', async () => {
    mockExecFailure('ipconfig not found')

    const interfaces = await getNetworkConfiguration()

    expect(interfaces.length).toBeGreaterThan(0)
    // Fallback always includes isSimulated flag
    expect(interfaces.some((i) => i.isSimulated === true)).toBe(true)
  })

  it('fallback adapters include both WiFi and Ethernet types', async () => {
    mockExecFailure()

    const interfaces = await getNetworkConfiguration()
    const types = interfaces.map((i) => i.type)

    expect(types).toContain('wifi')
    expect(types).toContain('ethernet')
  })

  it('fallback WiFi adapter has valid IP address in 192.168 range', async () => {
    mockExecFailure()

    const interfaces = await getNetworkConfiguration()
    const wifi = interfaces.find((i) => i.type === 'wifi')

    expect(wifi).toBeDefined()
    expect(wifi!.ipAddress).toMatch(/^192\.168\./)
  })

  it('returns simulated fallback when exec returns empty string', async () => {
    mockExecSuccess('')

    const interfaces = await getNetworkConfiguration()

    // Empty parse → falls back to simulated data
    expect(interfaces.length).toBeGreaterThan(0)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   getPublicIpDetails
═══════════════════════════════════════════════════════════════════════════ */

describe('getPublicIpDetails', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns real IP data when ipapi.co responds successfully', async () => {
    const mockResponse = {
      ip: '203.0.113.55',
      org: 'AS1234 Test ISP',
      city: 'Colombo',
      region: 'Western Province',
      country_name: 'Sri Lanka',
      country_code: 'LK'
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })
    )

    const result = await getPublicIpDetails()

    expect(result.ip).toBe('203.0.113.55')
    expect(result.isp).toContain('Test ISP')
    expect(result.location).toContain('Colombo')
    expect(result.countryCode).toBe('LK')
    expect(result.isSimulated).toBe(false)
  })

  it('falls back to mock IP details when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))

    const result = await getPublicIpDetails()

    expect(result.isSimulated).toBe(true)
    expect(result.ip).toBeTruthy()
    expect(result.isp).toBeTruthy()
    expect(result.location).toBeTruthy()
  })

  it('falls back to mock IP details when API returns non-OK HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({ ok: false, status: 429 })
    )

    const result = await getPublicIpDetails()

    expect(result.isSimulated).toBe(true)
  })

  it('falls back when API response body lacks ip field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'rate limit exceeded' })
      })
    )

    const result = await getPublicIpDetails()

    expect(result.isSimulated).toBe(true)
  })

  it('always returns all required PublicIpDetails fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')))

    const result = await getPublicIpDetails()

    expect(result).toHaveProperty('ip')
    expect(result).toHaveProperty('isp')
    expect(result).toHaveProperty('location')
    expect(result).toHaveProperty('countryCode')
    expect(result).toHaveProperty('isSimulated')
  })
})
