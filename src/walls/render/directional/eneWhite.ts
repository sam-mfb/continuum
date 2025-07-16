/**
 * @fileoverview Corresponds to ene_white() from orig/Sources/Walls.c:494
 */

import type { LineRec, MonochromeBitmap } from '../../types'
import { VIEWHT, SBARHT } from '../../../screen/constants'
import { findWAddress } from '../../../asm/assemblyMacros'

/**
 * Draws white parts of ENE (East-North-East) lines
 * @see orig/Sources/Walls.c:494 ene_white()
 */
export const eneWhite =
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

    const x = line.startx - scrx
    const y = line.starty - scry

    // Early return if x > 0 (line 506-507)
    if (x > 0) {
      return newScreen
    }

    // Calculate h (lines 508-514)
    let h = 0
    if (x + h < -20) {
      h = -20 - x
    }
    if (y - (h >> 1) > VIEWHT) {
      h = (y - (VIEWHT - 1)) << 1
    }
    if (h & 1) {
      h++
    }

    // Calculate len (lines 516-522)
    let len = line.length - 12
    if (len > -x) {
      len = -x
    }
    if (len & 1) {
      len++
    }
    if (y < len >> 1) {
      len = y << 1
    }

    // Adjust len (lines 524-525)
    len -= h
    len >>= 1

    // Calculate drawing position (lines 527-530)
    const drawY = y + SBARHT - (h >> 1)
    const drawX = x + h
    const andval = 0x7fffffff >>> (drawX + 20)

    // Early return if nothing to draw
    if (len < 0) {
      return newScreen
    }

    // Assembly drawing logic (lines 531-545)
    // Calculate screen address at x=0 using FIND_WADDRESS macro
    let address = findWAddress(0, 0, drawY) // x is set to 0 in line 530

    let mask = andval

    // Draw loop
    for (let i = 0; i <= len; i++) {
      andToScreen32(newScreen, address, mask)
      address -= 64
      mask >>>= 2
    }

    return newScreen
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
