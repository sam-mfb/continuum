/**
 * @fileoverview Corresponds to fast_whites() from orig/Sources/Junctions.c:634
 */

import type { MonochromeBitmap, WhiteRec } from '../types'
import { whiteWallPiece } from './whiteWallPiece'
import { eorWallPiece } from './eorWallPiece'

// Constants from the original assembly code
const SCREEN_MARGIN = 15 // Pixels to check left of screen for whites that extend into view
const FAST_SEARCH_JUMP = 16 // Number of elements to jump in fast search phase

/**
 * Draws all visible white wall pieces
 * @see orig/Sources/Junctions.c:634 fast_whites()
 */
export const fastWhites = (
  screen: MonochromeBitmap,
  data: {
    whites: WhiteRec[]
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }
): MonochromeBitmap => {
  // Deep clone the screen bitmap for immutability
  let newScreen: MonochromeBitmap = {
    data: new Uint8Array(screen.data),
    width: screen.width,
    height: screen.height,
    rowBytes: screen.rowBytes
  }

  const whites = data.whites
  const top = data.viewport.y
  const bot = data.viewport.b
  let left = data.viewport.x - SCREEN_MARGIN
  let right = data.viewport.r

  // Process twice for donut world wrapping (orig/Sources/Junctions.c:833)
  for (let i = 0; i < 2; i++) {
    let whIndex = 0

    // Fast search with 16-element jumps (orig asm lines 840-844)
    while (
      whIndex + FAST_SEARCH_JUMP < whites.length &&
      whites[whIndex + FAST_SEARCH_JUMP]!.x <= left
    ) {
      whIndex += FAST_SEARCH_JUMP
    }

    // Single-element stepping to find exact start (orig asm lines 847-849)
    while (whIndex < whites.length && whites[whIndex]!.x <= left) {
      whIndex++
    }

    // Adjust left for inner loop check
    left += SCREEN_MARGIN

    // Main drawing loop (orig asm lines 854-879)
    while (whIndex < whites.length && whites[whIndex]!.x <= right) {
      const wh = whites[whIndex]!

      // Y bounds check (orig asm lines 854-858)
      if (wh.y >= bot || wh.y + wh.ht <= top) {
        whIndex++
        continue
      }

      // Calculate drawing position
      const drawX = wh.x - left
      const drawY = wh.y - top

      // Call appropriate drawing function (orig asm lines 689-696)
      if (wh.hasj) {
        newScreen = eorWallPiece(
          newScreen,
          drawX,
          drawY,
          wh.ht,
          new Uint8Array(wh.data)
        )
      } else {
        newScreen = whiteWallPiece(
          newScreen,
          drawX,
          drawY,
          wh.ht,
          new Uint8Array(wh.data)
        )
      }

      whIndex++
    }

    // Restore left and adjust for next iteration (orig asm lines 699, 703-704)
    left -= SCREEN_MARGIN
    left -= data.worldwidth
    right -= data.worldwidth
  }

  return newScreen
}
