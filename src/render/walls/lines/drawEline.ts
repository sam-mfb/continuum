/**
 * @fileoverview Corresponds to draw_eline() from orig/Sources/Draw.c:1332
 */

import type { MonochromeBitmap } from '@core/walls'
import { SCRHT } from '@core/screen'
import { jsrWAddress } from '@lib/asm/assemblyMacros'

/**
 * Draws east/west (horizontal) lines
 * @see orig/Sources/Draw.c:1332 draw_eline()
 * @param deps - Dependencies object containing:
 *   @param x - X coordinate
 *   @param y - Y coordinate
 *   @param len - Length of the line
 *   @param u_d - Direction flag (not used)
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawEline =
  (deps: { x: number; y: number; len: number; u_d: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x, y, len } = deps
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    // Check if we should draw the lower line (line 1336-1339)
    const drawLower = y + 1 < SCRHT

    // Assembly drawing logic (lines 1340-1387)
    // Calculate screen address using JSR_WADDRESS
    let address = jsrWAddress(0, x, y)

    const shift = x & 15
    const totalBits = shift + len

    if (totalBits < 16) {
      // Short line case (lines 1349-1359)
      let mask = 0xffff
      mask >>>= 1
      mask >>>= len
      mask = rotateRight16(mask, shift)
      mask = ~mask & 0xffff

      orToScreen16(newScreen, address, mask)
      if (drawLower) {
        orToScreen16(newScreen, address + 64, mask)
      }
    } else {
      // Normal case (lines 1361-1385)
      // First partial word
      let mask = 0xffff >>> shift
      orToScreen16(newScreen, address, mask)
      if (drawLower) {
        orToScreen16(newScreen, address + 64, mask)
      }
      address += 2

      // Calculate remaining length
      let remainingLen = len - 15 + shift

      // Full 32-bit words
      while (remainingLen >= 32) {
        orToScreen32(newScreen, address, 0xffffffff)
        if (drawLower) {
          orToScreen32(newScreen, address + 64, 0xffffffff)
        }
        address += 4
        remainingLen -= 32
      }

      // Last partial word
      if (remainingLen > 0) {
        const finalMask = ~(0xffffffff >>> remainingLen)
        orToScreen32(newScreen, address, finalMask)
        if (drawLower) {
          orToScreen32(newScreen, address + 64, finalMask)
        }
      }
    }

    return newScreen
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
