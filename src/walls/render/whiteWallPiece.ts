/**
 * @fileoverview Corresponds to white_wall_piece() from orig/Sources/Junctions.c:711
 */

import type { MonochromeBitmap } from '../types'
import { VIEWHT, SBARHT, SCRWTH } from '../../screen/constants'
import { LEFT_CLIP, RIGHT_CLIP, CENTER_CLIP } from './constants'

/**
 * Draws a single white wall piece
 * @see orig/Sources/Junctions.c:711 white_wall_piece()
 */
export const whiteWallPiece = (
  screen: MonochromeBitmap,
  x: number,
  y: number,
  height: number,
  data: Uint8Array
): MonochromeBitmap => {
  // Deep clone for immutability
  const newScreen: MonochromeBitmap = {
    data: new Uint8Array(screen.data),
    width: screen.width,
    height: screen.height,
    rowBytes: screen.rowBytes
  }

  let adjustedY = y
  let adjustedHeight = height
  let dataOffset = 0

  // Vertical clipping (orig lines 717-729)
  if (adjustedY < 0) {
    adjustedHeight += adjustedY // Reduce height by amount above screen
    if (adjustedHeight <= 0) return newScreen // Completely above screen
    dataOffset = -adjustedY * 2 // Skip rows that are above screen (2 bytes per row)
    adjustedY = 0
  } else if (adjustedY + adjustedHeight > VIEWHT) {
    if (adjustedY >= VIEWHT) return newScreen // Completely below view
    adjustedHeight = VIEWHT - adjustedY // Clip to view bottom
  }

  // Horizontal clipping setup (orig lines 730-742)
  let clip = ~CENTER_CLIP // Default: invert all bits for AND operation
  if (x < 0) {
    if (x <= -16) return newScreen // Completely off left edge
    clip = ~LEFT_CLIP // Only right 16 bits
  } else if (x >= SCRWTH - 16) {
    if (x >= SCRWTH) return newScreen // Completely off right edge
    clip = ~RIGHT_CLIP // Only left 16 bits
  }

  // Adjust Y for status bar (orig line 744)
  adjustedY += SBARHT

  // Calculate bit shift for x position within 32-bit word
  const bitShift = 16 - (x & 15) // How many bits to shift left
  
  // Calculate word-aligned byte offset from x coordinate
  // Original 68K used FIND_WADDRESS macro which did:
  // 1. asr.w #3, D0 (shift right by 3 = divide by 8)
  // 2. bclr.l #0, D0 (clear bit 0 for word alignment)
  // This ensures addresses are even for 16/32-bit operations
  const byteX = (x >> 3) & 0xfffe // Word-aligned byte offset

  // Draw each row (orig asm lines 755-761)
  for (let row = 0; row < adjustedHeight; row++) {
    // Get pattern word from data
    if (dataOffset + 1 >= data.length) break // No more data
    const patternWord = (data[dataOffset]! << 8) | data[dataOffset + 1]!
    dataOffset += 2

    // Create 32-bit pattern matching the original assembly:
    // moveq #-1, D0 sets all bits to 1, then move.w loads pattern into lower 16 bits
    let pattern = 0xffff0000 | patternWord // Upper 16 bits are 1s, lower 16 are the pattern

    // Rotate left to align with x position (matching rol.l x, D0)
    pattern = ((pattern << bitShift) | (pattern >>> (32 - bitShift))) >>> 0

    // Apply clipping mask (OR with inverted clip)
    pattern = (pattern | clip) >>> 0

    // Calculate screen position
    const screenY = adjustedY + row
    const screenOffset = screenY * newScreen.rowBytes + byteX

    // Apply pattern with AND operation (clears bits where pattern is 0)
    if (screenOffset >= 0 && screenOffset + 3 < newScreen.data.length) {
      // Read 32 bits from screen
      let screenData =
        (newScreen.data[screenOffset]! << 24) |
        (newScreen.data[screenOffset + 1]! << 16) |
        (newScreen.data[screenOffset + 2]! << 8) |
        newScreen.data[screenOffset + 3]!

      // AND with pattern (orig line 759: and.l D0, (A0))
      screenData = (screenData & pattern) >>> 0

      // Write back to screen
      newScreen.data[screenOffset] = (screenData >>> 24) & 0xff
      newScreen.data[screenOffset + 1] = (screenData >>> 16) & 0xff
      newScreen.data[screenOffset + 2] = (screenData >>> 8) & 0xff
      newScreen.data[screenOffset + 3] = screenData & 0xff
    }
  }

  return newScreen
}
