/**
 * Real-Time Bandwidth & Latency Speed Test Runner
 * Measures real internet connection speeds using adaptive multi-probe HTTP payload streaming.
 * Uses exact byte accounting (actualBytes / actualSeconds) with zero hardcoded fallbacks,
 * ensuring accuracy across all connection speeds (from 1 Mbps to 1000 Mbps).
 */

export interface SpeedTestCallbacks {
  onPhaseChange?: (phase: 'idle' | 'ping' | 'download' | 'upload' | 'completed') => void
  onProgress?: (progressPercent: number) => void
  onPingUpdate?: (pingMs: number, jitterMs: number) => void
  onDownloadUpdate?: (currentMbps: number) => void
  onUploadUpdate?: (currentMbps: number) => void
  onServerDetected?: (serverName: string) => void
}

export interface SpeedTestFinalResult {
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
  server: string
}

const CLOUDFLARE_DOWN_URL = 'https://speed.cloudflare.com/__down'
const CLOUDFLARE_UP_URL = 'https://speed.cloudflare.com/__up'

/**
 * Format raw speed in Mbps to human readable speed string with appropriate unit (Kbps, Mbps, or Gbps).
 */
export function formatSpeedUnit(mbps: number): { value: string; unit: string; rawMbps: number } {
  if (mbps <= 0.001) {
    return { value: '0.0', unit: 'Mbps', rawMbps: 0 }
  }
  if (mbps < 1.0) {
    const kbps = Math.round(mbps * 1000)
    return { value: kbps.toLocaleString(), unit: 'Kbps', rawMbps: mbps }
  }
  if (mbps >= 1000) {
    const gbps = (mbps / 1000).toFixed(2)
    return { value: gbps, unit: 'Gbps', rawMbps: mbps }
  }
  return { value: mbps.toFixed(2), unit: 'Mbps', rawMbps: mbps }
}

/**
 * Runs a complete 3-phase real speed test:
 * 1. Ping & Jitter measurement (5 probes)
 * 2. Adaptive Download measurement (500KB -> 2.5MB -> 5MB probes)
 * 3. Adaptive Upload measurement (500KB -> 1.5MB POST probes)
 */
export async function executeRealSpeedTest(
  callbacks: SpeedTestCallbacks,
  abortSignal?: AbortSignal
): Promise<SpeedTestFinalResult> {
  const {
    onPhaseChange,
    onProgress,
    onPingUpdate,
    onDownloadUpdate,
    onUploadUpdate,
    onServerDetected
  } = callbacks

  let detectedServer = 'Cloudflare Edge Network'

  // Attempt ISP & Server Node detection via IPC
  try {
    if (window.api?.getPublicIp) {
      const publicIp = await window.api.getPublicIp()
      if (publicIp && publicIp.isp) {
        detectedServer = `${publicIp.isp} (${publicIp.location || publicIp.countryCode})`
      }
    }
  } catch (err) {
    console.warn('Could not detect ISP node:', err)
  }
  onServerDetected?.(detectedServer)

  // ---------------------------------------------------------
  // Phase 1: Ping & Jitter Measurement (0% -> 20%)
  // ---------------------------------------------------------
  onPhaseChange?.('ping')
  onProgress?.(5)

  const pings: number[] = []
  const pingSamplesCount = 5

  for (let i = 0; i < pingSamplesCount; i++) {
    if (abortSignal?.aborted) throw new Error('Test aborted')

    const startTime = performance.now()
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`${CLOUDFLARE_DOWN_URL}?bytes=100&r=${Math.random()}`, {
        cache: 'no-store',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (res.ok) {
        const duration = performance.now() - startTime
        pings.push(duration)
      }
    } catch {
      // Ignore dropped ping probe
    }

    onProgress?.(Math.round(5 + ((i + 1) / pingSamplesCount) * 15))

    const avgPing = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0
    const jitter =
      pings.length > 1
        ? Math.round(
            pings.slice(1).reduce((acc, val, idx) => acc + Math.abs(val - pings[idx]), 0) /
              (pings.length - 1)
          )
        : 0

    onPingUpdate?.(avgPing, jitter)
    await new Promise((r) => setTimeout(r, 60))
  }

  const finalPing = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0
  const finalJitter =
    pings.length > 1
      ? Math.round(
          pings.slice(1).reduce((acc, val, idx) => acc + Math.abs(val - pings[idx]), 0) /
            (pings.length - 1)
        )
      : 0

  onPingUpdate?.(finalPing, finalJitter)

  // ---------------------------------------------------------
  // Phase 2: Adaptive Download Speed Measurement (20% -> 60%)
  // ---------------------------------------------------------
  onPhaseChange?.('download')
  onProgress?.(20)

  // Probe progression sizes: 500KB -> 2.5MB -> 5MB
  const downloadProbeSizes = [500_000, 2_500_000, 5_000_000]
  const downloadSamples: number[] = []

  let totalDownloadBytes = 0
  let totalDownloadTimeSec = 0

  for (let probeIdx = 0; probeIdx < downloadProbeSizes.length; probeIdx++) {
    if (abortSignal?.aborted) throw new Error('Test aborted')

    const probeBytes = downloadProbeSizes[probeIdx]
    const probeStartTime = performance.now()
    let probeBytesReceived = 0

    try {
      const controller = new AbortController()
      // 8s max per probe to handle slower connections gracefully
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(
        `${CLOUDFLARE_DOWN_URL}?bytes=${probeBytes}&r=${Math.random()}`,
        {
          cache: 'no-store',
          signal: controller.signal
        }
      )
      clearTimeout(timeoutId)

      if (response.ok && response.body) {
        const reader = response.body.getReader()
        let lastReportTime = probeStartTime

        while (true) {
          if (abortSignal?.aborted) {
            reader.cancel()
            throw new Error('Test aborted')
          }
          const { done, value } = await reader.read()
          if (done) break

          probeBytesReceived += value.length
          const now = performance.now()
          const elapsedSec = (now - probeStartTime) / 1000

          // Calculate real-time speed
          if (elapsedSec > 0.05 && now - lastReportTime >= 60) {
            const currentMbps = (probeBytesReceived * 8) / (elapsedSec * 1_000_000)
            onDownloadUpdate?.(parseFloat(currentMbps.toFixed(2)))
            lastReportTime = now
          }
        }
      }
    } catch (err) {
      console.warn(`Download probe ${probeIdx + 1} interrupted:`, err)
    }

    const probeEndTime = performance.now()
    const probeDurationSec = (probeEndTime - probeStartTime) / 1000

    if (probeBytesReceived > 0 && probeDurationSec > 0.05) {
      const probeMbps = (probeBytesReceived * 8) / (probeDurationSec * 1_000_000)
      downloadSamples.push(probeMbps)
      totalDownloadBytes += probeBytesReceived
      totalDownloadTimeSec += probeDurationSec
    }

    onProgress?.(Math.round(20 + ((probeIdx + 1) / downloadProbeSizes.length) * 40))

    // If initial probe reveals speed is slow (< 15 Mbps), stop downloading further probes
    // to avoid dragging out the test duration
    if (downloadSamples.length > 0) {
      const currentAvgMbps = downloadSamples.reduce((a, b) => a + b, 0) / downloadSamples.length
      if (currentAvgMbps < 15 && probeIdx >= 0) {
        onProgress?.(60)
        break
      }
    }
  }

  // Exact download speed calculated from total bytes downloaded divided by total time
  let finalDownloadMbps = 0
  if (totalDownloadBytes > 0 && totalDownloadTimeSec > 0) {
    finalDownloadMbps = parseFloat(
      ((totalDownloadBytes * 8) / (totalDownloadTimeSec * 1_000_000)).toFixed(2)
    )
  } else if (downloadSamples.length > 0) {
    finalDownloadMbps = parseFloat(
      (downloadSamples.reduce((a, b) => a + b, 0) / downloadSamples.length).toFixed(2)
    )
  }
  onDownloadUpdate?.(finalDownloadMbps)
  onProgress?.(60)

  // ---------------------------------------------------------
  // Phase 3: Adaptive Upload Speed Measurement (60% -> 95%)
  // ---------------------------------------------------------
  onPhaseChange?.('upload')

  // Probe upload sizes: 250KB -> 1MB -> 2MB
  const uploadProbeSizes = [250_000, 1_000_000, 2_000_000]
  const uploadSamples: number[] = []

  let totalUploadBytes = 0
  let totalUploadTimeSec = 0

  for (let probeIdx = 0; probeIdx < uploadProbeSizes.length; probeIdx++) {
    if (abortSignal?.aborted) throw new Error('Test aborted')

    const probeBytes = uploadProbeSizes[probeIdx]
    const payload = new Uint8Array(probeBytes)

    let bytesSentInProbe = 0
    let durationInProbe = 0

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${CLOUDFLARE_UP_URL}?r=${Math.random()}`, true)

        const startTime = performance.now()
        let lastReportTime = startTime

        xhr.upload.onprogress = (e) => {
          if (abortSignal?.aborted) {
            xhr.abort()
            reject(new Error('Test aborted'))
            return
          }

          const now = performance.now()
          const elapsedSec = (now - startTime) / 1000

          if (elapsedSec > 0.05 && now - lastReportTime >= 60) {
            const currentMbps = (e.loaded * 8) / (elapsedSec * 1_000_000)
            onUploadUpdate?.(parseFloat(currentMbps.toFixed(2)))
            lastReportTime = now
          }
        }

        xhr.onload = () => {
          const endTime = performance.now()
          bytesSentInProbe = probeBytes
          durationInProbe = (endTime - startTime) / 1000
          resolve()
        }
        xhr.onerror = () => reject(new Error('XHR upload error'))
        xhr.ontimeout = () => reject(new Error('XHR timeout'))
        xhr.timeout = 8000

        xhr.send(payload)
      })
    } catch (err) {
      console.warn(`Upload probe ${probeIdx + 1} interrupted:`, err)
    }

    if (bytesSentInProbe > 0 && durationInProbe > 0.05) {
      const probeMbps = (bytesSentInProbe * 8) / (durationInProbe * 1_000_000)
      uploadSamples.push(probeMbps)
      totalUploadBytes += bytesSentInProbe
      totalUploadTimeSec += durationInProbe
    }

    onProgress?.(Math.round(60 + ((probeIdx + 1) / uploadProbeSizes.length) * 35))

    // If upload speed is low (< 5 Mbps), finish upload phase early
    if (uploadSamples.length > 0) {
      const currentAvg = uploadSamples.reduce((a, b) => a + b, 0) / uploadSamples.length
      if (currentAvg < 5 && probeIdx >= 0) {
        onProgress?.(95)
        break
      }
    }
  }

  let finalUploadMbps = 0
  if (totalUploadBytes > 0 && totalUploadTimeSec > 0) {
    finalUploadMbps = parseFloat(
      ((totalUploadBytes * 8) / (totalUploadTimeSec * 1_000_000)).toFixed(2)
    )
  } else if (uploadSamples.length > 0) {
    finalUploadMbps = parseFloat(
      (uploadSamples.reduce((a, b) => a + b, 0) / uploadSamples.length).toFixed(2)
    )
  }
  onUploadUpdate?.(finalUploadMbps)

  // ---------------------------------------------------------
  // Finalizing (95% -> 100%)
  // ---------------------------------------------------------
  onPhaseChange?.('completed')
  onProgress?.(100)

  return {
    downloadMbps: finalDownloadMbps,
    uploadMbps: finalUploadMbps,
    pingMs: finalPing,
    jitterMs: finalJitter,
    server: detectedServer
  }
}
