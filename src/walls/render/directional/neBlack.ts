/**
 * @fileoverview Corresponds to ne_black() from orig/Sources/Walls.c:209
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT } from '../../../screen/constants'

// Background patterns from Play.c:61-62
const backgr1 = 0xaaaaaaaa
const backgr2 = 0x55555555
const background = [backgr1, backgr2]

// Masks from orig/Sources/Walls.c:203-204
const NE_MASK = 0xfffe0000
const NE_VAL = 0xc0000000

// Line direction constants from Draw.c
const L_UP = 1 // Up direction

/**
 * Draws black parts of NE (North-East) lines
 * @see orig/Sources/Walls.c:209 ne_black()
 */
export const neBlack = (
  screen: MonochromeBitmap,
  line: LineRec,
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

  let x = line.startx - scrx
  let y = line.starty - scry
  let h1 = line.h1 ?? 0
  let h4 = line.length + 1

  // Calculate boundaries (lines 223-232)
  if (y - h1 >= VIEWHT) {
    h1 = y - (VIEWHT - 1)
  }
  if (y < h4) {
    h4 = y + 1
  }
  if (x + h1 < -14) {
    h1 = -14 - x
  }
  if (x + h4 > SCRWTH) {
    h4 = SCRWTH - x
  }
  if (h1 > h4) {
    h1 = h4
  }

  // Calculate h3 and h15 (lines 233-250)
  let h3 = line.h2 ?? h4
  if (h3 > h4) {
    h3 = h4
  }
  
  let h15 = h3
  if (x + h15 > 0) {
    h15 = -x
  }
  if (h15 < h1) {
    h15 = h1
  }
  
  const startlen = h15 - h1
  
  if (x + h15 < 0) {
    h15 = -x
  }
  if (h3 < h15) {
    h3 = h15
  }
  
  let h2 = h3
  if (x + h2 > SCRWTH - 15) {
    h2 = SCRWTH - 15 - x
  }
  if (h2 < h15) {
    h2 = h15
  }

  // Calculate h0 (lines 251-255)
  let h0 = 0
  if (x + h0 < 0) {
    h0 = -x
  }
  if (y - h0 >= VIEWHT) {
    h0 = y - (VIEWHT - 1)
  }

  y += SBARHT

  const startx = x + h1 + 14
  const starty = y - h1

  const len = h2 - h15
  const end = h3 - h2
  const endline = h4 - h3

  // Draw edge lines (lines 266-269)
  if (h1 - h0 > 1) {
    drawNELine(newScreen, x + h0, y - h0, h1 - h0 - 1, L_UP)
  }
  if (endline > 0) {
    drawNELine(newScreen, x + h3, y - h3, endline - 1, L_UP)
  }

  x += h15
  y -= h15

  // Calculate EOR pattern (line 274)
  const eor = (background[(x + y) & 1]! & NE_MASK) ^ NE_VAL

  // Main drawing section (lines 276-313)
  if (len > 0 || end > 0) {
    // Calculate screen address
    const byteX = (x >> 3) & 0xfffe
    let address = y * newScreen.rowBytes + byteX

    // Rotate the EOR pattern based on x position
    const shift = x & 15
    let rotatedEor = rotateRight(eor, shift)

    let remainingLen = len - 1

    // Main loop
    if (remainingLen >= 0) {
      // Loop until we need to switch to 16-bit operations
      while (remainingLen >= 0) {
        eorToScreen32(newScreen, address, rotatedEor)
        address -= 64
        rotatedEor = rotateRight(rotatedEor, 1)
        
        // Check if carry bit is set
        if ((rotatedEor & 0x80000000) === 0) {
          // Need to switch to next word
          rotatedEor = swapWords(rotatedEor)
          address += 2
          remainingLen--
          break
        }
        remainingLen--
      }

      // Continue with remaining iterations if any
      while (remainingLen >= 0) {
        eorToScreen32(newScreen, address, rotatedEor)
        address -= 64
        rotatedEor = rotateRight(rotatedEor, 1)
        remainingLen--
      }

      // Check if we need to adjust for the end section
      if ((rotatedEor & 0xff) === 0) {
        address -= 2
      } else {
        rotatedEor = swapWords(rotatedEor)
      }
    } else {
      rotatedEor = swapWords(rotatedEor)
    }

    // Handle end section with 16-bit operations (lines 304-311)
    if (end > 0) {
      let endLen = end - 1
      const eor16 = rotatedEor >>> 16

      for (let i = 0; i <= endLen; i++) {
        eorToScreen16(newScreen, address, (eor16 >>> i) & 0xffff)
        address -= 64
      }
    }
  }

  // Handle start piece with AND operations (lines 314-331)
  if (startlen > 0) {
    const byteX = (startx >> 3) & 0xfffe
    let address = starty * newScreen.rowBytes + byteX
    
    let mask = 0x7fff >> (startx & 15)
    
    for (let i = 0; i <= startlen; i++) {
      andToScreen16(newScreen, address, mask)
      address -= 64
      mask >>>= 1
    }
  }

  return newScreen
}

/**
 * Helper function to draw NE lines (stub for now)
 */
function drawNELine(
  screen: MonochromeBitmap,
  x: number,
  y: number,
  len: number,
  _dir: number
): void {
  // TODO: This will be implemented when we implement draw_neline
  // For now, just draw diagonal pixels
  if (x >= 0 && x < screen.width && len > 0) {
    for (let i = 0; i <= len; i++) {
      const currentX = x + i
      const currentY = y - i
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
