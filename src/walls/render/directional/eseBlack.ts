/**
 * @fileoverview Corresponds to ese_black() from orig/Sources/Walls.c:734
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import {
  VIEWHT,
  SCRWTH,
  SBARHT
} from '../../../screen/constants'
import { jsrWAddress } from '../../../asm/assemblyMacros'
import { drawEseline } from '../lines/drawEseline'
import { getBackground } from '../getBackground'

// Masks from orig/Sources/Walls.c:728-729
const ESE_MASK = 0xfc000000
const ESE_VAL = 0x3c000000

/**
 * Draws black parts of ESE (East-South-East) lines
 * @see orig/Sources/Walls.c:734 ese_black()
 */
export const eseBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps

    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    let x = line.startx - scrx
    let y = line.starty - scry
    let h1 = 0
    let h4 = line.length - 1

    // Calculate h1 boundaries (lines 747-752)
    if (x + h1 < 2) {
      h1 = 2 - x
    }
    if (y + (h1 >> 1) < 0) {
      h1 = -y << 1
    }
    if (h1 & 1) {
      h1++
    }

    // Calculate h4 boundaries (lines 753-758)
    if (x + h4 > SCRWTH - 2) {
      h4 = SCRWTH - 2 - x
    }
    if (y + (h4 >> 1) > VIEWHT) {
      h4 = (VIEWHT - y) << 1
    }
    if (h4 & 1) {
      h4-- // ensure even
    }
    if (h4 <= h1) {
      return newScreen
    }

    // Calculate h2 and h3 (lines 761-770)
    let h2 = 12
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > h4) {
      h2 = h4
    }

    let h3 = line.length - 5
    if (h3 > h4) {
      h3 = h4
    }
    if (h3 < h2) {
      h3 = h2
    }

    y += SBARHT

    const startx = x + h1
    const starty = y + (h1 >> 1)

    // Draw end line if needed (lines 777-778)
    if (h3 < h4) {
      drawEseline(newScreen, x + h3, y + (h3 >> 1), h4 - h3)
    }

    x += h2 - 2
    y += h2 >> 1

    // Calculate EOR patterns (lines 783-784)
    const background = getBackground(x, y, scrx, scry)
    const eor1 = (background[(x + y) & 1]! & ESE_MASK) ^ ESE_VAL
    const eor2 = (background[(x + y + 1) & 1]! & ESE_MASK) ^ ESE_VAL

    // Main drawing section (lines 786-829)
    if (h2 < h3) {
      // Calculate screen address using JSR_WADDRESS
      let address = jsrWAddress(0, x, y)

      // Shift the EOR patterns based on x position
      const shift = x & 15
      let d0 = eor1 >>> shift
      let d1 = eor2 >>> shift
      d1 >>>= 2 // Additional shift for eor2

      let d2 = (h3 - h2) >> 1

      // Fast loop (4 lines at a time)
      while (d2 >= 4) {
        eorToScreen32(newScreen, address, d0)
        eorToScreen32(newScreen, address + 64, d1)
        d0 >>>= 4
        d1 >>>= 4
        eorToScreen32(newScreen, address + 64 * 2, d0)
        eorToScreen32(newScreen, address + 64 * 3, d1)
        d0 >>>= 4
        d1 >>>= 4
        address += 64 * 4

        // Check if we need to wrap to next word
        if ((d1 & 0xff) === 0) {
          d0 = swapWords(d0)
          d1 = swapWords(d1)
          address += 2
        }
        d2 -= 4
      }

      // Handle remainder
      while (d2 > 0) {
        eorToScreen32(newScreen, address, d0)
        if (d2 > 1) {
          eorToScreen32(newScreen, address + 64, d1)
        }
        address += 128
        d0 >>>= 4
        d1 >>>= 4
        d2--
      }
    }

    // Draw start line if needed (lines 832-833)
    if (h1 < h2) {
      drawEseline(newScreen, startx, starty, h2 - h1)
    }

    return newScreen
  }

/**
 * Helper function to swap high and low words of a 32-bit value
 */
function swapWords(value: number): number {
  return ((value >>> 16) | (value << 16)) >>> 0
}

/**
 * Helper function to EOR a 32-bit value into screen memory
 */
function eorToScreen32(
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

    // EOR into screen buffer
    screen.data[address]! ^= byte3
    screen.data[address + 1]! ^= byte2
    screen.data[address + 2]! ^= byte1
    screen.data[address + 3]! ^= byte0
  }
}
