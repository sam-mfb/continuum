/**
 * Original 256-byte sine wave lookup table from Mac resource M_SINEWAVE (ID 257)
 *
 * This is the exact sine wave data used by the original Continuum game
 * for all tone generation (clear_tone() function).
 */

// Convert hex string to Uint8Array
const hexString =
  '808283858688898B8C8E909193949697989A9B9D9EA0A1A2A4A5A6A7A9AAABACADAEAFB0B1B2B3B4B5B6B7B8B8B9BABBBBBCBCBDBDBEBEBEBFBFBFC0C0C0C0C0C0C0C0C0C0C0BFBFBFBEBEBEBDBDBCBCBBBBBAB9B8B8B7B6B5B4B3B2B1B0AFAEADACABAAA9A7A6A5A4A2A1A09E9D9B9A989796949391908E8C8B898886858382807E7D7B7A7877757472706F6D6C6A696866656362605F5E5C5B5A5957565554535251504F4E4D4C4B4A4948484746454544444343424242414141404040404040404040404041414142424243434444454546474848494A4B4C4D4E4F5051525354555657595A5B5C5E5F606263656668696A6C6D6F7072747577787A7B7D7E'

// Create the sine table by parsing hex pairs
const createSineTable = (): Uint8Array => {
  const table = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    const hexByte = hexString.substring(i * 2, i * 2 + 2)
    table[i] = parseInt(hexByte, 16)
  }
  return table
}

// Export the sine table as a constant
export const SINE_TABLE = createSineTable()

// Verify it's the correct size
if (SINE_TABLE.length !== 256) {
  throw new Error(`Invalid sine table size: ${SINE_TABLE.length}, expected 256`)
}
