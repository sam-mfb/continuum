/**
 * @fileoverview Corresponds to east_black() from orig/Sources/Walls.c:553
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SCRWTH, SBARHT, SCRHT } from '../../../screen/constants'
import { drawEline } from '../lines/drawEline'

// Line direction constants from Draw.c
const L_DN = 0 // Down direction

// Static data array from line 557
const data = [-1, -1, 0, 0, 0, 0]

/**
 * Draws black parts of eastward lines
 * @see orig/Sources/Walls.c:553 east_black()
 */
export const eastBlack = (
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
  let h1 = 0
  const h4 = line.length + 1
  let height = 6
  let dataIndex = 0

  // Calculate h1 boundaries (lines 568-573)
  if (x + h1 < 0) {
    h1 = -x
  }
  let adjustedH4 = h4
  if (x + h4 > SCRWTH) {
    adjustedH4 = SCRWTH - x
  }
  if (h1 >= adjustedH4) {
    return newScreen
  }

  // Calculate h2 (lines 574-578)
  let h2 = 16
  if (h2 < h1) {
    h2 = h1
  } else if (h2 > adjustedH4) {
    h2 = adjustedH4
  }

  // Calculate h3 (lines 579-585)
  let h3 = line.h2 ?? h2
  if (h3 > line.length) {
    h3 = line.length
  }
  if (h3 < h2) {
    h3 = h2
  }
  if (h3 > adjustedH4) {
    h3 = adjustedH4
  }

  // Adjust for vertical clipping (lines 586-596)
  if (y < 0) {
    dataIndex = -y
    height += y
    y = 0
  } else if (y > VIEWHT - 6) {
    height = VIEWHT - y
  }
  height--
  if (height < 0) {
    return newScreen
  }

  y += SBARHT

  // Draw edge lines if needed (lines 599-605)
  if (y + height >= SBARHT + 5 && y < SCRHT) {
    if (h2 > h1) {
      drawEline(newScreen, x + h1, y, h2 - h1 - 1, L_DN)
    }
    if (adjustedH4 > h3) {
      drawEline(newScreen, x + h3, y, adjustedH4 - h3 - 1, L_DN)
    }
  }

  const len = h3 - h2 - 1
  if (len < 0) {
    return newScreen
  }

  x += h2

  // Assembly drawing logic (lines 612-724)
  // Calculate screen address
  const byteX = (x >> 3) & 0xfffe
  let address = y * newScreen.rowBytes + byteX

  const shift = x & 15
  const totalBits = shift + len

  if (totalBits < 16) {
    // Deal with really short lines (lines 622-630)
    let mask = 0xffff
    mask >>>= 1
    mask >>>= len
    mask = rotateRight16(mask, shift)
    
    drawOneWord(newScreen, address, mask, height, dataIndex)
  } else {
    // Normal case (lines 632-723)
    let mask = 0xffff >>> shift
    mask = ~mask & 0xffff

    if (height === 5) {
      // Quick path - no vertical clipping (lines 683-722)
      orToScreen16(newScreen, address, ~mask & 0xffff)
      orToScreen16(newScreen, address + 64, ~mask & 0xffff)
      andToScreen16(newScreen, address + 64 * 2, mask)
      andToScreen16(newScreen, address + 64 * 3, mask)
      andToScreen16(newScreen, address + 64 * 4, mask)
      andToScreen16(newScreen, address + 64 * 5, mask)

      address += 2
      let remainingLen = len - 15 + shift

      // Draw full 32-bit sections
      while (remainingLen >= 32) {
        orToScreen32(newScreen, address, 0xffffffff)
        orToScreen32(newScreen, address + 64, 0xffffffff)
        andToScreen32(newScreen, address + 64 * 2, 0)
        andToScreen32(newScreen, address + 64 * 3, 0)
        andToScreen32(newScreen, address + 64 * 4, 0)
        andToScreen32(newScreen, address + 64 * 5, 0)
        address += 4
        remainingLen -= 32
      }

      // Draw final partial section
      if (remainingLen > 0) {
        const finalMask = 0xffffffff >>> remainingLen
        orToScreen32(newScreen, address, ~finalMask)
        orToScreen32(newScreen, address + 64, ~finalMask)
        andToScreen32(newScreen, address + 64 * 2, finalMask)
        andToScreen32(newScreen, address + 64 * 3, finalMask)
        andToScreen32(newScreen, address + 64 * 4, finalMask)
        andToScreen32(newScreen, address + 64 * 5, finalMask)
      }
    } else {
      // Slow path with vertical clipping (lines 637-664)
      drawOneWord(newScreen, address, mask, height, dataIndex)

      address += 2
      let remainingLen = len - 15 + shift

      // Draw full 32-bit sections
      while (remainingLen >= 32) {
        drawDataPattern(newScreen, address, height, dataIndex)
        address += 4
        remainingLen -= 32
      }

      // Draw final partial section
      if (remainingLen > 0) {
        let finalMask = 0xffffffff >>> remainingLen
        drawOneWord(newScreen, address + 2, finalMask & 0xffff, height, dataIndex)
        finalMask = swapWords(finalMask)
        drawOneWord(newScreen, address, finalMask >>> 16, height, dataIndex)
      }
    }
  }

  return newScreen
}


/**
 * Helper function to draw one word with pattern data
 */
function drawOneWord(
  screen: MonochromeBitmap,
  address: number,
  mask: number,
  height: number,
  dataIndex: number
): void {
  const notMask = ~mask & 0xffff
  let currentAddr = address
  
  for (let i = 0; i <= height; i++) {
    if (data[dataIndex + i]) {
      // Pattern is -1, so OR with notMask
      orToScreen16(screen, currentAddr, notMask)
    } else {
      // Pattern is 0, so AND with mask
      andToScreen16(screen, currentAddr, mask)
    }
    currentAddr += 64
  }
}

/**
 * Helper function to draw data pattern for 32-bit sections
 */
function drawDataPattern(
  screen: MonochromeBitmap,
  address: number,
  height: number,
  dataIndex: number
): void {
  let currentAddr = address
  
  for (let i = 0; i <= height; i++) {
    if (data[dataIndex + i]) {
      // Pattern is -1
      orToScreen32(screen, currentAddr, 0xffffffff)
    } else {
      // Pattern is 0
      andToScreen32(screen, currentAddr, 0)
    }
    currentAddr += 64
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
