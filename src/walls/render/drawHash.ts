/**
 * @fileoverview Corresponds to draw_hash() from orig/Sources/Junctions.c:916
 */

import type { MonochromeBitmap } from '../types'
import { VIEWHT, SBARHT, SCRWTH } from '../../screen/constants'
import { LEFT_CLIP, RIGHT_CLIP, CENTER_CLIP } from './constants'
import { HASH_FIGURE } from '../whiteBitmaps'

/**
 * Draws junction hash marks
 * @see orig/Sources/Junctions.c:916 draw_hash()
 */
export const drawHash = (
  screen: MonochromeBitmap,
  x: number,
  y: number
): void => {
  let height = 6
  let dataOffset = 0

  // Adjust for clipping at top (lines 924-929)
  if (y < 0) {
    height += y
    dataOffset = -y // Skip rows that are above screen
    y = 0
  } else if (y >= VIEWHT - 6) {
    height = VIEWHT - y
  }

  // Determine clipping mask (lines 934-939)
  let clip: number
  if (x < 0) {
    clip = LEFT_CLIP
  } else if (x >= SCRWTH - 9) {
    clip = RIGHT_CLIP
  } else {
    clip = CENTER_CLIP
  }

  // Add status bar height (line 941)
  y += SBARHT

  // Early exit if nothing to draw
  if (height <= 0) {
    return
  }

  // Calculate screen address (FIND_WADDRESS macro)
  // In the original: x >> 3 & 0xFFFE gives the byte offset, y << 6 gives row offset
  const byteX = (x >> 3) & 0xfffe // Word-aligned byte offset
  const rowOffset = y * screen.rowBytes
  let address = rowOffset + byteX

  // Calculate bit rotation (lines 947-949)
  // Original: and.w #15, x; neg.w x; add.w #16, x
  const bitPos = x & 15
  const rotateAmount = 16 - bitPos

  // Main drawing loop (lines 954-960)
  for (let i = 0; i < height; i++) {
    // Get pattern data for this row
    const patternData = HASH_FIGURE[dataOffset + i] || 0

    // Rotate pattern left by rotateAmount bits (32-bit rotation)
    // Original uses rol.l which is a 32-bit rotate left
    let rotated = patternData << rotateAmount

    // Apply clipping mask
    rotated &= clip

    // OR pattern into screen memory
    // The original works with 32-bit longs, so we need to handle this across 4 bytes
    if (rotated !== 0) {
      // Extract bytes from the 32-bit value (big-endian order)
      const byte3 = (rotated >>> 24) & 0xff
      const byte2 = (rotated >>> 16) & 0xff
      const byte1 = (rotated >>> 8) & 0xff
      const byte0 = rotated & 0xff

      // OR into screen buffer
      if (address < screen.data.length) {
        screen.data[address]! |= byte3
      }
      if (address + 1 < screen.data.length) {
        screen.data[address + 1]! |= byte2
      }
      if (address + 2 < screen.data.length) {
        screen.data[address + 2]! |= byte1
      }
      if (address + 3 < screen.data.length) {
        screen.data[address + 3]! |= byte0
      }
    }

    // Move to next row (adda.l D1, A0 where D1 = 64)
    address += screen.rowBytes
  }
}
