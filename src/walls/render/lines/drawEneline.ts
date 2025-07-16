/**
 * @fileoverview Corresponds to draw_eneline() from orig/Sources/Draw.c:1232
 * Draws east-north-east diagonal lines with double-width pixels
 */

import type { MonochromeBitmap } from '../../types'
import { SCRHT, SBARHT } from '../../../screen/constants'
import { jsrWAddress, negIfNeg } from '../../../asm/assemblyMacros'
import { LINE_DIR } from '../../../shared/types/line'

/**
 * Draw an east-north-east diagonal line (2 pixels wide, shallow angle)
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: LINE_DIR.DN (1) for down, LINE_DIR.UP (-1) for up
 * @see orig/Sources/Draw.c:1232 draw_eneline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawEneline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x: xParam, y: yParam, len: lenParam, dir } = deps
    let x = xParam
    let y = yParam
    let len = lenParam
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    // Boundary checking (lines 1233-1235)
    if (
      (dir === LINE_DIR.DN && y + (len >> 1) >= SCRHT - 1) ||
      (dir === LINE_DIR.UP && y - (len >> 1) <= SBARHT)
    ) {
      len -= 1 + (len & 0x0001)
    }

    if (len < 0) return newScreen

    // Calculate ending position (lines 1249-1258)
    let endX = x + (len << 1) // Move 2 pixels right per unit
    let endY: number

    if (dir > 0) {
      // Going down
      endY = y + (len >> 1)
    } else {
      // Going up
      endY = y - (len >> 1)
    }

    // JSR_WADDRESS for end position (line 1259)
    // Calculate word-aligned byte offset using JSR_WADDRESS
    const endAddress = jsrWAddress(0, endX, endY)

    // Draw last 2 dots (lines 1260-1263)
    const endBitPos = endX & 31
    const endPattern = (0xc0000000 >>> endBitPos) >>> 0

    if (endAddress >= 0 && endAddress + 3 < newScreen.data.length) {
      // Read current 32-bit value
      let currentData =
        (newScreen.data[endAddress]! << 24) |
        (newScreen.data[endAddress + 1]! << 16) |
        (newScreen.data[endAddress + 2]! << 8) |
        newScreen.data[endAddress + 3]!

      // OR with pattern
      currentData = (currentData | endPattern) >>> 0

      // Write back
      newScreen.data[endAddress] = (currentData >>> 24) & 0xff
      newScreen.data[endAddress + 1] = (currentData >>> 16) & 0xff
      newScreen.data[endAddress + 2] = (currentData >>> 8) & 0xff
      newScreen.data[endAddress + 3] = currentData & 0xff
    }

    // Adjust parameters for main drawing (line 1264)
    len -= 4

    // Set up direction-dependent offset (lines 1265-1266)
    // Uses NEGIFNEG macro from original assembly line 1266
    const scanLineOffset = negIfNeg(64, dir)

    // JSR_WADDRESS for start position (line 1239)
    let address = jsrWAddress(0, x, y)

    // Draw first 2 dots if length allows (lines 1268-1275)
    if (len >= 0) {
      const startBitPos = x & 31
      const startPattern = (0xc0000000 >>> startBitPos) >>> 0

      if (address >= 0 && address + 3 < newScreen.data.length) {
        let currentData =
          (newScreen.data[address]! << 24) |
          (newScreen.data[address + 1]! << 16) |
          (newScreen.data[address + 2]! << 8) |
          newScreen.data[address + 3]!

        currentData = (currentData | startPattern) >>> 0

        newScreen.data[address] = (currentData >>> 24) & 0xff
        newScreen.data[address + 1] = (currentData >>> 16) & 0xff
        newScreen.data[address + 2] = (currentData >>> 8) & 0xff
        newScreen.data[address + 3] = currentData & 0xff
      }

      // Move to next position
      x += 2
      address += scanLineOffset
      if (dir > 0) {
        y++
      } else {
        y--
      }
    }

    // Prepare for main loop (lines 1276-1286)
    const initialBitPos = x & 31
    let pattern = (0xf0000000 >>> initialBitPos) >>> 0 // 4-pixel pattern

    const mainLoopCount = len >> 2 // Process 4 pixels at a time
    const remainder = len & 3

    // Recalculate address after position adjustment
    address = jsrWAddress(0, x, y)

    // Main loop - process 4 pixels at a time
    for (let i = 0; i < mainLoopCount; i++) {
      const baseAddr = address

      // Draw 4 scan lines, rotating pattern by 2 bits each time
      for (let scanLine = 0; scanLine < 4; scanLine++) {
        const lineAddr = baseAddr + scanLine * scanLineOffset

        if (lineAddr >= 0 && lineAddr + 3 < newScreen.data.length) {
          // Read current data
          let currentData =
            (newScreen.data[lineAddr]! << 24) |
            (newScreen.data[lineAddr + 1]! << 16) |
            (newScreen.data[lineAddr + 2]! << 8) |
            newScreen.data[lineAddr + 3]!

          // OR with pattern
          currentData = (currentData | pattern) >>> 0

          // Write back
          newScreen.data[lineAddr] = (currentData >>> 24) & 0xff
          newScreen.data[lineAddr + 1] = (currentData >>> 16) & 0xff
          newScreen.data[lineAddr + 2] = (currentData >>> 8) & 0xff
          newScreen.data[lineAddr + 3] = currentData & 0xff
        }

        // Rotate pattern right by 2 bits
        pattern = ((pattern >>> 2) | (pattern << 30)) >>> 0
      }

      // Move pointer by 4 scan lines
      address += scanLineOffset * 4

      // Check if pattern wrapped to next word (tst.b D0)
      if ((pattern & 0xff) === 0) {
        // Swap words
        pattern = ((pattern >>> 16) | (pattern << 16)) >>> 0
        // Move to next word in memory
        address += 2
      }
    }

    // Post-loop: handle remaining pixels (lines 1321-1324)
    for (let i = 0; i < remainder; i++) {
      if (address >= 0 && address + 3 < newScreen.data.length) {
        // Read current data
        let currentData =
          (newScreen.data[address]! << 24) |
          (newScreen.data[address + 1]! << 16) |
          (newScreen.data[address + 2]! << 8) |
          newScreen.data[address + 3]!

        // OR with pattern
        currentData = (currentData | pattern) >>> 0

        // Write back
        newScreen.data[address] = (currentData >>> 24) & 0xff
        newScreen.data[address + 1] = (currentData >>> 16) & 0xff
        newScreen.data[address + 2] = (currentData >>> 8) & 0xff
        newScreen.data[address + 3] = currentData & 0xff
      }

      // Move to next scan line
      address += scanLineOffset

      // Rotate pattern right by 2 bits
      pattern = ((pattern >>> 2) | (pattern << 30)) >>> 0
    }

    return newScreen
  }
