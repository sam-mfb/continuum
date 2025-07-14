/**
 * @fileoverview Corresponds to ene_black() from orig/Sources/Walls.c:341
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
// import { eneWhite } from './eneWhite' // TODO: Uncomment when eneWhite is implemented

// Masks and values from orig/Sources/Walls.c:336-337
const ENE_MASK1 = 0x8000
const ENE_MASK2 = 0x01ffffff
const ENE_VAL = 0xc000

// Line direction constants from Draw.c
const L_UP = 1 // Up direction

/**
 * Draws black parts of ENE (East-North-East) lines
 * @see orig/Sources/Walls.c:341 ene_black()
 */
export const eneBlack = (
  screen: MonochromeBitmap,
  line: LineRec,
  scrx: number,
  scry: number
): MonochromeBitmap => {
  // First call eneWhite (line 349)
  // TODO: Uncomment when eneWhite is implemented
  // let newScreen = eneWhite(screen, line, scrx, scry)
  
  // For now, just clone the screen
  const newScreen: MonochromeBitmap = {
    data: new Uint8Array(screen.data),
    width: screen.width,
    height: screen.height,
    rowBytes: screen.rowBytes
  }

  let x = line.startx - scrx
  let y = line.starty - scry
  let h1 = 0
  let h4 = line.length + 1

  // Calculate h1 boundaries (lines 356-361)
  if (x + h1 < 0) {
    h1 = -x
  }
  if (y - (h1 >> 1) > VIEWHT) {
    h1 = (y - VIEWHT) << 1
  }
  if (h1 & 1) {
    h1++
  }

  // Calculate h4 boundaries (lines 362-367)
  if (x + h4 > SCRWTH) {
    h4 = SCRWTH - x
  }
  if (y - (h4 >> 1) < 0) {
    h4 = y << 1
  }
  if (h4 & 1) {
    h4--
  }
  if (h4 <= h1) {
    return newScreen
  }

  // Calculate h3 (lines 370-376)
  let h3 = line.h2 ?? h4
  if (h3 > h4) {
    h3 = h4
  }
  if (h3 & 1) {
    h3--
  }
  if (h3 < h1) {
    h3 = h1
  }

  // Calculate h2 (lines 377-383)
  let h2 = h3
  if (x + h2 >= SCRWTH - 20) {
    h2 = SCRWTH - 21 - x
  }
  if (h2 & 1) {
    h2--
  }
  if (h2 < h1) {
    h2 = h1
  }

  const len = h2 - h1
  const end = h3 - h2
  const endline = h4 - h3
  y += SBARHT

  // Calculate endline coordinates (lines 390-397)
  let endlinex = x + h3 - 2
  let endliney = y - (h3 >> 1) + 1
  let adjustedEndline = endline
  if (endlinex < 0) {
    endlinex += 2
    endliney--
    adjustedEndline -= 2
  }

  x += h1
  y -= (h1 >> 1) + 1
  let adjustedLen = (len >> 1) - 1
  const adjustedEnd = end >> 1

  if (adjustedLen < 0) {
    adjustedLen = 0
  }

  // Assembly drawing logic (lines 407-485)
  // Calculate screen address
  const byteX = (x >> 3) & 0xfffe
  let address = y * newScreen.rowBytes + byteX

  const shift = x & 15

  if (x >= SCRWTH - 16 - 3) {
    // Special case for right edge (lines 413-422)
    const shift32 = x & 31
    let d0 = (ENE_VAL << 16) >>> shift32
    let d2 = (ENE_MASK1 << 16) >> shift32

    if (shift32 >= 16) {
      address -= 2
    }

    // Handle end section
    if (adjustedEnd > 0) {
      for (let i = 0; i < adjustedEnd; i++) {
        andToScreen32(newScreen, address, d2)
        orToScreen32(newScreen, address, d0)
        address -= 64
        d2 >>= 2
        d0 >>>= 2
      }
    }
  } else {
    // Normal case (lines 424-467)
    let d1 = ENE_MASK1 >> shift
    let d2 = ENE_MASK2 >>> shift
    let d0 = rotateRight16(ENE_VAL, shift)

    // Main loop
    let remainingLen = adjustedLen
    while (remainingLen >= 0) {
      andToScreen16(newScreen, address, d1)
      orToScreen16(newScreen, address, d0)
      andToScreen32(newScreen, address + 2, d2)
      address -= 64
      d2 >>>= 2
      d1 >>= 2
      d0 = rotateRight16(d0, 2)

      // Check for carry
      if ((d1 & 0x8000) === 0) {
        remainingLen--
        if (remainingLen < 0) break

        // Handle overflow (lines 444-455)
        const overflow = d0 & 0xff00
        orToScreen8(newScreen, address + 1, d0 & 0xff)
        andToScreen32(newScreen, address + 2, d2)
        orToScreen16(newScreen, address + 2, overflow)
        address -= 64
        d2 >>>= 2
        d0 = rotateRight16(d0, 2)
        d1 = overflow >> 2
        remainingLen--

        if (remainingLen < 0) break

        // Continue with adjusted values (lines 457-465)
        orToScreen8(newScreen, address + 1, d0 & 0xff)
        andToScreen32(newScreen, address + 2, d2)
        orToScreen16(newScreen, address + 2, d1)
        address -= 62
        d2 >>>= 2
        d2 = swapWords(d2)
        d1 = ~(d2 >>> 16) & 0xffff
        d0 = rotateRight16(d0, 2)
        remainingLen--
      } else {
        remainingLen--
      }
    }

    // Handle end section if we didn't reach it in main loop
    if (remainingLen < 0 && adjustedEnd > 0) {
      // Prepare for end section (lines 468-472)
      d2 = d1 | (d1 << 16)
      d0 = (d0 << 16) >>> 0

      // End loop (lines 473-482)
      for (let i = 0; i < adjustedEnd; i++) {
        andToScreen32(newScreen, address, d2)
        orToScreen32(newScreen, address, d0)
        address -= 64
        d2 >>= 2
        d0 >>>= 2
      }
    }
  }

  // Draw end line if needed (lines 486-487)
  if (adjustedEndline > 0) {
    drawENELine(newScreen, endlinex, endliney, adjustedEndline + 1, L_UP)
  }

  return newScreen
}

/**
 * Helper function to draw ENE lines (stub for now)
 */
function drawENELine(
  screen: MonochromeBitmap,
  x: number,
  y: number,
  len: number,
  _dir: number
): void {
  // TODO: This will be implemented when we implement draw_eneline
  // For now, draw diagonal line going up and right
  if (x >= 0 && y >= 0 && len > 0) {
    for (let i = 0; i < len; i += 2) {
      const currentX = x + i
      const currentY = y - (i >> 1)
      if (currentX >= 0 && currentX < screen.width && 
          currentY >= 0 && currentY < screen.height) {
        const byteX = currentX >> 3
        const bitPos = 7 - (currentX & 7)
        const address = currentY * screen.rowBytes + byteX
        if (address >= 0 && address < screen.data.length) {
          screen.data[address]! |= 1 << bitPos
        }
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
 * Helper function to swap high and low words of a 32-bit value
 */
function swapWords(value: number): number {
  return ((value >>> 16) | (value << 16)) >>> 0
}

/**
 * Helper function to OR an 8-bit value into screen memory
 */
function orToScreen8(
  screen: MonochromeBitmap,
  address: number,
  value: number
): void {
  if (address >= 0 && address < screen.data.length) {
    screen.data[address]! |= value & 0xff
  }
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
 * Helper function to AND a 16-bit value into screen memory
 */
function andToScreen16(
  screen: MonochromeBitmap,
  address: number,
  value: number
): void {
  if (address >= 0 && address + 1 < screen.data.length) {
    // Extract bytes from the 16-bit value (big-endian order)
    const byte1 = (value >>> 8) & 0xff
    const byte0 = value & 0xff

    // AND into screen buffer
    screen.data[address]! &= byte1
    screen.data[address + 1]! &= byte0
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

/**
 * Helper function to AND a 32-bit value into screen memory
 */
function andToScreen32(
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

    // AND into screen buffer
    screen.data[address]! &= byte3
    screen.data[address + 1]! &= byte2
    screen.data[address + 2]! &= byte1
    screen.data[address + 3]! &= byte0
  }
}
