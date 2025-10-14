/**
 * @fileoverview Corresponds to black_terrain() from orig/Sources/Terrain.c:46
 */

import type { Frame } from '@/lib/frame'
import {
  LINE_KIND,
  NEW_TYPE,
  type LineAlt,
  type LineRec,
  type NewType
} from '@core/walls'
import { Z } from './z'
import { SBARHT } from '@/core/screen'

// Screen boundary margins from original code
const LEFT_MARGIN = 10 // Pixels to check left of screen
const TOP_MARGIN = 6 // Pixels to check above screen

/**
 * @param deps - Dependencies object containing:
 *   @param thekind - The line kind to draw (L_NORMAL, L_BOUNCE, etc.)
 *   @param kindPointers - Map of kind to first line ID
 *   @param organizedWalls - Map of line ID to line record
 *   @param viewport - Screen bounds
 *   @param worldwidth - World width for wrapping
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const drawWalls =
  (deps: {
    thekind: number
    kindPointers: Record<number, string | null>
    organizedWalls: Record<string, LineRec>
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
    altEndpoints: Record<string, LineAlt>
  }) =>
  (oldFrame: Frame): Frame => {
    const {
      thekind,
      kindPointers,
      organizedWalls,
      viewport,
      worldwidth,
      altEndpoints
    } = deps
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
        const origLine: LineRec | undefined = organizedWalls[lineId]
        if (!origLine) break
        // use alternate endpoints to join junctions
        const altLine = altEndpoints[origLine.id]
        const line: LineRec = {
          ...origLine,
          startx: altLine?.startX ?? origLine.startx,
          endx: altLine?.endX ?? origLine.endx,
          starty: altLine?.startY ?? origLine.starty,
          endy: altLine?.endY ?? origLine.endy
        }
        if (line.endx > left) break // Found one that might be visible
        lineId = line.nextId
      }

      // Draw visible lines (lines 71-75)
      while (lineId !== null) {
        const origLine: LineRec | undefined = organizedWalls[lineId]
        if (!origLine) break
        // use alternate endpoints to join junctions
        const altLine = altEndpoints[origLine.id]
        const line: LineRec = {
          ...origLine,
          startx: altLine?.startX ?? origLine.startx,
          endx: altLine?.endX ?? origLine.endx,
          starty: altLine?.startY ?? origLine.starty,
          endy: altLine?.endY ?? origLine.endy
        }
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
      const origLine: LineRec | undefined = organizedWalls[lineId]
      if (!origLine) break
      // use alternate endpoints to join junctions
      const altLine = altEndpoints[origLine.id]
      const line: LineRec = {
        ...origLine,
        startx: altLine?.startX ?? origLine.startx,
        endx: altLine?.endX ?? origLine.endx,
        starty: altLine?.startY ?? origLine.starty,
        endy: altLine?.endY ?? origLine.endy
      }
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
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      width: 2,
      color: 'black',
      alpha: 1,
      z: Z.WALL_TOP
    })
    newFrame.drawables.push({
      id: `${line.id}-white`,
      type: 'shape',
      points: wallShape(
        { start: { x: startX, y: startY }, end: { x: endX, y: endY } },
        line.newtype
      ),
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
  const DOWN = 6 // Downward component (creates 3D effect)

  let offsetXstart = PERP
  let offsetXend = PERP
  let offsetYstart = DOWN
  let offsetYend = DOWN

  // not strictly geometrically correct, but this gives the
  // ESE line a little bit of depth
  if (type === NEW_TYPE.ESE) {
    offsetXstart = 9 // Relative to line.end (NE corner)
    offsetYstart = 8
    offsetXend = 9 // Relative to line.end (NE corner)
    offsetYend = 4
  }

  // Return 4 corners forming a trapezoid that extends from the line
  // with a 3D perspective effect
  // The bottom edge (from bottom-right to bottom-left) should not be stroked
  return [
    { x: line.start.x, y: line.start.y, strokeAfter: false }, // Top-left (line start)
    { x: line.end.x, y: line.end.y }, // Top-right (line end)
    {
      x: line.end.x + offsetXend,
      y: line.end.y + offsetYend,
      strokeAfter: false
    }, // Bottom-right (don't stroke to bottom-left)
    {
      x: line.start.x + offsetXstart,
      y: line.start.y + offsetYstart,
      strokeAfter: type === NEW_TYPE.ESE ? false : true
    } // Bottom-left
  ]
}
