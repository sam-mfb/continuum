/**
 * @fileoverview Corresponds to draw_eline() from orig/Sources/Draw.c:1332
 */

import type { MonochromeBitmap } from '../../types'
import { SCRHT } from '../../../screen/constants'

/**
 * Draws east/west (horizontal) lines
 * @see orig/Sources/Draw.c:1332 draw_eline()
 * @param screen - The bitmap to draw on
 * @param x - X coordinate
 * @param y - Y coordinate  
 * @param len - Length of the line
 * @param u_d - Direction flag (not used)
 */
export const drawEline = (
  screen: MonochromeBitmap,
  x: number,
  y: number,
  len: number,
  _u_d: number
): void => {
  // Check if we should draw the lower line (line 1336-1339)
  const drawLower = y + 1 < SCRHT

  // Assembly drawing logic (lines 1340-1387)
  // Calculate screen address
  const byteX = (x >> 3) & 0xfffe
  let address = y * screen.rowBytes + byteX

  const shift = x & 15
  const totalBits = shift + len

  if (totalBits < 16) {
    // Short line case (lines 1349-1359)
    let mask = 0xffff
    mask >>>= 1
    mask >>>= len
    mask = rotateRight16(mask, shift)
    mask = ~mask & 0xffff

    orToScreen16(screen, address, mask)
    if (drawLower) {
      orToScreen16(screen, address + 64, mask)
    }
  } else {
    // Normal case (lines 1361-1385)
    // First partial word
    let mask = 0xffff >>> shift
    orToScreen16(screen, address, mask)
    if (drawLower) {
      orToScreen16(screen, address + 64, mask)
    }
    address += 2

    // Calculate remaining length
    let remainingLen = len - 15 + shift

    // Full 32-bit words
    while (remainingLen >= 32) {
      orToScreen32(screen, address, 0xffffffff)
      if (drawLower) {
        orToScreen32(screen, address + 64, 0xffffffff)
      }
      address += 4
      remainingLen -= 32
    }

    // Last partial word
    if (remainingLen > 0) {
      const finalMask = ~(0xffffffff >>> remainingLen)
      orToScreen32(screen, address, finalMask)
      if (drawLower) {
        orToScreen32(screen, address + 64, finalMask)
      }
    }
  }
}

/**
 * Helper function to rotate a 16-bit value right
 */
function rotateRight16(value: number, bits: number): number {
  bits = bits % 16
  if (bits === 0) return value
  return ((value >>> bits) | (value << (16 - bits))) & 0xffff
}

/**
 * Helper function to OR a 16-bit value into screen memory
 */
function orToScreen16(
  screen: MonochromeBitmap,
  address: number,
  value: number
): void {
  if (address >= 0 && address + 1 < screen.data.length) {
    // Extract bytes from the 16-bit value (big-endian order)
    const byte1 = (value >>> 8) & 0xff
    const byte0 = value & 0xff

    // OR into screen buffer
    screen.data[address]! |= byte1
    screen.data[address + 1]! |= byte0
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
