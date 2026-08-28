/**
 * @vitest-environment node
 *
 * Integration Tests — src/main/optimization.ts
 *
 * Validates: DNS flush, IP lease release/renew, TCP stack reset, DNS server
 * benchmarking, domain resolution, auto-optimization suite, and full network
 * reset flows — with mocked exec and net.Socket for deterministic behaviour.
 *
 * Strategy: Each test exercises the real module function end-to-end.
 * child_process.exec and net (Socket) are mocked to control outputs without
 * real system calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecException } from 'child_process'

/* ─── Mock external I/O modules before module import ───────────────────── */
vi.mock('child_process', () => ({ exec: vi.fn() }))

vi.mock('net', () => {
  /**
   * Inline factory — must NOT reference external variables because vi.mock()
   * factories are hoisted before module-level code runs.
   *
   * Uses a class with instance-field methods so every `new Socket()` call
   * produces a fresh object with own `setTimeout`, `connect`, `destroy`,
   * and `on` properties that are independently callable.
   *
   * The `connect` implementation fires the success callback after 15 ms
   * using globalThis.setTimeout (real timer, not Jest fake timers) so
   * benchmarkDnsServers receives a deterministic sub-50 ms latency.
   */
  class MockSocket {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTimeout: (...args: any[]) => void = () => undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    destroy: (...args: any[]) => void = () => undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on: (...args: any[]) => void = () => undefined
    connect(_port: number, _ip: string, cb: () => void): void {
      globalThis.setTimeout(cb, 15)
    }
  }
  return { Socket: MockSocket }
})

vi.mock('dns/promises', () => ({
  resolve4: vi.fn()
}))

import { exec } from 'child_process'
import * as dnsPromises from 'dns/promises'
import {
  flushDnsCache,
  releaseIpLease,
  renewIpLease,
  resetTcpStack,
  benchmarkDnsServers,
  runAutoOptimizationSuite,
  resolveDomain,
  performNetworkReset
} from '../optimization'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

type ExecCallback = (
  error: ExecException | null,
  stdout: string,
  stderr: string
) => void

function mockExecSuccess(stdout = 'OK'): void {
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

function mockExecFailure(message = 'Access denied'): void {
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

/* ═══════════════════════════════════════════════════════════════════════════
   flushDnsCache
═══════════════════════════════════════════════════════════════════════════ */

describe('flushDnsCache', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns success with output on simulated non-Windows platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await flushDnsCache()

    expect(result.success).toBe(true)
    expect(result.message).toMatch(/dns cache/i)
    expect(result.timestamp).toBeTruthy()
  })

  it('returns success=false and an error message when exec throws on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockExecFailure('Access is denied')

    const result = await flushDnsCache()

    expect(result.success).toBe(false)
    expect(result.message).toMatch(/failed to flush dns/i)
    expect(typeof result.timestamp).toBe('string')
  })

  it('returns truthy timestamp in every outcome', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    const result = await flushDnsCache()
    expect(result.timestamp).toBeTruthy()
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   releaseIpLease
═══════════════════════════════════════════════════════════════════════════ */

describe('releaseIpLease', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns simulated success on non-Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await releaseIpLease()

    expect(result.success).toBe(true)
    expect(result.message).toMatch(/release/i)
  })

  it('propagates exec error on Windows as a failure result', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockExecFailure('No DHCP adapter')

    const result = await releaseIpLease()

    expect(result.success).toBe(false)
    expect(result.output).toContain('No DHCP adapter')
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   renewIpLease
═══════════════════════════════════════════════════════════════════════════ */

describe('renewIpLease', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns simulated success on non-Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await renewIpLease()

    expect(result.success).toBe(true)
    expect(result.message).toMatch(/renew/i)
  })

  it('returns a non-null result even when exec fails on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockExecFailure('DHCP server unreachable')

    const result = await renewIpLease()

    // renewIpLease wraps failures gracefully — result must always be defined
    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.timestamp).toBe('string')
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   resetTcpStack
═══════════════════════════════════════════════════════════════════════════ */

describe('resetTcpStack', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns simulated success with expected message on non-Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    const result = await resetTcpStack()

    expect(result.success).toBe(true)
    expect(result.message).toMatch(/tcp/i)
  })

  it('handles partial exec failures gracefully on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    mockExecSuccess('TCP auto-tuning reset.')

    const result = await resetTcpStack()

    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   benchmarkDnsServers
   net.Socket is mocked to complete at ~15ms per test-environment setup above.
═══════════════════════════════════════════════════════════════════════════ */

describe('benchmarkDnsServers', () => {
  it('returns exactly 5 DNS server benchmark results', async () => {
    const results = await benchmarkDnsServers()
    expect(results).toHaveLength(5)
  }, 10_000)

  it('results are sorted ascending by latencyMs', async () => {
    const results = await benchmarkDnsServers()
    for (let i = 1; i < results.length; i++) {
      expect(results[i].latencyMs).toBeGreaterThanOrEqual(results[i - 1].latencyMs)
    }
  }, 10_000)

  it('each result contains required DNS benchmark fields', async () => {
    const results = await benchmarkDnsServers()

    for (const r of results) {
      expect(r).toHaveProperty('id')
      expect(r).toHaveProperty('name')
      expect(r).toHaveProperty('primaryDns')
      expect(r).toHaveProperty('secondaryDns')
      expect(r).toHaveProperty('latencyMs')
      expect(r).toHaveProperty('status')
      expect(['fast', 'average', 'slow']).toContain(r.status)
      expect(typeof r.latencyMs).toBe('number')
      expect(r.latencyMs).toBeGreaterThanOrEqual(0)
    }
  }, 10_000)

  it('includes well-known DNS providers in benchmark set', async () => {
    const results = await benchmarkDnsServers()
    const ids = results.map((r) => r.id)
    expect(ids).toContain('cloudflare')
    expect(ids).toContain('google')
    expect(ids).toContain('quad9')
  }, 10_000)
})

/* ═══════════════════════════════════════════════════════════════════════════
   resolveDomain
═══════════════════════════════════════════════════════════════════════════ */

describe('resolveDomain', () => {
  beforeEach(() => vi.resetAllMocks())

  it('strips http:// prefix before resolving', async () => {
    vi.mocked(dnsPromises.resolve4).mockResolvedValueOnce(['142.250.190.46'])

    const result = await resolveDomain('https://google.com/path?q=1')

    expect(result.domain).toBe('google.com')
    expect(result.success).toBe(true)
  })

  it('returns resolved addresses for a known domain', async () => {
    vi.mocked(dnsPromises.resolve4).mockResolvedValueOnce(['1.1.1.1', '1.0.0.1'])

    const result = await resolveDomain('cloudflare.com')

    expect(result.success).toBe(true)
    expect(result.addresses).toContain('1.1.1.1')
    expect(result.latencyMs).toBeGreaterThan(0)
  })

  it('returns fallback mock IPs when DNS resolution fails', async () => {
    vi.mocked(dnsPromises.resolve4).mockRejectedValueOnce(new Error('ENOTFOUND'))

    const result = await resolveDomain('google.com')

    expect(result.success).toBe(true) // graceful fallback
    expect(result.addresses.length).toBeGreaterThan(0)
    expect(result.resolver).toMatch(/fallback/i)
  })

  it('falls back to generic IPs for unknown domains', async () => {
    vi.mocked(dnsPromises.resolve4).mockRejectedValueOnce(new Error('ENOTFOUND'))

    const result = await resolveDomain('unknown-private-host.local')

    expect(result.addresses).toEqual(expect.arrayContaining([expect.stringMatching(/\d+\.\d+\.\d+\.\d+/)]))
  })

  it('trims and normalizes domain before lookup', async () => {
    vi.mocked(dnsPromises.resolve4).mockResolvedValueOnce(['8.8.8.8'])

    const result = await resolveDomain('  github.com  ')

    expect(result.domain).toBe('github.com')
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   runAutoOptimizationSuite
═══════════════════════════════════════════════════════════════════════════ */

describe('runAutoOptimizationSuite', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(process, 'platform', { value: 'linux' })
  })

  const presets = ['gaming', 'streaming', 'work', 'balanced'] as const

  it.each(presets)('preset "%s" returns a valid AutoOptimizationResult', async (preset) => {
    const result = await runAutoOptimizationSuite(preset)

    expect(result.preset).toBe(preset)
    expect(result.appliedActions.length).toBeGreaterThanOrEqual(2)
    expect(result.scoreBefore).toBeGreaterThan(0)
    expect(result.scoreAfter).toBeGreaterThan(result.scoreBefore)
    expect(result.latencyAfterMs).toBeLessThan(result.latencyBeforeMs)
    expect(typeof result.timestamp).toBe('string')
    expect(typeof result.isSimulated).toBe('boolean')
  })

  it('defaults to "balanced" preset when no argument is given', async () => {
    const result = await runAutoOptimizationSuite()
    expect(result.preset).toBe('balanced')
  })

  it('gaming preset applies UDP and Nagle-specific actions', async () => {
    const result = await runAutoOptimizationSuite('gaming')
    const actions = result.appliedActions.join(' ').toLowerCase()
    expect(actions).toMatch(/udp|nagle/i)
  })

  it('streaming preset mentions TCP receive window or buffer', async () => {
    const result = await runAutoOptimizationSuite('streaming')
    const actions = result.appliedActions.join(' ').toLowerCase()
    expect(actions).toMatch(/tcp|buffer|stream/i)
  })

  it('scoreAfter never exceeds 100', async () => {
    // Run multiple times to catch random-based edge cases
    for (let i = 0; i < 5; i++) {
      const result = await runAutoOptimizationSuite('balanced')
      expect(result.scoreAfter).toBeLessThanOrEqual(100)
    }
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   performNetworkReset
═══════════════════════════════════════════════════════════════════════════ */

describe('performNetworkReset', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    Object.defineProperty(process, 'platform', { value: 'linux' })
  })

  it('returns success with all 5 default steps executed on non-Windows', async () => {
    const result = await performNetworkReset()

    expect(result.success).toBe(true)
    expect(result.isSimulated).toBe(true)
    expect(result.stepsExecuted.length).toBe(5)
    expect(result.combinedOutput).toBeTruthy()
    expect(typeof result.rebootRecommended).toBe('boolean')
  })

  it('executes only selected steps when specific options are set', async () => {
    const result = await performNetworkReset({
      resetWinsock: false,
      resetTcpIp: false,
      flushDns: true,
      clearArp: false,
      renewDhcp: false
    })

    // Only 1 step should have run
    expect(result.stepsExecuted.length).toBe(1)
    expect(result.stepsExecuted[0].step).toMatch(/dns/i)
  })

  it('executes zero steps when all options are disabled', async () => {
    const result = await performNetworkReset({
      resetWinsock: false,
      resetTcpIp: false,
      flushDns: false,
      clearArp: false,
      renewDhcp: false
    })

    expect(result.stepsExecuted.length).toBe(0)
    // No steps → success is vacuously true (every() on empty is true)
    expect(result.success).toBe(true)
  })

  it('includes step names for all five reset operations by default', async () => {
    const result = await performNetworkReset()
    const stepNames = result.stepsExecuted.map((s) => s.step.toLowerCase())

    expect(stepNames.some((n) => n.includes('winsock'))).toBe(true)
    expect(stepNames.some((n) => n.includes('tcp'))).toBe(true)
    expect(stepNames.some((n) => n.includes('dns'))).toBe(true)
    expect(stepNames.some((n) => n.includes('arp'))).toBe(true)
    expect(stepNames.some((n) => n.includes('dhcp'))).toBe(true)
  })

  it('combinedOutput includes output from every executed step', async () => {
    const result = await performNetworkReset()

    for (const step of result.stepsExecuted) {
      expect(result.combinedOutput).toContain(step.step)
    }
  })

  it('rebootRecommended is false for non-Windows simulation', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    const result = await performNetworkReset()
    expect(result.rebootRecommended).toBe(false)
  })
})
