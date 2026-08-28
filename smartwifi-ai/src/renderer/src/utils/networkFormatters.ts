/**
 * SmartWiFi AI — Network Data Formatters & Telemetry Utilities
 *
 * Centralized formatting functions for network telemetry data, unit conversions,
 * signal quality grading, latency classification, and time durations.
 */

export interface SignalGrade {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  label: 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Poor' | 'No Signal'
  variant: 'accent' | 'warning' | 'danger' | 'default' | 'primary'
}

export interface LatencyGrade {
  grade: 'Optimal' | 'Good' | 'Moderate' | 'High' | 'Critical'
  variant: 'accent' | 'warning' | 'danger' | 'primary'
}

/**
 * Format bytes into human-readable data volume (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))
  return `${val} ${sizes[i]}`
}

/**
 * Format kilobits per second (Kbps) into human-readable throughput (Kbps, Mbps, Gbps)
 */
export function formatBitrate(kbps: number, decimals = 1): string {
  if (kbps <= 0 || !Number.isFinite(kbps)) return '0 Mbps'
  if (kbps < 1000) {
    return `${Math.round(kbps)} Kbps`
  }
  const mbps = kbps / 1000
  if (mbps < 1000) {
    return `${mbps.toFixed(decimals)} Mbps`
  }
  const gbps = mbps / 1000
  return `${gbps.toFixed(decimals)} Gbps`
}

/**
 * Format round-trip latency in milliseconds
 */
export function formatLatency(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return '-- ms'
  if (ms < 1) return '< 1 ms'
  return `${Math.round(ms)} ms`
}

/**
 * Format elapsed time seconds into human-readable duration (e.g. 2d 4h 15m or 14m 22s)
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0 || !Number.isFinite(seconds)) return '0s'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.slice(0, 2).join(' ')
}

/**
 * Evaluate Wi-Fi signal percentage (0-100%) into standardized grade, label, and variant
 */
export function evaluateSignalGrade(signalPct: number): SignalGrade {
  if (signalPct >= 90) {
    return { grade: 'A+', label: 'Excellent', variant: 'accent' }
  }
  if (signalPct >= 75) {
    return { grade: 'A', label: 'Good', variant: 'accent' }
  }
  if (signalPct >= 50) {
    return { grade: 'B', label: 'Fair', variant: 'warning' }
  }
  if (signalPct >= 25) {
    return { grade: 'C', label: 'Weak', variant: 'danger' }
  }
  if (signalPct > 0) {
    return { grade: 'D', label: 'Poor', variant: 'danger' }
  }
  return { grade: 'F', label: 'No Signal', variant: 'default' }
}

/**
 * Evaluate ICMP round-trip latency (ms) into standardized rating
 */
export function evaluateLatencyGrade(ms: number): LatencyGrade {
  if (ms <= 20) {
    return { grade: 'Optimal', variant: 'accent' }
  }
  if (ms <= 50) {
    return { grade: 'Good', variant: 'accent' }
  }
  if (ms <= 100) {
    return { grade: 'Moderate', variant: 'warning' }
  }
  if (ms <= 200) {
    return { grade: 'High', variant: 'danger' }
  }
  return { grade: 'Critical', variant: 'danger' }
}

/**
 * Sanitize IPv4 string and check validity
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip) return false
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipv4Regex.test(ip)) return false
  const parts = ip.split('.').map(Number)
  return parts.every((p) => p >= 0 && p <= 255)
}
