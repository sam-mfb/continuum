/**
 * @fileoverview Corresponds to se_black() from orig/Sources/Walls.c:867
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import {
  VIEWHT,
  SCRWTH,
  SBARHT
} from '../../../screen/constants'
import { drawNeline } from '../lines/drawNeline'
import { findWAddress } from '../../../asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'
import { getBackground } from '../getBackground'

// Masks from orig/Sources/Walls.c:861-862
const SE_MASK = 0xf8000000
const SE_VAL = 0xc0000000

/**
 * Draws black parts of SE (South-East) lines
 * @see orig/Sources/Walls.c:867 se_black()
 */
export const seBlack =
  (deps: { line: LineRec; scrx: number; scry: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { line, scrx, scry } = deps

    // Deep clone the screen bitmap for immutability
    let newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    let x = line.startx - scrx
    let y = line.starty - scry
    let h1 = 0
    const h5 = line.length + 1

    // Calculate h1 boundaries (lines 880-883)
    if (x + h1 < 0) {
      h1 = -x
    }
    if (y + h1 < 0) {
      h1 = -y
    }

    // Calculate h5 boundaries (lines 884-889)
    let adjustedH5 = h5
    if (x + h5 > SCRWTH) {
      adjustedH5 = SCRWTH - x
    }
    if (y + h5 > VIEWHT) {
      adjustedH5 = VIEWHT - y
    }
    if (h1 >= adjustedH5) {
      return newScreen
    }

    // Calculate h4 (lines 890-894)
    let h4 = line.h2 ?? adjustedH5
    if (h4 > adjustedH5) {
      h4 = adjustedH5
    }
    if (h4 < h1) {
      h4 = h1
    }

    // Calculate h2 (lines 895-899)
    let h2 = line.h1 ?? h1
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > h4) {
      h2 = h4
    }

    // Calculate h3 (lines 900-904)
    let h3 = h4
    if (x + h3 > SCRWTH - 16) {
      h3 = SCRWTH - 16 - x
    }
    if (h3 < h2) {
      h3 = h2
    }

    y += SBARHT
    const len = h3 - h2
    const end = h4 - h3

    // Draw short black-only pieces (lines 910-913)
    if (h2 > h1) {
      newScreen = drawNeline({
        x: x + h1,
        y: y + h1,
        len: h2 - h1 - 1,
        dir: LINE_DIR.DN
      })(newScreen)
    }
    if (adjustedH5 > h4) {
      newScreen = drawNeline({
        x: x + h4,
        y: y + h4,
        len: adjustedH5 - h4 - 1,
        dir: LINE_DIR.DN
      })(newScreen)
    }

    x += h2
    y += h2

    if (len <= 0 && end <= 0) {
      return newScreen
    }

    // Calculate EOR pattern (line 921)
    const background = getBackground(x, y, scrx, scry)
    const eor = (background[(x + y) & 1]! & SE_MASK) ^ SE_VAL

    // Assembly drawing logic (lines 923-958)
    // Calculate screen address using FIND_WADDRESS macro
    let address = findWAddress(0, x, y)

    // Rotate the EOR pattern based on x position
    const shift = x & 15
    let rotatedEor = rotateRight(eor, shift)

    let remainingLen = len - 1

    // Main drawing loop
    if (remainingLen >= 0) {
      // Loop until we need to switch to 16-bit operations
      while (remainingLen >= 0) {
        eorToScreen32(newScreen, address, rotatedEor)
        address += 64

        // Save the bit that will be rotated out (carry flag simulation)
        const carryBit = rotatedEor & 1
        rotatedEor = rotateRight(rotatedEor, 1)

        // dbcs: decrement and branch if carry set is false (carry clear)
        // If carry bit was 0, we continue the loop
        // If carry bit was 1, we fall through to swap
        remainingLen--
        if (carryBit === 1) {
          // Carry set, fall through to swap
          rotatedEor = swapWords(rotatedEor)
          address += 2
          remainingLen--
          break
        }
      }

      // Continue with remaining iterations if any
      while (remainingLen >= 0) {
        eorToScreen32(newScreen, address, rotatedEor)
        address += 64
        rotatedEor = rotateRight(rotatedEor, 1)
        remainingLen--
      }

      // Check if we need to adjust for the end section
      // Assembly: tst.b eor / bne.s @1
      // Test the low byte of eor
      if ((rotatedEor & 0xff) === 0) {
        rotatedEor = swapWords(rotatedEor)
      } else {
        address -= 2
      }
    } else {
      rotatedEor = swapWords(rotatedEor)
    }

    // Handle end section with 16-bit operations (lines 948-956)
    if (end > 0) {
      let endLen = end - 1
      const eor16 = rotatedEor >>> 16

      for (let i = 0; i <= endLen; i++) {
        eorToScreen16(newScreen, address, (eor16 >>> i) & 0xffff)
        address += 64
      }
    }

    return newScreen
  }

/**
 * Helper function to rotate a 32-bit value right
 */
function rotateRight(value: number, bits: number): number {
  bits = bits % 32
  if (bits === 0) return value
  return ((value >>> bits) | (value << (32 - bits))) >>> 0
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

/**
 * Helper function to EOR a 16-bit value into screen memory
 */
function eorToScreen16(
  screen: MonochromeBitmap,
  address: number,
  value: number
): void {
  if (address >= 0 && address + 1 < screen.data.length) {
    // Extract bytes from the 16-bit value (big-endian order)
    const byte1 = (value >>> 8) & 0xff
    const byte0 = value & 0xff

    // EOR into screen buffer
    screen.data[address]! ^= byte1
    screen.data[address + 1]! ^= byte0
  }
}
