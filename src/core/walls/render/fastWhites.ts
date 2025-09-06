/**
 * @fileoverview Corresponds to fast_whites() from orig/Sources/Junctions.c:634
 */

import type { MonochromeBitmap, WhiteRec } from '../types'
import { whiteWallPiece } from './whiteWallPiece'
import { eorWallPiece } from './eorWallPiece'
import { getAlignment } from '@core/shared'

// Constants from the original assembly code
const SCREEN_MARGIN = 15 // Pixels to check left of screen for whites that extend into view
const FAST_SEARCH_JUMP = 16 // Number of elements to jump in fast search phase

/**
 * Draws all visible white wall pieces
 *
 * DEVIATION FROM ORIGINAL:
 * For junction whites (hasj=true), the original used pre-computed hash patterns with
 * a fixed alignment. We now calculate alignment at runtime and select between two
 * pre-computed versions (dataAlign0/dataAlign1) to support alignment mode switching.
 * See src/shared/alignment.ts for full explanation of the alignment system changes.
 *
 * @see orig/Sources/Junctions.c:634 fast_whites()
 * @param deps - Dependencies object containing:
 *   @param whites - Array of white wall records
 *   @param viewport - Viewport coordinates
 *   @param worldwidth - World width for wrapping
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const fastWhites =
  (deps: {
    whites: WhiteRec[]
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { whites, viewport, worldwidth } = deps
    // Deep clone the screen bitmap for immutability
    let newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    const top = viewport.y
    const bot = viewport.b
    let left = viewport.x - SCREEN_MARGIN
    let right = viewport.r

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
          // Calculate current alignment for this junction
          const align = getAlignment({
            x: wh.x,
            y: wh.y,
            screenX: viewport.x,
            screenY: viewport.y
          })

          // Select appropriate pre-computed data
          const data =
            align === 0 ? wh.dataAlign0 || wh.data : wh.dataAlign1 || wh.data

          newScreen = eorWallPiece({
            x: drawX,
            y: drawY,
            height: wh.ht,
            data: new Uint8Array(data)
          })(newScreen)
        } else {
          // Non-junction whites unchanged
          newScreen = whiteWallPiece({
            x: drawX,
            y: drawY,
            height: wh.ht,
            data: new Uint8Array(wh.data)
          })(newScreen)
        }

        whIndex++
      }

      // Restore left and adjust for next iteration (orig asm lines 699, 703-704)
      left -= SCREEN_MARGIN
      left -= worldwidth
      right -= worldwidth
    }

    return newScreen
  }
