/**
 * @fileoverview Corresponds to black_terrain() from orig/Sources/Terrain.c:46
 */

import type { Frame } from '@/lib/frame'
import { LINE_KIND, NEW_TYPE, type LineRec, type NewType } from '@core/walls'
import { Z } from './z'
import { SBARHT } from '@/core/screen'

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
  (oldFrame: Frame): Frame => {
    const { thekind, kindPointers, organizedWalls, viewport, worldwidth } = deps
    let newFrame: Frame = {
      width: oldFrame.width,
      height: oldFrame.height,
      drawables: [...oldFrame.drawables]
    }

    // Get the first line of this kind (line 52)
    const firstLineId = kindPointers[thekind]
    if (!firstLineId) {
      return newFrame // No lines of this kind
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
          newFrame = drawWall({
            line,
            scrx: viewport.x,
            scry: viewport.y
          })(newFrame)
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
        newFrame = drawWall({
          line,
          scrx: wrappedScrx, // Use the wrapped screen coordinate
          scry: viewport.y
        })(newFrame)
      }

      lineId = line.nextId
    }

    return newFrame
  }

function drawWall(deps: {
  line: LineRec
  scrx: number
  scry: number
}): (oldFrame: Frame) => Frame {
  return oldFrame => {
    const { line, scrx, scry } = deps
    let newFrame: Frame = {
      width: oldFrame.width,
      height: oldFrame.height,
      drawables: [...oldFrame.drawables]
    }
    const startX = line.startx - scrx
    const startY = line.starty - scry + SBARHT
    const endX = line.endx - scrx
    const endY = line.endy - scry + SBARHT

    // Apply line tweaks to adjust coordinates based on direction
    const tweaked = lineTweaks(
      line,
      { x: startX, y: startY },
      { x: endX, y: endY }
    )

    let zindex: number = 0
    switch (line.kind) {
      case LINE_KIND.BOUNCE:
        zindex = Z.BOUNCE_WALL
        break
      case LINE_KIND.GHOST:
        zindex = Z.GHOST_WALL
        break
      case LINE_KIND.NORMAL:
        zindex = Z.NORMAL_WALL
        break
      default:
        break
    }
    newFrame.drawables.push({
      id: `${line.id}-black`,
      type: 'line',
      start: tweaked.start,
      end: tweaked.end,
      width: 2,
      color: 'black',
      alpha: 1,
      z: zindex
    })
    newFrame.drawables.push({
      id: `${line.id}-white`,
      type: 'shape',
      points: wallShape(tweaked, line.newtype),
      strokeColor: 'black',
      strokeWidth: 1,
      fillColor: 'white',
      alpha: 1,
      z: zindex
    })
    return newFrame
  }
}

/**
 * Calculate the 4 corner points for a wall shape with 3D perspective
 *
 * The shape represents the white "underside" of a raised platform wall.
 * To create a 3D effect, the wall extends from the top edge line at an angle
 * approximately 26.6° below the perpendicular (based on original game's 2:1 slope).
 *
 * For a 12-pixel depth:
 * - Perpendicular component: ~11 pixels (cos 26.6°)
 * - Downward component: ~5 pixels (sin 26.6°)
 *
 * @param line - The line with start and end points
 * @param type - The NEW_TYPE determining the line orientation
 * @returns Array of 4 points forming a quadrilateral (clockwise from top-left)
 */
function wallShape(
  line: {
    start: { x: number; y: number }
    end: { x: number; y: number }
  },
  type: NewType
): [
  { x: number; y: number; strokeAfter?: boolean },
  { x: number; y: number; strokeAfter?: boolean },
  { x: number; y: number; strokeAfter?: boolean },
  { x: number; y: number; strokeAfter?: boolean }
] {
  // 3D perspective: wall extends ~26.6° below perpendicular
  // For 12px depth: perpendicular = 11px, downward = 5px
  const PERP = 11 // Perpendicular component
  const DOWN = 5 // Downward component (creates 3D effect)

  let offsetX = 0
  let offsetY = 0

  // Per-corner adjustments (applied after base offsets)
  let bottomRightAdjust = { x: 0, y: 0 }
  let bottomLeftAdjust = { x: 0, y: 0 }

  switch (type) {
    case NEW_TYPE.S: // South (vertical line)
      // Line direction: straight down (0°)
      // Perpendicular: right (+x), Downward: down (+y)
      offsetX = Math.round(PERP * 0.9 - 1) // ~9
      offsetY = Math.round(DOWN * 0.9) // ~5
      bottomRightAdjust = { x: 0, y: -1 } // SE corner up 1px
      break

    case NEW_TYPE.SSE: // South-Southeast (~22.5° from vertical)
      // Line direction: down-right at 22.5°
      // Should extend slightly more east and less downward
      offsetX = Math.round(PERP * 0.924 + DOWN * 0.3 - 2) // ~10
      offsetY = Math.round(PERP * 0.3 + DOWN * 0.82) // ~8
      bottomRightAdjust = { x: 0, y: -1 } // SE corner up 1px
      break

    case NEW_TYPE.SE: // Southeast (45° diagonal)
      // Line direction: down-right at 45°
      // Should extend more to the east and less downward
      offsetX = Math.round(PERP * 0.924 + DOWN * 0.707) // ~13
      offsetY = Math.round(PERP * 0.707 + DOWN * 0.383) // ~10
      bottomRightAdjust = { x: -4, y: -4 }
      break

    case NEW_TYPE.ESE: // East-Southeast (~67.5° from vertical)
      // Line direction: mostly right at 67.5°
      offsetX = 9 // Relative to line.end (NE corner)
      offsetY = 7
      break

    case NEW_TYPE.E: // East (horizontal line)
      // Line direction: right (90°)
      // Should extend at ~12° angle (mostly rightward with slight downward)
      offsetX = Math.round(PERP * 0.978 + DOWN * 0.1) - 1 // ~10
      offsetY = Math.round(PERP * 0.1 + DOWN * 0.978) - 1 // ~5
      break

    case NEW_TYPE.ENE: // East-Northeast (~112.5° from vertical)
      // Line direction: right and up at 112.5°
      // Should extend at ~45° to the right/east with reduced height
      offsetX = Math.round(PERP * 0.707 + DOWN * 0.2) // ~9
      offsetY = Math.round(PERP * 0.2 + DOWN * 0.707) // ~6
      break

    case NEW_TYPE.NE: // Northeast (135° from vertical, 45° upward)
      // Line direction: up-right at 135°
      // Should extend slightly more east and less downward
      offsetX = Math.round(PERP * 0.82 + DOWN * 0.2) // ~10
      offsetY = Math.round(PERP * 0.2 + DOWN * 0.3) // ~4
      break

    case NEW_TYPE.NNE: // North-Northeast (~157.5° from vertical)
      // Line direction: mostly up at 157.5°
      // Adjusted coefficients for visual correctness
      offsetX = Math.round(PERP * 0.82 + DOWN * 0.2) - 1 // ~9
      offsetY = Math.round(PERP * 0.2 + DOWN * 0.3) // ~4
      break
  }

  // Return 4 corners forming a trapezoid that extends from the line
  // with a 3D perspective effect
  // The bottom edge (from bottom-right to bottom-left) should not be stroked
  return [
    { x: line.start.x, y: line.start.y }, // Top-left (line start)
    { x: line.end.x, y: line.end.y }, // Top-right (line end)
    {
      x: line.end.x + offsetX + bottomRightAdjust.x,
      y: line.end.y + offsetY + bottomRightAdjust.y,
      strokeAfter: false
    }, // Bottom-right (don't stroke to bottom-left)
    {
      x: line.start.x + offsetX + bottomLeftAdjust.x,
      y: line.start.y + offsetY + bottomLeftAdjust.y
    } // Bottom-left
  ]
}

function lineTweaks(
  line: LineRec,
  start: { x: number; y: number },
  end: { x: number; y: number }
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  // Global base adjustment - easy to modify
  const baseOffset = { x: 1, y: 1 }

  // Type-specific deltas (empty by default, add as needed)
  const typeDeltas: Partial<
    Record<
      (typeof NEW_TYPE)[keyof typeof NEW_TYPE],
      {
        start: { x: number; y: number }
        end: { x: number; y: number }
      }
    >
  > = {
    [NEW_TYPE.S]: { start: { x: 0, y: -1 }, end: { x: 0, y: 1 } },
    [NEW_TYPE.SSE]: { start: { x: 0, y: -1 }, end: { x: 0, y: 0 } },
    [NEW_TYPE.SE]: { start: { x: 1, y: -1 }, end: { x: 1, y: 0 } },
    [NEW_TYPE.ESE]: { start: { x: 0, y: -1 }, end: { x: 0, y: -1 } },
    [NEW_TYPE.ENE]: { start: { x: 0, y: -1 }, end: { x: 0, y: -1 } }
  }

  const typeDelta = typeDeltas[line.newtype] || {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 }
  }

  return {
    start: {
      x: start.x + baseOffset.x + typeDelta.start.x,
      y: start.y + baseOffset.y + typeDelta.start.y
    },
    end: {
      x: end.x + baseOffset.x + typeDelta.end.x,
      y: end.y + baseOffset.y + typeDelta.end.y
    }
  }
}
