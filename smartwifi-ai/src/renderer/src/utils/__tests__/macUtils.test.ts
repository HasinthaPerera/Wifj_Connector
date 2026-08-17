import { describe, it, expect } from 'vitest'
import { formatMacAddress, getMacManufacturer } from '../macUtils'

describe('macUtils Utility Suite', () => {
  describe('formatMacAddress', () => {
    it('returns dash for empty string', () => {
      expect(formatMacAddress('')).toBe('—')
    })

    it('formats unformatted 12-digit hex strings into colon-separated uppercase MAC', () => {
      expect(formatMacAddress('a4c3f08b2e11')).toBe('A4:C3:F0:8B:2E:11')
      expect(formatMacAddress('001422000000')).toBe('00:14:22:00:00:00')
    })

    it('handles hyphen-separated or space-separated MAC strings', () => {
      expect(formatMacAddress('a4-c3-f0-8b-2e-11')).toBe('A4:C3:F0:8B:2E:11')
    })
  })

  describe('getMacManufacturer', () => {
    it('returns Unknown Vendor for empty input', () => {
      expect(getMacManufacturer('')).toBe('Unknown Vendor')
    })

    it('resolves known vendor OUIs correctly', () => {
      expect(getMacManufacturer('A4:C3:F0:8B:2E:11')).toBe('Intel Corporation')
      expect(getMacManufacturer('00:14:22:11:22:33')).toBe('Dell Inc.')
      expect(getMacManufacturer('00:0A:95:AA:BB:CC')).toBe('Apple, Inc.')
      expect(getMacManufacturer('00:15:5D:12:34:56')).toBe('Microsoft (Hyper-V)')
    })

    it('returns Unknown Vendor for unrecognized OUIs', () => {
      expect(getMacManufacturer('FF:FF:FF:00:00:00')).toBe('Unknown Vendor')
    })
  })
})
