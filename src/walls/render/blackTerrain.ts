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
 */
export const blackTerrain = (
  screen: MonochromeBitmap,
  data: {
    thekind: number // The line kind to draw (L_NORMAL, L_BOUNCE, etc.)
    kindPointers: Record<number, string | null> // Map of kind to first line ID
    organizedWalls: Record<string, LineRec> // Map of line ID to line record
    viewport: { x: number; y: number; b: number; r: number } // Screen bounds
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

  // Get the first line of this kind (line 52)
  const firstLineId = data.kindPointers[data.thekind]
  if (!firstLineId) {
    return newScreen // No lines of this kind
  }

  // Set up visibility bounds (lines 54-57)
  const right = data.viewport.r
  const bot = data.viewport.b
  const left = data.viewport.x - LEFT_MARGIN
  const top = data.viewport.y - TOP_MARGIN

  // Check if any lines could be visible (line 58)
  let p = data.organizedWalls[firstLineId]
  if (!p || p.startx >= right) {
    // First pass - nothing visible, but still need to check wrapped
  } else {
    // Find first potentially visible line (lines 60-70)
    let lineId: string | null = firstLineId
    
    // Fast forward to first line that might be visible (assembly loop)
    while (lineId !== null) {
      const line: LineRec | undefined = data.organizedWalls[lineId]
      if (!line) break
      if (line.endx > left) break // Found one that might be visible
      lineId = line.nextId
    }

    // Draw visible lines (lines 71-75)
    while (lineId !== null) {
      const line: LineRec | undefined = data.organizedWalls[lineId]
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
          newScreen = drawFunc(newScreen, line, data.viewport.x, data.viewport.y)
        }
      }

      lineId = line.nextId
    }
  }

  // World wrapping - second pass with adjusted coordinates (lines 77-82)
  const wrappedRight = right - data.worldwidth
  let lineId: string | null = firstLineId

  while (lineId !== null) {
    const line: LineRec | undefined = data.organizedWalls[lineId]
    if (!line) break
    if (line.startx >= wrappedRight) break

    // Visibility check for wrapped lines (lines 79-80)
    if (
      (line.starty >= top || line.endy >= top) &&
      (line.starty < bot || line.endy < bot)
    ) {
      // BLACK_LINE_Q macro with wrapped coordinates
      const drawFunc = blackRoutines[line.newtype]
      if (drawFunc) {
        newScreen = drawFunc(
          newScreen,
          line,
          data.viewport.x - data.worldwidth,
          data.viewport.y
        )
      }
    }

    lineId = line.nextId
  }

  return newScreen
}