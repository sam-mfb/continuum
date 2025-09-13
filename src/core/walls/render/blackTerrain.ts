/**
 * @fileoverview Corresponds to black_terrain() from orig/Sources/Terrain.c:46
 */

import type { MonochromeBitmap, LineRec } from '../types'
import { blackRoutines } from './blackRoutines'

// Screen boundary margins from original code
const LEFT_MARGIN = 10 // Pixels to check left of screen
const TOP_MARGIN = 6 // Pixels to check above screen

/**
 * Draws all black terrain elements (top surfaces) of a specific kind
 * @see orig/Sources/Terrain.c:46 black_terrain()
 * @param deps - Dependencies object containing:
 *   @param thekind - The line kind to draw (L_NORMAL, L_BOUNCE, etc.)
 *   @param kindPointers - Map of kind to first line ID
 *   @param organizedWalls - Map of line ID to line record
 *   @param viewport - Screen bounds
 *   @param worldwidth - World width for wrapping
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const blackTerrain =
  (deps: {
    thekind: number
    kindPointers: Record<number, string | null>
    organizedWalls: Record<string, LineRec>
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const { thekind, kindPointers, organizedWalls, viewport, worldwidth } = deps
    // Deep clone the screen bitmap for immutability
    let newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    // Get the first line of this kind (line 52)
    const firstLineId = kindPointers[thekind]
    if (!firstLineId) {
      return newScreen // No lines of this kind
    }

    // Set up visibility bounds (lines 54-57)
    const right = viewport.r
    const bot = viewport.b
    const left = viewport.x - LEFT_MARGIN
    const top = viewport.y - TOP_MARGIN

    // Check if any lines could be visible (line 58)
    let p = organizedWalls[firstLineId]
    if (!p || p.startx >= right) {
      // First pass - nothing visible, but still need to check wrapped
    } else {
      // Find first potentially visible line (lines 60-70)
      let lineId: string | null = firstLineId

      // Fast forward to first line that might be visible (assembly loop)
      while (lineId !== null) {
        const line: LineRec | undefined = organizedWalls[lineId]
        if (!line) break
        if (line.endx > left) break // Found one that might be visible
        lineId = line.nextId
      }

      // Draw visible lines (lines 71-75)
      while (lineId !== null) {
        const line: LineRec | undefined = organizedWalls[lineId]
        if (!line) break
        if (line.startx >= right) break // Past right edge, stop

        // Visibility check (lines 72-74)
        if (
          line.endx >= left &&
          (line.starty >= top || line.endy >= top) &&
          (line.starty < bot || line.endy < bot)
        ) {
          // BLACK_LINE_Q macro - calls appropriate black drawing routine
          const drawFunc = blackRoutines[line.newtype]
          if (drawFunc) {
            newScreen = drawFunc({
              line,
              scrx: viewport.x,
              scry: viewport.y
            })(newScreen)
          }
        }

        lineId = line.nextId
      }
    }

    // World wrapping - second pass with adjusted coordinates
    // This pass is to draw the far-left side of the world when the
    // viewport is on the far-right.
    const wrappedRight = viewport.r - worldwidth
    const wrappedScrx = viewport.x - worldwidth

    // Re-initialize lineId to the start of the list for the second pass,
    // matching the `p = kindptrs[thekind]` initialization in the C `for` loop.
    let lineId: string | null = firstLineId

    while (lineId !== null) {
      const line: LineRec | undefined = organizedWalls[lineId]
      if (!line) break

      // This is the continuation condition from the C `for` loop: `p->startx < right`.
      // If a line's start is beyond the wrapped right boundary, we can stop.
      if (line.startx >= wrappedRight) {
        break
      }

      // This is the visibility check from the C `if` statement.
      if (
        (line.starty >= top || line.endy >= top) &&
        (line.starty < bot || line.endy < bot)
      ) {
        // This corresponds to the `BLACK_LINE_Q` macro call.
        const drawFunc = blackRoutines[line.newtype]
        if (drawFunc) {
          newScreen = drawFunc({
            line,
            scrx: wrappedScrx, // Use the wrapped screen coordinate
            scry: viewport.y
          })(newScreen)
        }
      }

      lineId = line.nextId
    }

    return newScreen
  }
