/**
 * @fileoverview Corresponds to eseline() from orig/Sources/Walls.c:837
 */

import type { MonochromeBitmap } from '../../types'
import { findWAddress } from '../../../asm/assemblyMacros'

/**
 * Draws ESE line segments
 * @see orig/Sources/Walls.c:837 eseline()
 * @param screen - The screen bitmap to draw on
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param len - Length of the line
 */
export function drawEseline(
  screen: MonochromeBitmap,
  x: number,
  y: number,
  len: number
): void {
  // Calculate screen address using FIND_WADDRESS macro
  let address = findWAddress(0, x, y)

  // Create mask
  const shift = x & 15
  let mask = 0xf0000000 >>> shift

  const halfLen = (len >> 1) - 1

  for (let i = 0; i <= halfLen; i++) {
    orToScreen32(screen, address, mask)
    address += 64
    mask >>>= 2
  }
}

/**
 * Helper function to OR a 32-bit value into screen memory
 */
function orToScreen32(
  screen: MonochromeBitmap,
  address: number,
  value: number
): void {
  if (address >= 0 && address + 3 < screen.data.length) {
    // Extract bytes from the 32-bit value (big-endian order)
    const byte3 = (value >>> 24) & 0xff
    const byte2 = (value >>> 16) & 0xff
    const byte1 = (value >>> 8) & 0xff
    const byte0 = value & 0xff

    // OR into screen buffer
    screen.data[address]! |= byte3
    screen.data[address + 1]! |= byte2
    screen.data[address + 2]! |= byte1
    screen.data[address + 3]! |= byte0
  }
}
