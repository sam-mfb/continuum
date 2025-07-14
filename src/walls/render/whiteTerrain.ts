/**
 * @fileoverview Corresponds to white_terrain() from orig/Sources/Terrain.c:86
 */

import type { MonochromeBitmap, WhiteRec, JunctionRec, LineRec } from '../types'
import { fastWhites } from './fastWhites'
import { fastHashes } from './fastHashes'
import { nneWhite } from './directional/nneWhite'

// Screen boundary margins from original code
const LEFT_MARGIN = 10 // Pixels to check left of screen
const TOP_MARGIN = 6 // Pixels to check above screen

/**
 * Draws all white terrain elements (undersides, patches, and hashes)
 * @see orig/Sources/Terrain.c:86 white_terrain()
 */
export const whiteTerrain = (
  screen: MonochromeBitmap,
  data: {
    whites: WhiteRec[]
    junctions: JunctionRec[]
    firstWhite: string | null
    organizedWalls: Record<string, LineRec>
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

  // Draw white endpoint and junction patches (line 91)
  newScreen = fastWhites(newScreen, {
    whites: data.whites,
    viewport: data.viewport,
    worldwidth: data.worldwidth
  })

  // Draw crosshatch patterns at junctions (line 93)
  newScreen = fastHashes(newScreen, {
    junctions: data.junctions,
    viewport: data.viewport,
    worldwidth: data.worldwidth
  })

  // Set up visibility bounds (lines 95-98)
  const right = data.viewport.r
  const left = data.viewport.x - LEFT_MARGIN
  const top = data.viewport.y - TOP_MARGIN
  const bot = data.viewport.b

  // Draw NNE wall white undersides - first pass (lines 99-105)
  if (data.firstWhite !== null) {
    // Find first visible NNE wall
    let wallId: string | null = data.firstWhite

    // Skip walls completely to the left (lines 99-100)
    while (wallId !== null) {
      const wall: LineRec | undefined = data.organizedWalls[wallId]
      if (!wall) break
      if (wall.endx >= left) break
      wallId = wall.nextwhId || null
    }

    // Draw visible NNE walls (lines 101-105)
    while (wallId !== null) {
      const wall: LineRec | undefined = data.organizedWalls[wallId]
      if (!wall) break
      if (wall.startx >= right) break // Stop when past right edge

      // Visibility check
      if (
        wall.endx >= left &&
        (wall.starty >= top || wall.endy >= top) &&
        (wall.starty < bot || wall.endy < bot)
      ) {
        newScreen = nneWhite(newScreen, wall, data.viewport.x, data.viewport.y)
      }

      wallId = wall.nextwhId || null
    }

    // World wrapping - second pass with adjusted coordinates (lines 106-110)
    const wrappedRight = right - data.worldwidth
    wallId = data.firstWhite

    while (wallId !== null) {
      const wall: LineRec | undefined = data.organizedWalls[wallId]
      if (!wall) break
      if (wall.startx >= wrappedRight) break

      // Visibility check for wrapped walls
      if (
        (wall.starty >= top || wall.endy >= top) &&
        (wall.starty < bot || wall.endy < bot)
      ) {
        newScreen = nneWhite(
          newScreen,
          wall,
          data.viewport.x - data.worldwidth,
          data.viewport.y
        )
      }

      wallId = wall.nextwhId || null
    }
  }

  return newScreen
}
