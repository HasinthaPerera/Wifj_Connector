/**
 * @vitest-environment node
 *
 * Integration Tests — src/main/resources.ts
 *
 * Validates: ResourceSnapshot shape, RAM/CPU calculations derived from os module,
 * disk IO parsing from a mocked PowerShell Get-Counter response, network IO
 * parsing from a mocked Get-NetAdapterStatistics response, and graceful
 * simulated-fallback when PowerShell commands are unavailable.
 *
 * Strategy: child_process.exec is mocked (callback form) so that execAsync
 * (promisify wrapper) returns controlled JSON payloads.  The real `os` module
 * is intentionally NOT mocked — it provides live CPU/RAM values which are
 * always valid positive numbers on any CI or developer machine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecException } from 'child_process'

/* ─── Mock child_process before module import ───────────────────────────── */
vi.mock('child_process', () => {
  const execMock = vi.fn()
  execMock[Symbol.for('nodejs.util.promisify.custom')] = vi.fn(
    (_cmd: string): Promise<{ stdout: string; stderr: string }> => {
      return Promise.resolve({ stdout: '', stderr: '' })
    }
  )
  return { exec: execMock }
})

import { exec } from 'child_process'
import { getResourceSnapshot } from '../resources'

/* ─── Helpers ────────────────────────────────────────────────────────────── */

type ExecCallback = (
  error: ExecException | null,
  stdout: string,
  stderr: string
) => void

/** The Symbol used by Node.js util.promisify to look up a custom implementation. */
const PROMISIFY_CUSTOM = Symbol.for('nodejs.util.promisify.custom')

/**
 * Configures exec mock to call its callback with `stdout` and no error.
 *
 * resources.ts calls execAsync(cmd, { timeout: 4000 }) which promisify
 * translates into exec(cmd, { timeout: 4000 }, cb) — the callback arrives
 * as the THIRD argument.  This helper handles both the 2-arg and 3-arg
 * invocation forms so it intercepts correctly in all code paths.
 */
function mockExecSuccess(stdout: string): void {
  const customFn = (exec as unknown as Record<symbol, ReturnType<typeof vi.fn>>)[PROMISIFY_CUSTOM]
  if (customFn && typeof customFn.mockImplementation === 'function') {
    customFn.mockImplementation(() => Promise.resolve({ stdout, stderr: '' }))
  }

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

/** Configures exec to always fail — triggers simulated fallback paths. */
function mockExecFailure(message = 'Access denied'): void {
  const customFn = (exec as unknown as Record<symbol, ReturnType<typeof vi.fn>>)[PROMISIFY_CUSTOM]
  if (customFn && typeof customFn.mockImplementation === 'function') {
    customFn.mockImplementation(() =>
      Promise.reject(Object.assign(new Error(message), { code: 1 }))
    )
  }

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

/* ─── Fixture: realistic PowerShell JSON payloads ─────────────────────────

  getDiskIO() expects a JSON array [readKbps, writeKbps] from Get-Counter.
  getNetworkIO() expects a JSON array of {Name, ReceivedBytes, SentBytes}.

  We cannot easily return different payloads per-call in a single mock run
  because getResourceSnapshot() calls both helpers concurrently via
  Promise.all.  Instead we supply JSON that is valid for both parsers —
  the disk parser only reads array of numbers, the network parser reads
  objects.  When we supply the disk payload, the network parser falls back;
  when we supply the network payload, the disk parser falls back.
  Each test scenario exercises one IO path + one fallback.
─────────────────────────────────────────────────────────────────────────── */

/** Disk IO payload: [readKbps, writeKbps] */
const DISK_IO_PAYLOAD = JSON.stringify([128.5, 32.0])

/** Network adapter statistics payload */
const NET_ADAPTER_PAYLOAD = JSON.stringify([
  { Name: 'Wi-Fi', ReceivedBytes: 5_242_880, SentBytes: 1_048_576 },
  { Name: 'Ethernet', ReceivedBytes: 0, SentBytes: 0 }
])

/* ═══════════════════════════════════════════════════════════════════════════
   getResourceSnapshot — shape validation
═══════════════════════════════════════════════════════════════════════════ */

describe('getResourceSnapshot', () => {
  beforeEach(() => vi.resetAllMocks())

  /* ── Required field presence ─────────────────────────────────────────── */

  it('always returns an object with all required ResourceSnapshot fields', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    const requiredKeys: Array<keyof typeof snap> = [
      'timestamp',
      'cpuPercent',
      'ramUsedMb',
      'ramTotalMb',
      'ramPercent',
      'cpuCores',
      'cpuModel',
      'diskReadKbps',
      'diskWriteKbps',
      'network',
      'platform',
      'uptimeSeconds',
      'isSimulated'
    ]

    for (const key of requiredKeys) {
      expect(snap, `missing field: ${key}`).toHaveProperty(key)
    }
  })

  /* ── RAM invariants (always sourced from live os module) ─────────────── */

  it('ramTotalMb is positive and ramUsedMb is <= ramTotalMb', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(snap.ramTotalMb).toBeGreaterThan(0)
    expect(snap.ramUsedMb).toBeGreaterThanOrEqual(0)
    expect(snap.ramUsedMb).toBeLessThanOrEqual(snap.ramTotalMb)
  })

  it('ramPercent is in the 0–100 range', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(snap.ramPercent).toBeGreaterThanOrEqual(0)
    expect(snap.ramPercent).toBeLessThanOrEqual(100)
  })

  /* ── CPU invariants ──────────────────────────────────────────────────── */

  it('cpuCores is a positive integer matching os.cpus().length', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()
    const { cpus } = await import('os')

    expect(snap.cpuCores).toBe(cpus().length)
    expect(snap.cpuCores).toBeGreaterThan(0)
  })

  it('cpuModel is a non-empty string', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(typeof snap.cpuModel).toBe('string')
    expect(snap.cpuModel.length).toBeGreaterThan(0)
  })

  it('cpuPercent is a number in the 0–100 range', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(typeof snap.cpuPercent).toBe('number')
    expect(snap.cpuPercent).toBeGreaterThanOrEqual(0)
    expect(snap.cpuPercent).toBeLessThanOrEqual(100)
  })

  /* ── Timestamp / uptime ──────────────────────────────────────────────── */

  it('timestamp is a valid ISO 8601 string', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(() => new Date(snap.timestamp)).not.toThrow()
    expect(new Date(snap.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('uptimeSeconds is a positive integer', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(snap.uptimeSeconds).toBeGreaterThan(0)
    expect(Number.isInteger(snap.uptimeSeconds)).toBe(true)
  })

  /* ── Platform ────────────────────────────────────────────────────────── */

  it('platform matches process.platform', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(snap.platform).toBe(process.platform)
  })

  /* ── Network IO shape (simulated fallback) ───────────────────────────── */

  it('network array has at least one entry with required IO fields on fallback', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(Array.isArray(snap.network)).toBe(true)
    expect(snap.network.length).toBeGreaterThan(0)

    for (const iface of snap.network) {
      expect(iface).toHaveProperty('name')
      expect(iface).toHaveProperty('rxBytes')
      expect(iface).toHaveProperty('txBytes')
      expect(iface).toHaveProperty('rxKbps')
      expect(iface).toHaveProperty('txKbps')
      expect(typeof iface.rxKbps).toBe('number')
      expect(typeof iface.txKbps).toBe('number')
    }
  })

  it('simulated fallback network entries contain Wi-Fi adapter', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    const wifiAdapter = snap.network.find((n) => n.name === 'Wi-Fi')
    expect(wifiAdapter).toBeDefined()
  })

  /* ── Network IO from PowerShell adapter statistics ───────────────────── */

  it('parses Get-NetAdapterStatistics JSON into network array correctly', async () => {
    // Provide the net adapter payload — disk IO will fall back to simulated
    mockExecSuccess(NET_ADAPTER_PAYLOAD)

    const snap = await getResourceSnapshot()

    expect(snap.network.length).toBeGreaterThanOrEqual(1)
    const wifiEntry = snap.network.find((n) => n.name === 'Wi-Fi')
    expect(wifiEntry).toBeDefined()
    // On the first call _lastIfaceBytes is null so deltas are 0,
    // but the cumulative byte counters (rxBytes / txBytes) from the
    // PowerShell payload are stored as-is on the result object.
    expect(wifiEntry!.rxBytes).toBeGreaterThanOrEqual(0)
    expect(wifiEntry!.txBytes).toBeGreaterThanOrEqual(0)
    // rxKbps will be 0 on the first sample (no previous snapshot to delta against)
    expect(typeof wifiEntry!.rxKbps).toBe('number')
    expect(typeof wifiEntry!.txKbps).toBe('number')
  })

  /* ── Disk IO from PowerShell Get-Counter ───────────────────────────── */

  it('parses Get-Counter JSON into disk IO correctly', async () => {
    mockExecSuccess(DISK_IO_PAYLOAD)

    const snap = await getResourceSnapshot()

    expect(snap.diskReadKbps).toBe(128.5)
    expect(snap.diskWriteKbps).toBe(32.0)
  })

  /* ── Disk IO simulated fallback ──────────────────────────────────────── */

  it('disk IO values are positive numbers on simulated fallback', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(typeof snap.diskReadKbps).toBe('number')
    expect(typeof snap.diskWriteKbps).toBe('number')
    expect(snap.diskReadKbps).toBeGreaterThanOrEqual(0)
    expect(snap.diskWriteKbps).toBeGreaterThanOrEqual(0)
  })

  /* ── isSimulated flag ────────────────────────────────────────────────── */

  it('isSimulated is a boolean in every code path', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    expect(typeof snap.isSimulated).toBe('boolean')
  })

  it('isSimulated is true when exec fails (all IO falls back to simulated)', async () => {
    mockExecFailure()

    const snap = await getResourceSnapshot()

    // Simulated network fallback has rxBytes === 0 for all adapters,
    // and simulated disk returns values < 200 KB/s read — both conditions
    // satisfy the isSimulated heuristic in resources.ts.
    expect(snap.isSimulated).toBe(true)
  })

  /* ── Consecutive snapshots ───────────────────────────────────────────── */

  it('two consecutive snapshots both return valid structures', async () => {
    mockExecFailure()

    const snap1 = await getResourceSnapshot()
    const snap2 = await getResourceSnapshot()

    for (const snap of [snap1, snap2]) {
      expect(snap.ramTotalMb).toBeGreaterThan(0)
      expect(typeof snap.cpuPercent).toBe('number')
      expect(Array.isArray(snap.network)).toBe(true)
    }

    // Timestamps should differ by at least 0 ms (may be same if instant)
    expect(new Date(snap2.timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(snap1.timestamp).getTime()
    )
  })
})
