/**
 * @fileoverview Corresponds to fast_hashes() from orig/Sources/Junctions.c:822
 */

import type { MonochromeBitmap, JunctionRec } from '../types'
import { drawHash } from './drawHash'
import { VIEWHT, SCRWTH, SBARHT } from '../../screen/constants'
import { findWAddress } from '../../asm/assemblyMacros'

// Constants from the original assembly code
const SCREEN_TOP_MARGIN = 5 // Pixels to check above screen for hashes
const SCREEN_LEFT_MARGIN = 8 // Pixels to check left of screen for hashes
const FAST_SEARCH_JUMP = 16 // Number of elements to jump in fast search phase

/**
 * Draws crosshatch patterns at visible junctions
 * @see orig/Sources/Junctions.c:822 fast_hashes()
 * @param deps - Dependencies object containing:
 *   @param junctions - Array of junction records
 *   @param viewport - Viewport coordinates
 *   @param worldwidth - World width for wrapping
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const fastHashes =
  (deps: {
    junctions: JunctionRec[]
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { junctions, viewport, worldwidth } = deps
    // Deep clone the screen bitmap for immutability
    let newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    const top = viewport.y - SCREEN_TOP_MARGIN
    const bot = viewport.b
    let left = viewport.x - SCREEN_LEFT_MARGIN
    let right = viewport.r

    // Process twice for donut world wrapping (orig/Sources/Junctions.c:833)
    for (let i = 0; i < 2; i++) {
      let jIndex = 0

      // Fast search with 16-element jumps (orig asm lines 841-844)
      while (
        jIndex + FAST_SEARCH_JUMP < junctions.length &&
        junctions[jIndex + FAST_SEARCH_JUMP]!.x <= left
      ) {
        jIndex += FAST_SEARCH_JUMP
      }

      // Single-element stepping to find exact start (orig asm lines 847-849)
      while (jIndex < junctions.length && junctions[jIndex]!.x <= left) {
        jIndex++
      }

      // Adjust left for inner loop check (line 851)
      left += SCREEN_LEFT_MARGIN

      // Main drawing loop (orig asm lines 854-905)
      while (jIndex < junctions.length && junctions[jIndex]!.x <= right) {
        const junction = junctions[jIndex]!

        // Y bounds check (orig asm lines 854-858)
        if (junction.y < top || junction.y >= bot) {
          jIndex++
          continue
        }

        // Calculate drawing position
        const drawX = junction.x - left
        const drawY = junction.y - viewport.y

        // Check if we can use the optimized inline drawing (lines 863-869)
        if (
          drawY >= 0 &&
          drawY < VIEWHT - 5 &&
          drawX >= 0 &&
          drawX < SCRWTH - 9
        ) {
          // Optimized inline hash drawing (@do_quick section, lines 881-905)
          const adjustedY = drawY + SBARHT

          // Calculate screen address using FIND_WADDRESS macro
          let address = findWAddress(0, drawX, adjustedY)

          // Calculate bit position
          const bitPos = drawX & 15

          // Create the hash pattern using bit operations
          // Start with 0x80000000 and shift right by bitPos
          let pattern = 0x80000000 >>> bitPos

          // Line 0: or.l D0, (A0)
          orPatternToScreen(newScreen, address, pattern)

          // Lines 889-892: Create wider pattern for line 1
          const pattern1 = pattern | (pattern >>> 1)
          const shifted1 = pattern1 >>> 1
          orPatternToScreen(newScreen, address + newScreen.rowBytes, shifted1)

          // Line 2: shift by 2 more (line 894-895)
          const shifted2 = shifted1 >>> 2
          orPatternToScreen(
            newScreen,
            address + newScreen.rowBytes * 2,
            shifted2
          )

          // Line 3: shift by 2 more (line 896-897)
          const shifted3 = shifted2 >>> 2
          orPatternToScreen(
            newScreen,
            address + newScreen.rowBytes * 3,
            shifted3
          )

          // Line 4: shift by 2 more (line 898-899)
          const shifted4 = shifted3 >>> 2
          orPatternToScreen(
            newScreen,
            address + newScreen.rowBytes * 4,
            shifted4
          )

          // Line 5: special handling with AND operation (lines 900-904)
          const temp = shifted4 >>> 2
          const shifted5 = (shifted4 >>> 1) & temp
          orPatternToScreen(
            newScreen,
            address + newScreen.rowBytes * 5,
            shifted5
          )
        } else {
          // Use the general draw_hash function for edge cases (lines 871-874)
          newScreen = drawHash({ x: drawX, y: drawY })(newScreen)
        }

        jIndex++
      }

      // Restore left and adjust for next iteration (lines 907, 909-910)
      left -= SCREEN_LEFT_MARGIN
      left -= worldwidth
      right -= worldwidth
    }

    return newScreen
  }

/**
 * Helper function to OR a 32-bit pattern into screen memory
 */
function orPatternToScreen(
  screen: MonochromeBitmap,
  address: number,
  pattern: number
): void {
  if (pattern !== 0) {
    // Extract bytes from the 32-bit value (big-endian order)
    const byte3 = (pattern >>> 24) & 0xff
    const byte2 = (pattern >>> 16) & 0xff
    const byte1 = (pattern >>> 8) & 0xff
    const byte0 = pattern & 0xff

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
}
