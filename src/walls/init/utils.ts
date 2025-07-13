/**
 * Utility functions for wall initialization
 */

/**
 * Converts 16-bit pattern array to flat byte array (as numbers for Redux serialization)
 * Each 16-bit value becomes two numbers: high byte, then low byte (big-endian)
 * 
 * ARCHITECTURE NOTE: The original 68K Mac code stored these patterns as 16-bit 
 * big-endian values in memory. The bitmap rendering routines expect byte data
 * in big-endian order (high byte first). This conversion ensures our JavaScript
 * implementation maintains the same byte order as the original, regardless of
 * the host system's endianness.
 * 
 * @param pattern Array of 16-bit integers representing bitmap pattern
 * @returns Flat array of bytes as numbers
 * 
 * @example
 * patternToByteArray([0xFFFF, 0x3FFF]) => [0xFF, 0xFF, 0x3F, 0xFF]
 */
export function patternToByteArray(pattern: number[]): number[] {
  const bytes: number[] = []
  for (const value of pattern) {
    bytes.push((value >>> 8) & 0xff)  // High byte
    bytes.push(value & 0xff)          // Low byte
  }
  return bytes
}