/**
 * @fileoverview Corresponds to draw_neline() from orig/Sources/Draw.c:1110
 * Draws a northeast diagonal line (2 pixels wide)
 */

import type { MonochromeBitmap } from '../../types'
import { SCRWTH } from '../../../screen/constants'

/**
 * Draw a northeast diagonal line (45-degree angle, 2 pixels wide)
 * @param screen - The screen bitmap to draw on
 * @param x - Starting x coordinate
 * @param y - Starting y coordinate  
 * @param len - Length of the line
 * @param dir - Direction: positive for down-right, negative/zero for up-left
 * @see orig/Sources/Draw.c:1110 draw_neline()
 */
export const drawNeline = (
  screen: MonochromeBitmap,
  x: number,
  y: number,
  len: number,
  dir: number
): void => {
  // Boundary check from original (line 1117)
  if (x + len + 1 >= SCRWTH) {
    len--
  }
  
  if (len < 0) return

  // Calculate byte address using FIND_BADDRESS logic
  let byteX = x >> 3 // No word alignment for byte operations
  let address = y * screen.rowBytes + byteX
  
  // Get bit position within byte (0-7)
  const bitPos = x & 7
  
  // Initial mask: 0xC0 (11000000) shifted right by bit position
  let mask = 0xc0 >> bitPos
  
  // Row offset: 64 bytes per row
  const rowOffset = dir > 0 ? 64 : -64
  // Step offset for moving diagonally (row + 1 byte)
  const stepOffset = dir > 0 ? 513 : -511 // 64*8 + 1
  
  let remainingLen = len

  // Pre-loop: Handle initial partial byte
  if (mask !== 1) {
    while (mask > 1 && remainingLen >= 0) {
      if (address >= 0 && address < screen.data.length) {
        screen.data[address]! |= mask
      }
      address += rowOffset
      mask >>= 1
      remainingLen--
    }
    
    if (remainingLen < 0) return
  }

  // Handle byte boundary crossing
  if (address >= 0 && address < screen.data.length) {
    screen.data[address]! |= mask // Set last pixel in current byte
  }
  if (address + 1 >= 0 && address + 1 < screen.data.length) {
    screen.data[address + 1]! |= 0x80 // Set leftmost bit of next byte
  }
  address += rowOffset + 1 // Move to next row and byte
  remainingLen--
  
  if (remainingLen < 0) return

  // Main loop: Process 8-pixel chunks
  const chunks = remainingLen >> 3
  const remainder = remainingLen & 7
  
  // Patterns for diagonal line (2 pixels wide, shifting right)
  const patterns = [0xc0, 0x60, 0x30, 0x18, 0x0c, 0x06, 0x03, 0x01]
  
  for (let chunk = 0; chunk < chunks; chunk++) {
    const baseAddr = address
    
    // Draw 8 rows of the diagonal pattern
    for (let row = 0; row < 8; row++) {
      const rowAddr = baseAddr + (dir > 0 ? row * 64 : -row * 64)
      
      if (row < 7) {
        // Normal pattern
        if (rowAddr >= 0 && rowAddr < screen.data.length) {
          screen.data[rowAddr]! |= patterns[row]!
        }
      } else {
        // Row 7: split across byte boundary
        if (rowAddr >= 0 && rowAddr < screen.data.length) {
          screen.data[rowAddr]! |= 0x01
        }
        if (rowAddr + 1 >= 0 && rowAddr + 1 < screen.data.length) {
          screen.data[rowAddr + 1]! |= 0x80
        }
      }
    }
    
    address += stepOffset
  }

  // Post-loop: Handle remaining pixels (0-7)
  if (remainder > 0) {
    mask = 0xc0
    let count = remainder
    
    while (count >= 0) {
      if (address >= 0 && address < screen.data.length) {
        screen.data[address]! |= mask & 0xff
      }
      
      address += rowOffset
      
      // Rotate mask right by 1
      const carry = mask & 1
      mask = (mask >> 1) | (carry << 15)
      
      // Check if we've crossed a byte boundary
      if ((mask & 0xff) === 0) {
        count--
        if (count < 0) break
        
        // Set pixels after rotation
        if (address >= 0 && address < screen.data.length) {
          screen.data[address]! |= mask & 0xff
        }
        address++ // Move to next byte
        
        // Rotate left by 8 bits to get back to high byte
        mask = ((mask << 8) | (mask >> 8)) & 0xffff
      } else {
        count--
      }
    }
  }
}