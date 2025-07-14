/**
 * @fileoverview Corresponds to draw_nline() from orig/Sources/Draw.c:944
 */

import type { MonochromeBitmap } from '../../types'
import { SCRWTH } from '../../../screen/constants'

/**
 * Draws north/south (vertical) lines
 * @see orig/Sources/Draw.c:944 draw_nline()
 * @param deps - Dependencies object containing:
 *   @param x - X coordinate
 *   @param y - Y coordinate
 *   @param len - Length of the line
 *   @param u_d - Direction flag (not used, but 4567 has special meaning)
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawNline =
  (deps: { x: number; y: number; len: number; u_d: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x, y, len, u_d } = deps
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    let mask: number

    // Special case handling (lines 950-957)
    if (u_d === 4567) {
      mask = 1 << 15
    } else if ((x & 0x000f) === 15) {
      // At right edge of word, may need to draw on next word
      if (x < SCRWTH - 1) {
        return drawNline({ x: x + 1, y, len, u_d: 4567 })(newScreen)
      }
      mask = 1
    } else {
      // Normal case - create mask for 2 pixels
      mask = 3 << (14 - (x & 0x000f))
    }

    // Assembly drawing logic (lines 960-992)
    // Calculate screen address
    const byteX = (x >> 3) & 0xfffe
    let address = y * screen.rowBytes + byteX

    // Calculate loop counts
    const fastLoopCount = len >> 3
    const remainder = len & 7

    // Fast loop - draw 8 pixels at a time (lines 976-985)
    for (let i = 0; i < fastLoopCount; i++) {
      orToScreen16(newScreen, address, mask)
      orToScreen16(newScreen, address + 64 * 1, mask)
      orToScreen16(newScreen, address + 64 * 2, mask)
      orToScreen16(newScreen, address + 64 * 3, mask)
      orToScreen16(newScreen, address + 64 * 4, mask)
      orToScreen16(newScreen, address + 64 * 5, mask)
      orToScreen16(newScreen, address + 64 * 6, mask)
      orToScreen16(newScreen, address + 64 * 7, mask)
      address += 64 * 8
    }

    // Remainder loop - draw remaining pixels (lines 987-989)
    for (let i = 0; i <= remainder; i++) {
      orToScreen16(newScreen, address, mask)
      address += 64
    }

    return newScreen
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
