/**
 * @fileoverview Corresponds to sse_black() from orig/Sources/Walls.c:968
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNneline } from '../lines/drawNneline'
import { findWAddress, jsrWAddress } from '../../../asm/assemblyMacros'

// Background patterns from Play.c:61-62
const backgr1 = 0xaaaaaaaa
const backgr2 = 0x55555555
const background = [backgr1, backgr2]

// Masks from orig/Sources/Walls.c:962-963
const SSE_MASK = 0xff000000
const SSE_VAL = 0xc0000000

// Line direction constants from Draw.c
const L_DN = 0 // Down direction

/**
 * Draws black parts of SSE (South-South-East) lines
 * @see orig/Sources/Walls.c:968 sse_black()
 */
export const sseBlack =
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

    // Calculate h1 boundaries (lines 982-993)
    if (x + (h1 >> 1) < 0) {
      h1 = -x << 1
    }
    if (y + h1 < 0) {
      h1 = -y
    }
    if (h1 & 1) {
      h1++
    }

    let adjustedH5 = h5
    if (x + (h5 >> 1) > SCRWTH - 1) {
      adjustedH5 = (SCRWTH - 1 - x) << 1
    }
    if (y + h5 > VIEWHT) {
      adjustedH5 = VIEWHT - y
    }
    if (h1 > adjustedH5) {
      h1 = adjustedH5
    }

    // Calculate h2 (lines 994-998)
    let h2 = line.h1 ?? h1
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > adjustedH5) {
      h2 = adjustedH5
    }

    // Calculate h4 (lines 999-1003)
    let h4 = line.h2 ?? h1
    if (h4 < h1) {
      h4 = h1
    }
    if (h4 > adjustedH5) {
      h4 = adjustedH5
    }

    // Calculate h3 (lines 1004-1012)
    let h3 = h4
    if (x + (h3 >> 1) > SCRWTH - 8) {
      h3 = (SCRWTH - 8 - x) << 1
      if (h3 & 1) {
        h3--
      }
    }
    if (h3 < h2) {
      h3 = h2
    }

    // Calculate start piece if needed (lines 1014-1028)
    let startlen = 0
    let startx = 0
    let starty = 0
    if (x < 0) {
      let h = line.h1 ?? 0
      if (x + (h >> 1) < -7) {
        h = (-7 - x) << 1
      }
      if (y + h < 0) {
        h = -y
      }
      if (h & 1) {
        h++
      }
      startlen = h1 - h
      startx = x + (h >> 1) + 7
      starty = y + SBARHT + h
    }

    y += SBARHT
    const start = h2 - h1
    const len = h3 - h2
    const end = h4 - h3

    // Draw short black-only pieces (lines 1035-1038)
    if (start > 0) {
      newScreen = drawNneline({
        x: x + (h1 >> 1),
        y: y + h1,
        len: start - 1,
        dir: L_DN
      })(newScreen)
    }
    if (adjustedH5 - h4 > 1) {
      newScreen = drawNneline({
        x: x + (h4 >> 1),
        y: y + h4,
        len: adjustedH5 - h4 - 1,
        dir: L_DN
      })(newScreen)
    }

    x += h2 >> 1
    y += h2

    // Calculate EOR patterns (lines 1043-1044)
    const eor1 = (background[(x + y) & 1]! & SSE_MASK) ^ SSE_VAL
    const eor2 = (background[1 - ((x + y) & 1)]! & SSE_MASK) ^ SSE_VAL

    // Main drawing section (lines 1046-1117)
    if (len > 0 || end > 0) {
      // Calculate screen address using FIND_WADDRESS macro
      let address = findWAddress(0, x, y)

      // Rotate the EOR patterns based on x position
      const shift = x & 15
      let d0 = rotateRight(eor1, shift)
      let d1 = rotateRight(eor2, shift)

      let remainingLen = len - 1

      // Fast loop (4 lines at a time)
      while (remainingLen >= 4) {
        eorToScreen32(newScreen, address, d0)
        eorToScreen32(newScreen, address + 64, d1)
        d0 = rotateRight(d0, 1)
        d1 = rotateRight(d1, 1)
        eorToScreen32(newScreen, address + 64 * 2, d1)
        eorToScreen32(newScreen, address + 64 * 3, d0)
        d0 = rotateRight(d0, 1)
        d1 = rotateRight(d1, 1)
        address += 64 * 4

        // Check if we need to wrap to next word
        if ((d1 & 0xff) !== 0) {
          d0 = swapWords(d0)
          d1 = swapWords(d1)
          address += 2
        }
        remainingLen -= 4
      }

      // Handle remainder
      while (remainingLen >= 0) {
        eorToScreen32(newScreen, address, d0)
        if (remainingLen > 0) {
          eorToScreen32(newScreen, address + 64, d1)
        }
        address += 128
        d0 = rotateRight(d0, 1)
        d1 = rotateRight(d1, 1)

        // Swap d0 and d1
        const temp = d0
        d0 = d1
        d1 = temp

        // Check if we need to wrap to next word
        if ((d1 & 0xff) === 0 && remainingLen > 0) {
          d0 = swapWords(d0)
          d1 = swapWords(d1)
          address += 2
        }
        remainingLen--
      }

      // Handle end section with 16-bit operations
      if (end > 0) {
        d0 = swapWords(d0)
        d1 = swapWords(d1)
        let endLen = end - 1

        while (endLen >= 0) {
          eorToScreen16(newScreen, address, d0 >>> 16)
          d0 >>>= 1
          if (endLen > 0) {
            eorToScreen16(newScreen, address + 64, d1 >>> 16)
            d1 >>>= 1

            // Swap d0 and d1
            const temp = d0
            d0 = d1
            d1 = temp
          }
          address += 128
          endLen--
        }
      }
    }

    // Handle start piece with AND operations (lines 1118-1137)
    if (startlen > 0) {
      // Calculate screen address using JSR_WADDRESS
      let address = jsrWAddress(0, startx, starty)

      let mask = 0x7fff
      mask >>>= startx & 15

      const loopCount = startlen >> 1
      for (let i = 0; i <= loopCount; i++) {
        andToScreen16(newScreen, address, mask)
        andToScreen16(newScreen, address + 64, mask)
        mask >>>= 1
        address += 128
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

/**
 * Helper function to AND a 16-bit mask into screen memory
 */
function andToScreen16(
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
