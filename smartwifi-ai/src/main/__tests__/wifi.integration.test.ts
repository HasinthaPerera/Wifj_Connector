/**
 * @vitest-environment node
 *
 * Integration Tests — src/main/wifi.ts
 *
 * Validates: adapter detection, nearby-network scanning, Wi-Fi reconnect logic,
 * and graceful fallback simulation when netsh commands are unavailable.
 *
 * Strategy: vi.mock('child_process') controls exec output per-test; the
 * real parsing code is exercised end-to-end so parser + business logic
 * are tested together (not in isolation).
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import type { ExecException } from 'child_process'

/* ─── Mock child_process before module import ───────────────────────────── */
vi.mock('child_process', () => {
  /**
   * `util.promisify(exec)` on the real exec resolves with `{ stdout, stderr }`
   * because exec has a built-in `[util.promisify.custom]` symbol.
   * We must replicate that symbol on the vi.fn() mock; otherwise promisify
   * resolves with just the first callback arg (a raw string), causing
   * `const { stdout } = await execAsync(...)` to produce `undefined`.
   */
  const execMock = vi.fn()
  execMock[Symbol.for('nodejs.util.promisify.custom')] = vi.fn(
    (cmd: string): Promise<{ stdout: string; stderr: string }> => {
      // This custom implementation is replaced per-test via mockExecSuccess /
      // mockExecFailure by updating the `[promisify.custom]` inner mock.
      void cmd
      return Promise.resolve({ stdout: '', stderr: '' })
    }
  )
  return { exec: execMock }
})


import { exec } from 'child_process'
import {
  detectActiveWifiAdapter,
  scanNearbyNetworks,
  reconnectWifiAdapter
} from '../wifi'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

type ExecCallback = (
  error: ExecException | null,
  stdout: string,
  stderr: string
) => void

/** The Symbol used by Node.js util.promisify to look up a custom implementation. */
const PROMISIFY_CUSTOM = Symbol.for('nodejs.util.promisify.custom')

/**
 * Configures the exec mock to resolve with `{ stdout, stderr }` via the
 * promisify custom symbol (used by modules that call `promisify(exec)`)
 * AND calls the callback directly (used by modules that call exec directly).
 */
function mockExecSuccess(stdout: string): void {
  // 1. Update the promisify.custom mock so execAsync resolves with { stdout, stderr }
  const customFn = (exec as unknown as Record<symbol, ReturnType<typeof vi.fn>>)[PROMISIFY_CUSTOM]
  if (customFn && typeof customFn.mockImplementation === 'function') {
    customFn.mockImplementation(() => Promise.resolve({ stdout, stderr: '' }))
  }

  // 2. Also set the callback-based impl for code paths using exec directly
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

/**
 * Configures the exec mock to reject (via promisify.custom) and call back
 * with an error — triggers the simulated fallback paths in both call styles.
 */
function mockExecFailure(message = 'Command failed'): void {
  // 1. Reject via promisify.custom
  const customFn = (exec as unknown as Record<symbol, ReturnType<typeof vi.fn>>)[PROMISIFY_CUSTOM]
  if (customFn && typeof customFn.mockImplementation === 'function') {
    customFn.mockImplementation(() =>
      Promise.reject(Object.assign(new Error(message), { code: 1 }))
    )
  }

  // 2. Callback-based failure
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


/* ─── Real netsh output fixtures ─────────────────────────────────────────── */

const NETSH_INTERFACES_OUTPUT = `
There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Wi-Fi 6E AX211 160MHz
    GUID                   : abc123-def456
    Physical address       : A4:C3:F0:8B:2E:11
    Interface type         : Wireless LAN
    State                  : connected
    SSID                   : HomeNetwork_5G
    BSSID                  : A4:C3:F0:8B:2E:11
    Network type           : Infrastructure
    Radio type             : 802.11ax (Wi-Fi 6)
    Authentication         : WPA3-Personal
    Cipher                 : CCMP
    Connection mode        : Auto Connect
    Channel                : 36
    Receive rate (Mbps)    : 1201
    Transmit rate (Mbps)   : 1201
    Signal                 : 88%
    Profile                : HomeNetwork_5G
`

const NETSH_NETWORKS_OUTPUT = `
Interface name : Wi-Fi
There are 3 networks currently visible.

SSID 1 : HomeNetwork_5G
    Network type            : Infrastructure
    Authentication          : WPA3-Personal
    Encryption              : CCMP
    BSSID 1                 : A4:C3:F0:8B:2E:11
         Signal             : 88%
         Radio type         : 802.11ax
         Channel            : 36

SSID 2 : Office_Guest
    Network type            : Infrastructure
    Authentication          : WPA2-Enterprise
    Encryption              : CCMP
    BSSID 1                 : 8C:3B:AD:12:F1:C0
         Signal             : 72%
         Radio type         : 802.11n
         Channel            : 6

SSID 3 : Linksys_Router
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : TKIP
    BSSID 1                 : 40:F2:01:BC:88:5A
         Signal             : 54%
         Radio type         : 802.11ac
         Channel            : 11
`

/* ═══════════════════════════════════════════════════════════════════════════
   detectActiveWifiAdapter
═══════════════════════════════════════════════════════════════════════════ */

describe('detectActiveWifiAdapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('parses real netsh interface output and returns a populated adapter object', async () => {
    mockExecSuccess(NETSH_INTERFACES_OUTPUT)

    const adapter = await detectActiveWifiAdapter()

    expect(adapter.name).toBe('Wi-Fi')
    expect(adapter.description).toBe('Intel(R) Wi-Fi 6E AX211 160MHz')
    expect(adapter.physicalAddress).toBe('A4:C3:F0:8B:2E:11')
    expect(adapter.state).toBe('connected')
    expect(adapter.ssid).toBe('HomeNetwork_5G')
    expect(adapter.channel).toBe(36)
    expect(adapter.signal).toBe(88)
    expect(adapter.receiveRate).toBe(1201)
    expect(adapter.transmitRate).toBe(1201)
    expect(adapter.radioType).toBe('802.11ax (Wi-Fi 6)')
    expect(adapter.authentication).toBe('WPA3-Personal')
    expect(adapter.isSimulated).toBe(false)
  })

  it('returns high-quality simulated adapter when exec throws', async () => {
    mockExecFailure('netsh not available')

    const adapter = await detectActiveWifiAdapter()

    expect(adapter.isSimulated).toBe(true)
    expect(adapter.name).toMatch(/Wi-Fi/i)
    expect(typeof adapter.signal).toBe('number')
    expect(adapter.signal).toBeGreaterThan(0)
    expect(adapter.channel).toBeGreaterThan(0)
  })

  it('returns simulated adapter when exec produces empty output (no interfaces)', async () => {
    mockExecSuccess('There are 0 interfaces on the system.')

    const adapter = await detectActiveWifiAdapter()

    // No parsable name/description → fallback simulation
    expect(adapter.isSimulated).toBe(true)
  })

  it('ensures simulated adapter has all required interface fields', async () => {
    mockExecFailure()

    const adapter = await detectActiveWifiAdapter()

    const requiredKeys = [
      'name', 'description', 'physicalAddress', 'state',
      'ssid', 'bssid', 'radioType', 'authentication', 'cipher',
      'channel', 'receiveRate', 'transmitRate', 'signal', 'isSimulated'
    ]
    for (const key of requiredKeys) {
      expect(adapter).toHaveProperty(key)
    }
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   scanNearbyNetworks
═══════════════════════════════════════════════════════════════════════════ */

describe('scanNearbyNetworks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('parses netsh networks output and returns multiple networks', async () => {
    mockExecSuccess(NETSH_NETWORKS_OUTPUT)

    const networks = await scanNearbyNetworks()

    // At least 1 network must be parsed
    expect(networks.length).toBeGreaterThanOrEqual(1)

    // All entries should have the required structure
    for (const net of networks) {
      expect(net).toHaveProperty('ssid')
      expect(net).toHaveProperty('signal')
      expect(net).toHaveProperty('channel')
      expect(net).toHaveProperty('security')
      expect(net).toHaveProperty('bssid')
      expect(typeof net.signal).toBe('number')
      expect(typeof net.channel).toBe('number')
    }
  })

  it('falls back to simulated network list when exec fails', async () => {
    mockExecFailure('WLAN AutoConfig service not running')

    const networks = await scanNearbyNetworks()

    expect(Array.isArray(networks)).toBe(true)
    expect(networks.length).toBeGreaterThan(0)

    // Simulated fallback always contains valid entries
    const first = networks[0]
    expect(typeof first.ssid).toBe('string')
    expect(first.ssid.length).toBeGreaterThan(0)
    expect(first.signal).toBeGreaterThan(0)
  })

  it('returns simulated data when output contains no SSID blocks', async () => {
    mockExecSuccess('There are 0 networks currently visible.')

    const networks = await scanNearbyNetworks()

    // Empty parse → fallback list returned
    expect(networks.length).toBeGreaterThan(0)
  })

  it('ensures all network entries have signal values in 0-100 range', async () => {
    mockExecFailure()

    const networks = await scanNearbyNetworks()

    for (const net of networks) {
      expect(net.signal).toBeGreaterThanOrEqual(0)
      expect(net.signal).toBeLessThanOrEqual(100)
    }
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   reconnectWifiAdapter
═══════════════════════════════════════════════════════════════════════════ */

describe('reconnectWifiAdapter', () => {
  const originalPlatform = process.platform

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns simulated success result on non-Windows platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await reconnectWifiAdapter('wlan0', 'TestSSID')

    expect(result.success).toBe(true)
    expect(result.isSimulated).toBe(true)
    expect(result.interfaceName).toBe('wlan0')
    expect(result.ssid).toBe('TestSSID')
    expect(result.timestamp).toBeTruthy()
  })

  it('simulated result contains all required output fields', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })

    const result = await reconnectWifiAdapter()

    const requiredKeys = ['success', 'message', 'output', 'interfaceName', 'ssid', 'timestamp', 'isSimulated']
    for (const key of requiredKeys) {
      expect(result).toHaveProperty(key)
    }
  })

  it('uses default interface name "Wi-Fi" when none is provided', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await reconnectWifiAdapter()

    expect(result.interfaceName).toBe('Wi-Fi')
  })

  it('uses provided SSID in non-Windows result', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await reconnectWifiAdapter('Wi-Fi', 'MyCustomSSID')

    expect(result.ssid).toBe('MyCustomSSID')
  })
})
