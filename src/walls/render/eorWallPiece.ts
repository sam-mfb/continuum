/**
 * @fileoverview Corresponds to eor_wall_piece() from orig/Sources/Junctions.c:766
 */

import type { MonochromeBitmap } from '../types'
import { VIEWHT, SBARHT, SCRWTH } from '../../screen/constants'
import { LEFT_CLIP, RIGHT_CLIP, CENTER_CLIP } from './constants'

/**
 * Draws wall pieces using XOR operation (for junctions)
 * @see orig/Sources/Junctions.c:766 eor_wall_piece()
 */
export const eorWallPiece = (
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

  // Vertical clipping (orig lines 772-784)
  if (adjustedY < 0) {
    adjustedHeight += adjustedY  // Reduce height by amount above screen
    if (adjustedHeight <= 0) return newScreen  // Completely above screen
    dataOffset = -adjustedY * 2  // Skip rows that are above screen (2 bytes per row)
    adjustedY = 0
  } else if (adjustedY + adjustedHeight > VIEWHT) {
    if (adjustedY >= VIEWHT) return newScreen  // Completely below view
    adjustedHeight = VIEWHT - adjustedY  // Clip to view bottom
  }

  // Horizontal clipping setup (orig lines 785-797)
  // NOTE: eor_wall_piece uses non-inverted clip masks
  let clip = CENTER_CLIP  // Default: all bits for XOR operation
  if (x < 0) {
    if (x <= -16) return newScreen  // Completely off left edge
    clip = LEFT_CLIP  // Only right 16 bits
  } else if (x >= SCRWTH - 16) {
    if (x >= SCRWTH) return newScreen  // Completely off right edge
    clip = RIGHT_CLIP  // Only left 16 bits
  }

  // Adjust Y for status bar (orig line 799)
  adjustedY += SBARHT

  // Calculate bit shift for x position within 32-bit word
  const bitShift = 16 - (x & 15)  // How many bits to shift left
  const byteX = Math.floor(x / 8)  // Byte offset in row

  // Draw each row (orig asm lines 810-816)
  for (let row = 0; row < adjustedHeight; row++) {
    // Get pattern word from data
    if (dataOffset + 1 >= data.length) break  // No more data
    const patternWord = (data[dataOffset]! << 8) | data[dataOffset + 1]!
    dataOffset += 2

    // Create 32-bit pattern matching the original assembly:
    // moveq #0, D0 sets all bits to 0, then move.w loads pattern into lower 16 bits  
    let pattern = patternWord  // Only the pattern word, upper bits stay 0
    
    // Rotate left to align with x position (matching rol.l x, D0)
    pattern = ((pattern << bitShift) | (pattern >>> (32 - bitShift))) >>> 0
    
    // Apply clipping mask (AND with clip for eor operation)
    pattern = (pattern & clip) >>> 0

    // Calculate screen position
    const screenY = adjustedY + row
    const screenOffset = screenY * newScreen.rowBytes + byteX

    // Apply pattern with XOR operation (toggles bits)
    if (screenOffset >= 0 && screenOffset + 3 < newScreen.data.length) {
      // Read 32 bits from screen
      let screenData = (newScreen.data[screenOffset]! << 24) |
                      (newScreen.data[screenOffset + 1]! << 16) |
                      (newScreen.data[screenOffset + 2]! << 8) |
                      (newScreen.data[screenOffset + 3]!)
      
      // XOR with pattern (orig line 814: eor.l D0, (A0))
      screenData = (screenData ^ pattern) >>> 0
      
      // Write back to screen
      newScreen.data[screenOffset] = (screenData >>> 24) & 0xFF
      newScreen.data[screenOffset + 1] = (screenData >>> 16) & 0xFF
      newScreen.data[screenOffset + 2] = (screenData >>> 8) & 0xFF
      newScreen.data[screenOffset + 3] = screenData & 0xFF
    }
  }

  return newScreen
}
