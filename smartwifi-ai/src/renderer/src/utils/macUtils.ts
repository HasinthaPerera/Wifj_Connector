/**
 * A fast, offline mapping dictionary of Organizationally Unique Identifiers (OUI)
 * to network hardware manufacturers.
 */
const OUI_DICTIONARY: Record<string, string> = {
  'A4:C3:F0': 'Intel Corporation',
  'BC:3B:AD': 'Realtek Semiconductor',
  '8C:3B:AD': 'Realtek Semiconductor',
  '00:0A:95': 'Apple, Inc.',
  '00:14:22': 'Dell Inc.',
  '00:0F:B5': 'Netgear Inc.',
  '00:1E:67': 'Intel Corporation',
  '40:F2:01': 'Linksys',
  'BC:F4:C8': 'Samsung Electronics',
  '00:1A:11': 'Google LLC',
  'E4:E4:AB': 'Huawei Technologies',
  '00:24:D7': 'Intel Corporation',
  '00:1C:42': 'Parallels (Virtual MAC)',
  '00:15:5D': 'Microsoft (Hyper-V)',
  '08:00:27': 'Oracle (VirtualBox)',
  '00:0C:29': 'VMware Inc.',
  '00:50:56': 'VMware Inc.'
}

/**
 * Standardizes any MAC address input into uppercase colon-delimited format (XX:XX:XX:XX:XX:XX)
 */
export function formatMacAddress(mac: string): string {
  if (!mac) return '—'
  // Strip all non-hex characters
  const hex = mac.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
  if (hex.length !== 12) return mac // Return original if format is unexpected

  // Split into 6 pairs
  const pairs: string[] = []
  for (let i = 0; i < 12; i += 2) {
    pairs.push(hex.substring(i, i + 2))
  }
  return pairs.join(':')
}

/**
 * Resolves the hardware vendor manufacturer name based on the MAC Address OUI (first 3 octets).
 * Defaults to "Unknown Vendor" if not matched.
 */
export function getMacManufacturer(mac: string): string {
  if (!mac) return 'Unknown Vendor'

  // Format and extract first 3 octets (OUI block)
  const formatted = formatMacAddress(mac)
  const oui = formatted.substring(0, 8).toUpperCase()

  return OUI_DICTIONARY[oui] || 'Unknown Vendor'
}
