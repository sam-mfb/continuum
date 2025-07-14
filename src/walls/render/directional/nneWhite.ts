/**
 * @fileoverview Corresponds to nne_white() from orig/Sources/Walls.c:63
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'

// Mask from orig/Sources/Walls.c:22
const NNE_MASK = 0x000fffff

/**
 * Draws white parts of NNE (North-North-East) lines
 * @see orig/Sources/Walls.c:63 nne_white()
 */
export const nneWhite = (
  screen: MonochromeBitmap,
  linerec: LineRec,
  scrx: number,
  scry: number
): MonochromeBitmap => {
  // Deep clone the screen bitmap for immutability
  const newScreen: MonochromeBitmap = {
    data: new Uint8Array(screen.data),
    width: screen.width,
    height: screen.height,
    rowBytes: screen.rowBytes
  }
  let x = linerec.startx - scrx
  let y = linerec.starty - scry

  // Calculate h1-h4 boundaries (lines 73-99)
  let h1 = 0
  let h4 = linerec.length - 5

  // Adjust h1 for left edge clipping
  if (x + (h1 >> 1) < -11) {
    h1 = (-11 - x) << 1
  }
  if (y - h1 > VIEWHT - 1) {
    h1 = y - (VIEWHT - 1)
  }
  if (h1 & 1) {
    h1++
  }

  // Adjust h4 for right/top edge clipping
  if (x + (h4 >> 1) > SCRWTH) {
    h4 = (SCRWTH - x) << 1
  }
  if (y - h4 < -1) {
    h4 = y + 1
  }
  if (h4 & 1) {
    h4--
  }

  // Calculate h2 and h3
  let h2 = h1
  if (x + (h2 >> 1) < 0) {
    h2 = -x << 1
  }
  if (h2 & 1) {
    h2++
  }
  if (h2 > h4) {
    h2 = h4
  }

  let h3 = h4
  if (x + (h3 >> 1) > SCRWTH - 12) {
    h3 = (SCRWTH - 12 - x) << 1
  }
  if (h3 < h2) {
    h3 = h2
  }

  // Calculate positions for drawing
  const leftx = x + (h1 >> 1) + 11
  const lefty = y + SBARHT - h1
  const start = h2 - h1

  x += h2 >> 1
  y += SBARHT - h2
  let len = h3 - h2
  const end = h4 - h3

  // Main drawing section (lines 110-179)
  if (h2 < h4) {
    // Calculate screen address (JSR_WADDRESS)
    const byteX = (x >> 3) & 0xfffe
    let address = y * newScreen.rowBytes + byteX

    // Calculate bit position and mask
    const bitPos = x & 15
    let mask = NNE_MASK
    mask = rotateMaskRight(mask, bitPos)

    len >>= 1 // asr.w #1, len
    if (len > 0) {
      // Fast loop section (unrolled loop handling 4 iterations at once)
      const fastCount = len >> 2
      const remainder = len & 3

      for (let i = 0; i < fastCount; i++) {
        // Unrolled loop body - 8 AND operations
        andMaskToScreen(newScreen, address, mask)
        andMaskToScreen(newScreen, address - newScreen.rowBytes, mask)
        mask = rotateMaskRight(mask, 1)
        andMaskToScreen(newScreen, address - newScreen.rowBytes * 2, mask)
        andMaskToScreen(newScreen, address - newScreen.rowBytes * 3, mask)
        mask = rotateMaskRight(mask, 1)
        andMaskToScreen(newScreen, address - newScreen.rowBytes * 4, mask)
        andMaskToScreen(newScreen, address - newScreen.rowBytes * 5, mask)
        mask = rotateMaskRight(mask, 1)
        andMaskToScreen(newScreen, address - newScreen.rowBytes * 6, mask)
        andMaskToScreen(newScreen, address - newScreen.rowBytes * 7, mask)
        address -= newScreen.rowBytes * 8
        mask = rotateMaskRight(mask, 1)

        // Check if we need to wrap to next word
        if ((mask & 0x8) !== 0) {
          mask = swapWords(mask)
          address += 2
        }
      }

      // Handle remainder with slower loop
      for (let i = 0; i < remainder; i++) {
        andMaskToScreen(newScreen, address, mask)
        andMaskToScreen(newScreen, address - newScreen.rowBytes, mask)
        address -= newScreen.rowBytes * 2
        mask = rotateMaskRight(mask, 1)

        // Check if we need to wrap to next word
        if ((mask & 0x8) !== 0) {
          mask = swapWords(mask)
          address += 2
        }
      }
    }

    // Handle end section if needed (lines 166-177)
    if (end > 0) {
      mask = swapWords(mask)
      let endLen = end >> 1
      for (let i = 0; i <= endLen; i++) {
        andMaskToScreen16(newScreen, address, mask)
        andMaskToScreen16(newScreen, address - newScreen.rowBytes, mask)
        mask >>= 1
        address -= newScreen.rowBytes * 2
      }
    }
  }

  // Handle start section (lines 181-199)
  if (start > 0) {
    // Calculate screen address for left section
    const byteX = (leftx >> 3) & 0xfffe
    let address = lefty * newScreen.rowBytes + byteX

    let mask = 0x7fff
    mask >>= leftx & 15

    let startLen = start >> 1
    for (let i = 0; i <= startLen; i++) {
      andMaskToScreen16(newScreen, address, mask)
      andMaskToScreen16(newScreen, address - newScreen.rowBytes, mask)
      mask >>= 1
      address -= newScreen.rowBytes * 2
    }
  }

  return newScreen
}

/**
 * Helper function to rotate a 32-bit mask right
 */
function rotateMaskRight(mask: number, bits: number): number {
  // JavaScript doesn't have rotate, so we simulate with shift and OR
  bits = bits % 32
  if (bits === 0) return mask
  return ((mask >>> bits) | (mask << (32 - bits))) >>> 0
}

/**
 * Helper function to swap high and low words of a 32-bit value
 */
function swapWords(value: number): number {
  return ((value >>> 16) | (value << 16)) >>> 0
}

/**
 * Helper function to AND a 32-bit mask into screen memory
 */
function andMaskToScreen(
  screen: MonochromeBitmap,
  address: number,
  mask: number
): void {
  if (address >= 0 && address + 3 < screen.data.length) {
    // Extract bytes from the 32-bit value (big-endian order)
    const byte3 = (mask >>> 24) & 0xff
    const byte2 = (mask >>> 16) & 0xff
    const byte1 = (mask >>> 8) & 0xff
    const byte0 = mask & 0xff

    // AND into screen buffer
    screen.data[address]! &= byte3
    screen.data[address + 1]! &= byte2
    screen.data[address + 2]! &= byte1
    screen.data[address + 3]! &= byte0
  }
}

/**
 * Helper function to AND a 16-bit mask into screen memory
 */
function andMaskToScreen16(
  screen: MonochromeBitmap,
  address: number,
  mask: number
): void {
  if (address >= 0 && address + 1 < screen.data.length) {
    // Extract bytes from the 16-bit value (big-endian order)
    const byte1 = (mask >>> 8) & 0xff
    const byte0 = mask & 0xff

    // AND into screen buffer
    screen.data[address]! &= byte1
    screen.data[address + 1]! &= byte0
  }
}
