/**
 * @fileoverview Corresponds to draw_neline() from orig/Sources/Draw.c:1110
 * Draws a northeast diagonal line (2 pixels wide)
 */

import type { MonochromeBitmap } from '../../types'
import { SCRWTH } from '../../../screen/constants'
import { jsrBAddress } from '../../../asm/assemblyMacros'

/**
 * Helper to OR a 16-bit word into a byte array in big-endian order.
 */
const orWord = (data: Uint8Array, address: number, value: number) => {
  if (address >= 0 && address + 1 < data.length) {
    data[address]! |= (value >>> 8) & 0xff
    data[address + 1]! |= value & 0xff
  }
}

/**
 * Draw a northeast diagonal line (45-degree angle, 2 pixels wide)
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: positive for down-right, negative/zero for up-left
 * @see orig/Sources/Draw.c:1110 draw_neline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawNeline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x, y, len: lenParam, dir } = deps
    let len = lenParam
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    // Boundary check from original (line 1117)
    if (x + len + 1 >= SCRWTH) {
      len--
    }

    if (len < 0) return newScreen

    // Calculate byte address using JSR_BADDRESS
    let address = jsrBAddress(0, x, y)

    // Get bit position within byte (0-7)
    const bitPos = x & 7

    // Initial 16-bit mask for a 2-pixel wide line (1100...)
    let mask = 0xc000 >>> bitPos

    // Row offset: 64 bytes per row
    const rowOffset = dir > 0 ? 64 : -64

    // A dbra loop runs N+1 times, so we iterate from 0 to len.
    for (let i = 0; i <= len; i++) {
      // Perform a 16-bit OR write to draw the 2-pixel wide segment
      orWord(newScreen.data, address, mask)

      // Move screen address to the next row
      address += rowOffset

      // Emulate a 16-bit right rotation (ror.w #1)
      const carry = mask & 1
      mask >>>= 1
      if (carry) {
        // The bit rotated out of the LSB is moved into the MSB
        mask |= 0x8000
        // A carry also signifies that the pattern has wrapped around the 16-bit
        // word, meaning we have crossed a byte boundary horizontally.
        address += 1
      }
    }

    return newScreen
  }
