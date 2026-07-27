import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export interface ProcessConnection {
  localAddress: string
  localPort: number
  remoteAddress: string
  remotePort: number
  state: 'ESTABLISHED' | 'LISTEN' | 'TIME_WAIT' | 'CLOSE_WAIT' | 'SYN_SENT' | 'FIN_WAIT' | string
  protocol: 'TCP' | 'UDP'
}

export interface NetworkProcess {
  pid: number
  name: string
  connections: ProcessConnection[]
  connectionCount: number
  /** Estimated KB/s — approximated from connection count heuristic on Windows */
  estimatedKbps: number
  /** Process category derived from name */
  category: 'browser' | 'system' | 'media' | 'security' | 'development' | 'game' | 'other'
  /** Whether the data is simulated */
  isSimulated: boolean
}

/* ─────────────────────────────────────────────────────────────
   Process categorisation
───────────────────────────────────────────────────────────── */

function categorise(name: string): NetworkProcess['category'] {
  const n = name.toLowerCase()
  if (/chrome|firefox|msedge|brave|opera|safari|iexplore/.test(n)) return 'browser'
  if (/spotify|vlc|wmplayer|itunes|teams|zoom|discord|slack/.test(n)) return 'media'
  if (/devenv|code|node|python|git|npm|yarn|docker|kubectl/.test(n)) return 'development'
  if (/defender|antivirus|malware|avast|bitdefender|kaspersky|norton/.test(n)) return 'security'
  if (/svchost|lsass|ntoskrnl|wininit|csrss|smss|services|system/.test(n)) return 'system'
  if (/steam|epicgames|battlenet|origin|roblox|minecraft/.test(n)) return 'game'
  return 'other'
}

/* ─────────────────────────────────────────────────────────────
   PowerShell parser
   Uses Get-NetTCPConnection joined with Get-Process
───────────────────────────────────────────────────────────── */

interface RawRow {
  LocalAddress: string
  LocalPort: string
  RemoteAddress: string
  RemotePort: string
  State: string
  OwningProcess: string
  ProcessName: string
}

function parseJsonRows(stdout: string): RawRow[] {
  try {
    // PowerShell outputs JSON array
    const parsed: unknown = JSON.parse(stdout.trim())
    if (Array.isArray(parsed)) return parsed as RawRow[]
  } catch {
    // noop — fall through to simulated
  }
  return []
}

function mapState(raw: string): ProcessConnection['state'] {
  switch (raw.toUpperCase()) {
    case 'ESTABLISHED':  return 'ESTABLISHED'
    case 'LISTEN':       return 'LISTEN'
    case 'TIMEWAIT':
    case 'TIME_WAIT':    return 'TIME_WAIT'
    case 'CLOSEWAIT':
    case 'CLOSE_WAIT':   return 'CLOSE_WAIT'
    case 'SYNSENT':
    case 'SYN_SENT':     return 'SYN_SENT'
    case 'FINWAIT1':
    case 'FINWAIT2':     return 'FIN_WAIT'
    default:             return raw
  }
}

function groupByPid(rows: RawRow[]): NetworkProcess[] {
  const map = new Map<number, NetworkProcess>()

  for (const row of rows) {
    const pid = parseInt(row.OwningProcess, 10)
    if (isNaN(pid) || pid === 0) continue

    const name = (row.ProcessName || 'Unknown').replace(/\.exe$/i, '')

    if (!map.has(pid)) {
      map.set(pid, {
        pid,
        name,
        connections: [],
        connectionCount: 0,
        estimatedKbps: 0,
        category: categorise(name),
        isSimulated: false
      })
    }

    const proc = map.get(pid)!
    const conn: ProcessConnection = {
      localAddress:  row.LocalAddress  || '0.0.0.0',
      localPort:     parseInt(row.LocalPort, 10)  || 0,
      remoteAddress: row.RemoteAddress || '0.0.0.0',
      remotePort:    parseInt(row.RemotePort, 10) || 0,
      state:    mapState(row.State || ''),
      protocol: 'TCP'
    }
    proc.connections.push(conn)
  }

  // Post-process — count & estimate
  const result: NetworkProcess[] = []
  for (const proc of map.values()) {
    proc.connectionCount = proc.connections.length
    // Rough heuristic: each established connection ≈ 50–300 KB/s
    const established = proc.connections.filter((c) => c.state === 'ESTABLISHED').length
    proc.estimatedKbps = Math.round(established * (40 + Math.random() * 260))
    result.push(proc)
  }

  return result.sort((a, b) => b.connectionCount - a.connectionCount)
}

/* ─────────────────────────────────────────────────────────────
   High-quality simulated fallback data
───────────────────────────────────────────────────────────── */

function buildSimulatedProcesses(): NetworkProcess[] {
  const templates: Array<{ name: string; pid: number; conns: number; kbps: number }> = [
    { name: 'chrome',          pid: 4812, conns: 18, kbps: 1240 },
    { name: 'msedge',          pid: 6104, conns: 12, kbps:  880 },
    { name: 'svchost',         pid:  956, conns:  9, kbps:   45 },
    { name: 'spotify',         pid: 8320, conns:  6, kbps:  320 },
    { name: 'discord',         pid: 9160, conns:  5, kbps:  210 },
    { name: 'teams',           pid: 7440, conns:  8, kbps:  640 },
    { name: 'node',            pid: 3300, conns:  4, kbps:   80 },
    { name: 'steam',           pid: 2800, conns:  3, kbps:  150 },
    { name: 'WindowsDefender', pid: 1640, conns:  2, kbps:   20 },
    { name: 'explorer',        pid:  800, conns:  1, kbps:    5 }
  ]

  return templates.map((t, idx) => {
    const established = Math.ceil(t.conns * 0.7)
    const connections: ProcessConnection[] = Array.from({ length: t.conns }, (_, i) => ({
      localAddress:  '192.168.1.105',
      localPort:     49152 + idx * 100 + i,
      remoteAddress: `${40 + idx}.${i + 1}.${200 + i}.${10 + i}`,
      remotePort:    i < established ? 443 : 80,
      state:    i < established ? 'ESTABLISHED' : 'LISTEN',
      protocol: 'TCP' as const
    }))

    return {
      pid:  t.pid,
      name: t.name,
      connections,
      connectionCount: t.conns,
      estimatedKbps:   t.kbps,
      category:        categorise(t.name),
      isSimulated:     true
    }
  })
}

/* ─────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────── */

/**
 * Scans running processes that have active TCP/IP network connections.
 * Uses PowerShell Get-NetTCPConnection joined with Get-Process on Windows.
 * Falls back to a rich simulated dataset if the command fails or is unavailable.
 */
export async function scanNetworkProcesses(): Promise<NetworkProcess[]> {
  // The PS command outputs a JSON array of objects with our required fields.
  const psScript = `
    try {
      $conns = Get-NetTCPConnection -ErrorAction Stop | Where-Object { $_.OwningProcess -gt 0 }
      $procs = Get-Process -ErrorAction SilentlyContinue | Select-Object Id, Name
      $procMap = @{}
      foreach ($p in $procs) { $procMap[$p.Id] = $p.Name }
      $result = $conns | ForEach-Object {
        [PSCustomObject]@{
          LocalAddress  = $_.LocalAddress
          LocalPort     = $_.LocalPort
          RemoteAddress = $_.RemoteAddress
          RemotePort    = $_.RemotePort
          State         = $_.State
          OwningProcess = $_.OwningProcess
          ProcessName   = if ($procMap.ContainsKey($_.OwningProcess)) { $procMap[$_.OwningProcess] } else { 'Unknown' }
        }
      }
      $result | ConvertTo-Json -Depth 3
    } catch {
      Write-Output '[]'
    }
  `.trim()

  try {
    const { stdout } = await execAsync(
      `powershell -NonInteractive -NoProfile -Command "${psScript.replace(/\n\s*/g, ' ')}"`,
      { timeout: 8000 }
    )

    const rows = parseJsonRows(stdout)
    if (rows.length > 0) {
      return groupByPid(rows)
    }
  } catch (err) {
    console.warn('[ProcessScanner] PowerShell query failed, using simulated fallback:', err)
  }

  return buildSimulatedProcesses()
}
