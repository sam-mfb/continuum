/**
 * @fileoverview Corresponds to draw_nneline() from orig/Sources/Draw.c:988
 * Draws a north-north-east diagonal line (1 right for every 2 up)
 */

import type { MonochromeBitmap } from '../../types'
import { SCRWTH } from '../../../screen/constants'

/**
 * Draw a north-north-east diagonal line (1 pixel right for every 2 pixels up)
 * @param deps - Dependencies object containing:
 *   @param x - Starting x coordinate
 *   @param y - Starting y coordinate
 *   @param len - Length of the line
 *   @param dir - Direction: positive for down, negative/zero for up
 * @see orig/Sources/Draw.c:988 draw_nneline()
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawNneline =
  (deps: { x: number; y: number; len: number; dir: number }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { x, y, len: lenParam, dir } = deps
    let len = lenParam
    // Deep clone the screen bitmap for immutability
    const newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }
    // Right edge clipping (lines 1001-1002)
    if (x + (len >> 1) + 1 >= SCRWTH) {
      len -= 1 + (len & 0x0001)
    }

    if (len < 0) return newScreen

    // Calculate byte address using FIND_BADDRESS logic
    let byteX = x >> 3 // No word alignment for byte operations
    let address = y * newScreen.rowBytes + byteX

    // Get bit position within byte (0-7)
    const bitPos = x & 7

    // Initial mask: 0xC0 (11000000) shifted right by bit position
    let mask = (0xc0 >> bitPos) & 0xff

    // Row offset: 64 bytes per row, negative for upward
    const rowOffset = dir > 0 ? 64 : -64

    let remainingLen = len

    // Pre-loop: Handle initial pixels until byte boundary or single pixel
    while (mask > 1 && remainingLen >= 0) {
      if (address >= 0 && address < newScreen.data.length) {
        newScreen.data[address]! |= mask
      }
      address += rowOffset

      // Rotate mask right by 1 (ror.b #1, D0)
      const carry = mask & 1
      mask = ((mask >> 1) | (carry << 7)) & 0xff

      remainingLen--
    }

    if (remainingLen < 0) return newScreen

    // Handle cross-byte dots (lines 1033-1042)
    if (mask === 1 || mask === 0x80) {
      // Set rightmost pixel of current byte
      if (address >= 0 && address < newScreen.data.length) {
        newScreen.data[address]! |= 0x01
      }
      // Set leftmost pixel of next byte
      if (address + 1 >= 0 && address + 1 < newScreen.data.length) {
        newScreen.data[address + 1]! |= 0x80
      }

      // Move to next position
      address += rowOffset
      remainingLen--

      // Move pointer right by half a byte for next iteration
      if ((remainingLen & 1) === 0 && address + 1 < newScreen.data.length) {
        address++
        mask = 0x40 // Start at bit 1 of new byte
      } else {
        mask = 0xc0 // Back to start pattern
      }
    }

    // Main loop: Process 16 pixels at a time
    while (remainingLen >= 16) {
      const baseAddr = address

      if (dir > 0) {
        // Downward direction (dnloop)
        // Unrolled loop for 16 pixels
        if (baseAddr >= 0 && baseAddr < newScreen.data.length) {
          newScreen.data[baseAddr]! |= 0xc0 // Rows 0-1
        }
        if (baseAddr + 128 >= 0 && baseAddr + 128 < newScreen.data.length) {
          newScreen.data[baseAddr + 128]! |= 0x60 // Rows 2-3
        }
        if (baseAddr + 256 >= 0 && baseAddr + 256 < newScreen.data.length) {
          newScreen.data[baseAddr + 256]! |= 0x30 // Rows 4-5
        }
        if (baseAddr + 384 >= 0 && baseAddr + 384 < newScreen.data.length) {
          newScreen.data[baseAddr + 384]! |= 0x18 // Rows 6-7
        }
        if (baseAddr + 512 >= 0 && baseAddr + 512 < newScreen.data.length) {
          newScreen.data[baseAddr + 512]! |= 0x0c // Rows 8-9
        }
        if (baseAddr + 640 >= 0 && baseAddr + 640 < newScreen.data.length) {
          newScreen.data[baseAddr + 640]! |= 0x06 // Rows 10-11
        }
        if (baseAddr + 768 >= 0 && baseAddr + 768 < newScreen.data.length) {
          newScreen.data[baseAddr + 768]! |= 0x03 // Rows 12-13
        }
        // Rows 14-15: split across byte boundary
        if (baseAddr + 896 >= 0 && baseAddr + 896 < newScreen.data.length) {
          newScreen.data[baseAddr + 896]! |= 0x01
        }
        if (baseAddr + 897 >= 0 && baseAddr + 897 < newScreen.data.length) {
          newScreen.data[baseAddr + 897]! |= 0x80
        }

        // Move to next column position
        address += 16 * 64 + 1 // 16 rows down, 1 byte right
      } else {
        // Upward direction (uploop)
        // Unrolled loop for 16 pixels
        if (baseAddr >= 0 && baseAddr < newScreen.data.length) {
          newScreen.data[baseAddr]! |= 0xc0 // Rows 0-1
        }
        if (baseAddr - 128 >= 0 && baseAddr - 128 < newScreen.data.length) {
          newScreen.data[baseAddr - 128]! |= 0x60 // Rows -2 to -3
        }
        if (baseAddr - 256 >= 0 && baseAddr - 256 < newScreen.data.length) {
          newScreen.data[baseAddr - 256]! |= 0x30 // Rows -4 to -5
        }
        if (baseAddr - 384 >= 0 && baseAddr - 384 < newScreen.data.length) {
          newScreen.data[baseAddr - 384]! |= 0x18 // Rows -6 to -7
        }
        if (baseAddr - 512 >= 0 && baseAddr - 512 < newScreen.data.length) {
          newScreen.data[baseAddr - 512]! |= 0x0c // Rows -8 to -9
        }
        if (baseAddr - 640 >= 0 && baseAddr - 640 < newScreen.data.length) {
          newScreen.data[baseAddr - 640]! |= 0x06 // Rows -10 to -11
        }
        if (baseAddr - 768 >= 0 && baseAddr - 768 < newScreen.data.length) {
          newScreen.data[baseAddr - 768]! |= 0x03 // Rows -12 to -13
        }
        // Rows -14 to -15: split across byte boundary
        if (baseAddr - 896 >= 0 && baseAddr - 896 < newScreen.data.length) {
          newScreen.data[baseAddr - 896]! |= 0x01
        }
        if (baseAddr - 895 >= 0 && baseAddr - 895 < newScreen.data.length) {
          newScreen.data[baseAddr - 895]! |= 0x80
        }

        // Move to next column position
        address -= 16 * 64 - 1 // 16 rows up, 1 byte right
      }

      remainingLen -= 16
    }

    // Post-loop: Handle remaining pixels (lines 1112-1127)
    if (remainingLen > 0) {
      mask = 0xc0 // Reset to initial pattern

      while (remainingLen > 0) {
        if (address >= 0 && address < newScreen.data.length) {
          newScreen.data[address]! |= mask
        }

        address += rowOffset
        mask >>= 1 // Logical shift right
        remainingLen--

        // Check if mask is empty (crossed byte boundary)
        if (mask === 0 && remainingLen > 0) {
          // Set final cross-byte pixels
          if (address >= 0 && address < newScreen.data.length) {
            newScreen.data[address]! |= 0x01
          }
          if (address + 1 >= 0 && address + 1 < newScreen.data.length) {
            newScreen.data[address + 1]! |= 0x80
          }
          break
        }
      }
    }

    return newScreen
  }
