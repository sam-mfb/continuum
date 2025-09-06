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
 * @param deps - Dependencies object containing:
 *   @param whites - Array of white wall records
 *   @param junctions - Array of junction records
 *   @param firstWhite - ID of first white wall
 *   @param organizedWalls - Wall lookup by ID
 *   @param viewport - Viewport coordinates
 *   @param worldwidth - World width for wrapping
 * @returns A curried function that takes a screen and returns a new MonochromeBitmap
 */
export const whiteTerrain =
  (deps: {
    whites: WhiteRec[]
    junctions: JunctionRec[]
    firstWhite: string | null
    organizedWalls: Record<string, LineRec>
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }) =>
  (screen: MonochromeBitmap): MonochromeBitmap => {
    const {
      whites,
      junctions,
      firstWhite,
      organizedWalls,
      viewport,
      worldwidth
    } = deps
    // Deep clone the screen bitmap for immutability
    let newScreen: MonochromeBitmap = {
      data: new Uint8Array(screen.data),
      width: screen.width,
      height: screen.height,
      rowBytes: screen.rowBytes
    }

    // Draw white endpoint and junction patches (line 91)
    newScreen = fastWhites({
      whites: whites,
      viewport: viewport,
      worldwidth: worldwidth
    })(newScreen)

    // Draw crosshatch patterns at junctions (line 93)
    newScreen = fastHashes({
      junctions: junctions,
      viewport: viewport,
      worldwidth: worldwidth
    })(newScreen)

    // Set up visibility bounds (lines 95-98)
    const right = viewport.r
    const left = viewport.x - LEFT_MARGIN
    const top = viewport.y - TOP_MARGIN
    const bot = viewport.b

    // Draw NNE wall white undersides - first pass (lines 99-105)
    if (firstWhite !== null) {
      // Find first visible NNE wall
      let wallId: string | null = firstWhite

      // Skip walls completely to the left (lines 99-100)
      while (wallId !== null) {
        const wall: LineRec | undefined = organizedWalls[wallId]
        if (!wall) break
        if (wall.endx >= left) break
        wallId = wall.nextwhId || null
      }

      // Draw visible NNE walls (lines 101-105)
      while (wallId !== null) {
        const wall: LineRec | undefined = organizedWalls[wallId]
        if (!wall) break
        if (wall.startx >= right) break // Stop when past right edge

        // Visibility check
        if (
          wall.endx >= left &&
          (wall.starty >= top || wall.endy >= top) &&
          (wall.starty < bot || wall.endy < bot)
        ) {
          newScreen = nneWhite({
            linerec: wall,
            scrx: viewport.x,
            scry: viewport.y
          })(newScreen)
        }

        wallId = wall.nextwhId || null
      }

      // World wrapping - second pass with adjusted coordinates (lines 106-110)
      const wrappedRight = right - worldwidth
      wallId = firstWhite

      while (wallId !== null) {
        const wall: LineRec | undefined = organizedWalls[wallId]
        if (!wall) break
        if (wall.startx >= wrappedRight) break

        // Visibility check for wrapped walls
        if (
          (wall.starty >= top || wall.endy >= top) &&
          (wall.starty < bot || wall.endy < bot)
        ) {
          newScreen = nneWhite({
            linerec: wall,
            scrx: viewport.x - worldwidth,
            scry: viewport.y
          })(newScreen)
        }

        wallId = wall.nextwhId || null
      }
    }

    return newScreen
  }
