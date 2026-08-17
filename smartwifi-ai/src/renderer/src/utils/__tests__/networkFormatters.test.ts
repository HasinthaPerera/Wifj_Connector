import { describe, it, expect } from 'vitest'
import {
  formatBytes,
  formatBitrate,
  formatLatency,
  formatDuration,
  evaluateSignalGrade,
  evaluateLatencyGrade,
  isValidIpv4
} from '../networkFormatters'

describe('networkFormatters Utility Suite', () => {
  describe('formatBytes', () => {
    it('returns 0 B for non-positive or invalid inputs', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(-100)).toBe('0 B')
      expect(formatBytes(NaN)).toBe('0 B')
    })

    it('formats bytes correctly into KB, MB, and GB', () => {
      expect(formatBytes(500)).toBe('500 B')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(1048576)).toBe('1 MB')
      expect(formatBytes(1073741824)).toBe('1 GB')
    })
  })

  describe('formatBitrate', () => {
    it('returns 0 Mbps for zero or invalid bitrates', () => {
      expect(formatBitrate(0)).toBe('0 Mbps')
      expect(formatBitrate(-50)).toBe('0 Mbps')
    })

    it('formats Kbps, Mbps, and Gbps values', () => {
      expect(formatBitrate(500)).toBe('500 Kbps')
      expect(formatBitrate(2500)).toBe('2.5 Mbps')
      expect(formatBitrate(1500000)).toBe('1.5 Gbps')
    })
  })

  describe('formatLatency', () => {
    it('handles negative and non-finite inputs', () => {
      expect(formatLatency(-5)).toBe('-- ms')
      expect(formatLatency(NaN)).toBe('-- ms')
    })

    it('formats sub-millisecond and standard ping values', () => {
      expect(formatLatency(0.4)).toBe('< 1 ms')
      expect(formatLatency(14.8)).toBe('15 ms')
      expect(formatLatency(42)).toBe('42 ms')
    })
  })

  describe('formatDuration', () => {
    it('returns 0s for zero or negative duration', () => {
      expect(formatDuration(0)).toBe('0s')
      expect(formatDuration(-10)).toBe('0s')
    })

    it('formats seconds, minutes, hours, and days', () => {
      expect(formatDuration(45)).toBe('45s')
      expect(formatDuration(125)).toBe('2m 5s')
      expect(formatDuration(3665)).toBe('1h 1m')
      expect(formatDuration(90000)).toBe('1d 1h')
    })
  })

  describe('evaluateSignalGrade', () => {
    it('grades Wi-Fi signal percentages correctly', () => {
      expect(evaluateSignalGrade(95)).toEqual({
        grade: 'A+',
        label: 'Excellent',
        variant: 'accent'
      })
      expect(evaluateSignalGrade(80)).toEqual({ grade: 'A', label: 'Good', variant: 'accent' })
      expect(evaluateSignalGrade(60)).toEqual({ grade: 'B', label: 'Fair', variant: 'warning' })
      expect(evaluateSignalGrade(30)).toEqual({ grade: 'C', label: 'Weak', variant: 'danger' })
      expect(evaluateSignalGrade(10)).toEqual({ grade: 'D', label: 'Poor', variant: 'danger' })
      expect(evaluateSignalGrade(0)).toEqual({ grade: 'F', label: 'No Signal', variant: 'default' })
    })
  })

  describe('evaluateLatencyGrade', () => {
    it('classifies latency ranges into appropriate ratings', () => {
      expect(evaluateLatencyGrade(15)).toEqual({ grade: 'Optimal', variant: 'accent' })
      expect(evaluateLatencyGrade(40)).toEqual({ grade: 'Good', variant: 'accent' })
      expect(evaluateLatencyGrade(80)).toEqual({ grade: 'Moderate', variant: 'warning' })
      expect(evaluateLatencyGrade(150)).toEqual({ grade: 'High', variant: 'danger' })
      expect(evaluateLatencyGrade(250)).toEqual({ grade: 'Critical', variant: 'danger' })
    })
  })

  describe('isValidIpv4', () => {
    it('validates correct IPv4 addresses', () => {
      expect(isValidIpv4('192.168.1.1')).toBe(true)
      expect(isValidIpv4('10.0.0.255')).toBe(true)
      expect(isValidIpv4('8.8.8.8')).toBe(true)
    })

    it('rejects invalid IPv4 formats and out-of-bound octets', () => {
      expect(isValidIpv4('')).toBe(false)
      expect(isValidIpv4('256.100.0.1')).toBe(false)
      expect(isValidIpv4('192.168.1')).toBe(false)
      expect(isValidIpv4('abc.def.ghi.jkl')).toBe(false)
    })
  })
})
