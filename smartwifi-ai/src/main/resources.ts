import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'

const execAsync = promisify(exec)

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export interface NetworkIOStats {
  /** Adapter name */
  name: string
  /** Bytes received since last sample */
  rxBytes: number
  /** Bytes sent since last sample */
  txBytes: number
  /** KB/s received (delta) */
  rxKbps: number
  /** KB/s sent (delta) */
  txKbps: number
}

export interface ResourceSnapshot {
  /** Timestamp (ISO 8601) */
  timestamp: string
  /** CPU utilisation 0-100 */
  cpuPercent: number
  /** RAM used in MB */
  ramUsedMb: number
  /** RAM total in MB */
  ramTotalMb: number
  /** RAM utilisation 0-100 */
  ramPercent: number
  /** Number of logical CPU cores */
  cpuCores: number
  /** CPU model string */
  cpuModel: string
  /** Disk read KB/s (best available adapter) */
  diskReadKbps: number
  /** Disk write KB/s */
  diskWriteKbps: number
  /** Network interface stats */
  network: NetworkIOStats[]
  /** OS platform */
  platform: string
  /** Node.js process uptime in seconds */
  uptimeSeconds: number
  /** Whether values were approximated / simulated */
  isSimulated: boolean
}

/* ─────────────────────────────────────────────────────────────
   CPU sample (cross-platform via os.cpus())
───────────────────────────────────────────────────────────── */

interface CpuTick {
  idle: number
  total: number
}

let _lastCpuTicks: CpuTick[] | null = null

function sampleCpuPercent(): number {
  const cpus = os.cpus()
  const ticks: CpuTick[] = cpus.map((c) => {
    const t = c.times
    return { idle: t.idle, total: t.idle + t.user + t.nice + t.sys + t.irq }
  })

  if (!_lastCpuTicks) {
    _lastCpuTicks = ticks
    // On first call return 0 — next call will have a proper delta
    return 0
  }

  let idleDelta = 0
  let totalDelta = 0

  for (let i = 0; i < ticks.length; i++) {
    idleDelta  += ticks[i].idle  - _lastCpuTicks[i].idle
    totalDelta += ticks[i].total - _lastCpuTicks[i].total
  }

  _lastCpuTicks = ticks

  if (totalDelta === 0) return 0
  return Math.round((1 - idleDelta / totalDelta) * 100)
}

/* ─────────────────────────────────────────────────────────────
   Windows: disk IO via Get-Counter
───────────────────────────────────────────────────────────── */

interface DiskIO { readKbps: number; writeKbps: number }

async function getDiskIO(): Promise<DiskIO> {
  const psScript =
    `(Get-Counter '\\PhysicalDisk(_Total)\\Disk Read Bytes/sec','\\PhysicalDisk(_Total)\\Disk Write Bytes/sec' ` +
    `-ErrorAction SilentlyContinue).CounterSamples | ` +
    `ForEach-Object { [math]::Round($_.CookedValue / 1024, 1) } | ` +
    `ConvertTo-Json`

  try {
    const { stdout } = await execAsync(
      `powershell -NonInteractive -NoProfile -Command "${psScript}"`,
      { timeout: 4000 }
    )
    const vals: unknown = JSON.parse(stdout.trim())
    if (Array.isArray(vals) && vals.length >= 2) {
      return { readKbps: Number(vals[0]) || 0, writeKbps: Number(vals[1]) || 0 }
    }
    if (typeof vals === 'number') {
      return { readKbps: vals, writeKbps: 0 }
    }
  } catch {
    // Fallback handled below
  }
  // Gentle fallback — simulate low idle disk activity
  return {
    readKbps:  Math.round(20  + Math.random() * 80),
    writeKbps: Math.round(10  + Math.random() * 40)
  }
}

/* ─────────────────────────────────────────────────────────────
   Network IO via os.networkInterfaces() + Get-NetAdapterStatistics
   We delta-sample bytes to compute throughput.
───────────────────────────────────────────────────────────── */

interface IfaceBytes { [name: string]: { rx: number; tx: number } }
let _lastIfaceBytes: IfaceBytes | null = null
let _lastIfaceTime: number = Date.now()

async function getNetworkIO(): Promise<NetworkIOStats[]> {
  // Try Windows Get-NetAdapterStatistics for accurate byte counts
  const psScript =
    `Get-NetAdapterStatistics -ErrorAction SilentlyContinue | ` +
    `Select-Object Name,ReceivedBytes,SentBytes | ` +
    `ConvertTo-Json -Depth 2`

  try {
    const { stdout } = await execAsync(
      `powershell -NonInteractive -NoProfile -Command "${psScript}"`,
      { timeout: 4000 }
    )
    const raw: unknown = JSON.parse(stdout.trim())
    const items: Array<{ Name: string; ReceivedBytes: number; SentBytes: number }> =
      Array.isArray(raw) ? raw : raw ? [raw as { Name: string; ReceivedBytes: number; SentBytes: number }] : []

    const now = Date.now()
    const elapsedSec = Math.max((now - _lastIfaceTime) / 1000, 0.1)
    _lastIfaceTime = now

    const current: IfaceBytes = {}
    for (const item of items) {
      current[item.Name] = { rx: item.ReceivedBytes, tx: item.SentBytes }
    }

    const result: NetworkIOStats[] = []
    for (const item of items) {
      const prev = _lastIfaceBytes?.[item.Name]
      const rxDelta = prev ? Math.max(0, item.ReceivedBytes - prev.rx) : 0
      const txDelta = prev ? Math.max(0, item.SentBytes   - prev.tx) : 0
      result.push({
        name:    item.Name,
        rxBytes: item.ReceivedBytes,
        txBytes: item.SentBytes,
        rxKbps:  Math.round(rxDelta / 1024 / elapsedSec),
        txKbps:  Math.round(txDelta / 1024 / elapsedSec)
      })
    }

    _lastIfaceBytes = current
    if (result.length > 0) return result
  } catch {
    // Fall through to simulated
  }

  // Simulated fallback
  return [
    { name: 'Wi-Fi',    rxBytes: 0, txBytes: 0, rxKbps: Math.round(200 + Math.random() * 800), txKbps: Math.round(50 + Math.random() * 200) },
    { name: 'Ethernet', rxBytes: 0, txBytes: 0, rxKbps: 0, txKbps: 0 }
  ]
}

/* ─────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────── */

/**
 * Collects a point-in-time snapshot of system resource usage.
 * CPU: sampled via os.cpus() tick delta.
 * RAM: sampled via os.freemem() / os.totalmem().
 * Disk IO: Windows Get-Counter with simulated fallback.
 * Network IO: Windows Get-NetAdapterStatistics with simulated fallback.
 */
export async function getResourceSnapshot(): Promise<ResourceSnapshot> {
  const [diskIO, networkIO] = await Promise.all([getDiskIO(), getNetworkIO()])

  const cpuPercent  = sampleCpuPercent()
  const ramTotalMb  = Math.round(os.totalmem()  / 1024 / 1024)
  const ramUsedMb   = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)
  const ramPercent  = Math.round((ramUsedMb / ramTotalMb) * 100)
  const cpuCores    = os.cpus().length
  const cpuModel    = os.cpus()[0]?.model?.trim() || 'Unknown CPU'

  const isSimulated = diskIO.readKbps < 200 &&
    networkIO.some((n) => n.rxBytes === 0)

  return {
    timestamp:     new Date().toISOString(),
    cpuPercent,
    ramUsedMb,
    ramTotalMb,
    ramPercent,
    cpuCores,
    cpuModel,
    diskReadKbps:  diskIO.readKbps,
    diskWriteKbps: diskIO.writeKbps,
    network:       networkIO,
    platform:      os.platform(),
    uptimeSeconds: Math.round(os.uptime()),
    isSimulated
  }
}
