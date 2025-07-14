/**
 * @fileoverview Corresponds to draw_eneline() from orig/Sources/Draw.c:1232
 * Draws east-north-east diagonal lines with double-width pixels
 */

import type { MonochromeBitmap } from '../../types'
import { SCRHT, SBARHT } from '../../../screen/constants'

// Line direction constants
const L_UP = -1
const L_DN = 1

/**
 * Draw an east-north-east diagonal line (2 pixels wide, shallow angle)
 * @param screen - The screen bitmap to draw on
 * @param x - Starting x coordinate
 * @param y - Starting y coordinate  
 * @param len - Length of the line
 * @param dir - Direction: L_DN (1) for down, L_UP (-1) for up
 * @see orig/Sources/Draw.c:1232 draw_eneline()
 */
export const drawEneline = (
  screen: MonochromeBitmap,
  x: number,
  y: number,
  len: number,
  dir: number
): void => {
  // Boundary checking (lines 1233-1235)
  if ((dir === L_DN && y + (len >> 1) >= SCRHT - 1) ||
      (dir === L_UP && y - (len >> 1) <= SBARHT)) {
    len -= 1 + (len & 0x0001)
  }
  
  if (len < 0) return

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
  // Calculate word-aligned byte offset
  const endByteX = (endX >> 3) & 0xfffe
  const endAddress = endY * screen.rowBytes + endByteX
  
  // Draw last 2 dots (lines 1260-1263)
  const endBitPos = endX & 31
  const endPattern = (0xc0000000 >>> endBitPos) >>> 0
  
  if (endAddress >= 0 && endAddress + 3 < screen.data.length) {
    // Read current 32-bit value
    let currentData = (screen.data[endAddress]! << 24) |
                     (screen.data[endAddress + 1]! << 16) |
                     (screen.data[endAddress + 2]! << 8) |
                     screen.data[endAddress + 3]!
    
    // OR with pattern
    currentData = (currentData | endPattern) >>> 0
    
    // Write back
    screen.data[endAddress] = (currentData >>> 24) & 0xff
    screen.data[endAddress + 1] = (currentData >>> 16) & 0xff
    screen.data[endAddress + 2] = (currentData >>> 8) & 0xff
    screen.data[endAddress + 3] = currentData & 0xff
  }

  // Adjust parameters for main drawing (line 1264)
  len -= 4

  // Set up direction-dependent offset (lines 1265-1266)
  const scanLineOffset = dir > 0 ? 64 : -64

  // JSR_WADDRESS for start position (line 1239)
  let byteX = (x >> 3) & 0xfffe
  let address = y * screen.rowBytes + byteX
  
  // Draw first 2 dots if length allows (lines 1268-1275)
  if (len >= 0) {
    const startBitPos = x & 31
    const startPattern = (0xc0000000 >>> startBitPos) >>> 0
    
    if (address >= 0 && address + 3 < screen.data.length) {
      let currentData = (screen.data[address]! << 24) |
                       (screen.data[address + 1]! << 16) |
                       (screen.data[address + 2]! << 8) |
                       screen.data[address + 3]!
      
      currentData = (currentData | startPattern) >>> 0
      
      screen.data[address] = (currentData >>> 24) & 0xff
      screen.data[address + 1] = (currentData >>> 16) & 0xff
      screen.data[address + 2] = (currentData >>> 8) & 0xff
      screen.data[address + 3] = currentData & 0xff
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
  byteX = (x >> 3) & 0xfffe
  address = y * screen.rowBytes + byteX

  // Main loop - process 4 pixels at a time
  for (let i = 0; i < mainLoopCount; i++) {
    const baseAddr = address
    
    // Draw 4 scan lines, rotating pattern by 2 bits each time
    for (let scanLine = 0; scanLine < 4; scanLine++) {
      const lineAddr = baseAddr + (scanLine * scanLineOffset)
      
      if (lineAddr >= 0 && lineAddr + 3 < screen.data.length) {
        // Read current data
        let currentData = (screen.data[lineAddr]! << 24) |
                         (screen.data[lineAddr + 1]! << 16) |
                         (screen.data[lineAddr + 2]! << 8) |
                         screen.data[lineAddr + 3]!
        
        // OR with pattern
        currentData = (currentData | pattern) >>> 0
        
        // Write back
        screen.data[lineAddr] = (currentData >>> 24) & 0xff
        screen.data[lineAddr + 1] = (currentData >>> 16) & 0xff
        screen.data[lineAddr + 2] = (currentData >>> 8) & 0xff
        screen.data[lineAddr + 3] = currentData & 0xff
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
    if (address >= 0 && address + 3 < screen.data.length) {
      // Read current data
      let currentData = (screen.data[address]! << 24) |
                       (screen.data[address + 1]! << 16) |
                       (screen.data[address + 2]! << 8) |
                       screen.data[address + 3]!
      
      // OR with pattern
      currentData = (currentData | pattern) >>> 0
      
      // Write back
      screen.data[address] = (currentData >>> 24) & 0xff
      screen.data[address + 1] = (currentData >>> 16) & 0xff
      screen.data[address + 2] = (currentData >>> 8) & 0xff
      screen.data[address + 3] = currentData & 0xff
    }
    
    // Move to next scan line
    address += scanLineOffset
    
    // Rotate pattern right by 2 bits
    pattern = ((pattern >>> 2) | (pattern << 30)) >>> 0
  }
}