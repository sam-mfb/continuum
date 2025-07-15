/**
 * @fileoverview Corresponds to south_black() from orig/Sources/Walls.c:1144
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'
import { drawNline } from '../lines/drawNline'

// Background patterns from Play.c:61-62
const backgr1 = 0xaaaaaaaa
const backgr2 = 0x55555555
const background = [backgr1, backgr2]

// Masks from orig/Sources/Walls.c:1141-1142
const SOUTH_BLACK = 0xc0000000
const SOUTH_MASK = 0xffc00000

// Line direction constants from Draw.c
const L_DN = 0 // Down direction

/**
 * Draws black parts of southward lines
 * @see orig/Sources/Walls.c:1144 south_black()
 */
export const southBlack =
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
    let h4 = line.length + 1

    // Clipping calculations (lines 1158-1163)
    if (y + h1 < 0) {
      h1 = -y
    }
    if (y + h4 > VIEWHT) {
      h4 = VIEWHT - y
    }
    if (h1 >= h4) {
      return newScreen
    }

    // h2/h3 calculations (lines 1164-1173)
    let h2 = line.h1 ?? h1
    if (h2 < h1) {
      h2 = h1
    }
    if (h2 > h4) {
      h2 = h4
    }
    let h3 = line.h2 ?? h2
    if (h3 < h2) {
      h3 = h2
    }
    if (h3 > h4) {
      h3 = h4
    }

    y += SBARHT

    // Draw north lines for the gaps (lines 1176-1182)
    if (x >= 0 && x < SCRWTH) {
      if (h2 > h1) {
        newScreen = drawNline({ x, y: y + h1, len: h2 - h1 - 1, u_d: L_DN })(
          newScreen
        )
      }
      if (h4 > h3 + 1) {
        newScreen = drawNline({ x, y: y + h3, len: h4 - h3 - 1, u_d: L_DN })(
          newScreen
        )
      }
    }

    y += h2
    const len = h3 - h2
    if (len <= 0) {
      return newScreen
    }

    // Calculate EOR patterns (lines 1188-1189)
    const eor1 = (background[(x + y) & 1]! & SOUTH_MASK) ^ SOUTH_BLACK
    const eor2 = (background[(x + y + 1) & 1]! & SOUTH_MASK) ^ SOUTH_BLACK

    // Assembly drawing logic (lines 1191-1260)
    // Calculate screen address
    const byteX = (x >> 3) & 0xfffe
    let address = y * newScreen.rowBytes + byteX

    // Shift the EOR patterns based on x position
    const shift = x & 15
    let d0 = eor1 >>> shift
    let d1 = eor2 >>> shift

    // Main drawing loop
    let d3 = len >> 2 // Fast loop count
    const remainder = len & 3

    // Determine drawing mode
    let quickMode = false
    if (x < 0) {
      // Quick mode 1: shift right by 2 bytes
      address += 2
      quickMode = true
    } else if (x >= SCRWTH - 16 || (x & 15) <= 6) {
      // Quick mode 2: use 16-bit operations
      d0 = swapWords(d0)
      d1 = swapWords(d1)
      quickMode = true
    }

    // Fast loop (4 lines at a time)
    const d2 = 64 * 4 // 4 scanlines
    for (let i = 0; i < d3; i++) {
      if (quickMode) {
        eorToScreen16(newScreen, address, d0)
        eorToScreen16(newScreen, address + 64, d1)
        eorToScreen16(newScreen, address + 64 * 2, d0)
        eorToScreen16(newScreen, address + 64 * 3, d1)
      } else {
        eorToScreen(newScreen, address, d0)
        eorToScreen(newScreen, address + 64, d1)
        eorToScreen(newScreen, address + 64 * 2, d0)
        eorToScreen(newScreen, address + 64 * 3, d1)
      }
      address += d2
    }

    // Handle remainder
    // Assembly: after fast loop, D2 is halved (64*4 -> 64*2)
    // Then uses dbra with remainder to draw remaining lines
    if (remainder > 0) {
      const d2Half = 128 // 64 * 2
      
      // Draw remaining lines based on remainder value
      switch (remainder) {
        case 3:
          // Draw 3 lines: d0, d1, d0
          if (quickMode) {
            eorToScreen16(newScreen, address, d0)
            eorToScreen16(newScreen, address + 64, d1)
            eorToScreen16(newScreen, address + 128, d0)
          } else {
            eorToScreen(newScreen, address, d0)
            eorToScreen(newScreen, address + 64, d1)
            eorToScreen(newScreen, address + 128, d0)
          }
          break
        case 2:
          // Draw 2 lines: d0, d1
          if (quickMode) {
            eorToScreen16(newScreen, address, d0)
            eorToScreen16(newScreen, address + 64, d1)
          } else {
            eorToScreen(newScreen, address, d0)
            eorToScreen(newScreen, address + 64, d1)
          }
          break
        case 1:
          // Draw 1 line: d0
          if (quickMode) {
            eorToScreen16(newScreen, address, d0)
          } else {
            eorToScreen(newScreen, address, d0)
          }
          break
      }
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
function eorToScreen(
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
 * Helper function to EOR a 16-bit value into screen memory (for quick modes)
 */
function eorToScreen16(
  screen: MonochromeBitmap,
  address: number,
  value: number
): void {
  if (address >= 0 && address + 1 < screen.data.length) {
    // Extract bytes from the lower 16 bits (big-endian order)
    const byte1 = (value >>> 8) & 0xff
    const byte0 = value & 0xff

    // EOR into screen buffer
    screen.data[address]! ^= byte1
    screen.data[address + 1]! ^= byte0
  }
}
