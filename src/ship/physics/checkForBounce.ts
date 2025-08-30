/**
 * @fileoverview Corresponds to check_for_bounce() from orig/Sources/Play.c:268-287
 * and bounce_ship() from orig/Sources/Play.c:291-328
 */

import type { Store } from '@reduxjs/toolkit'
import type { MonochromeBitmap, LineRec } from '@/walls/types'
import type { ShipState } from '@/ship/types'
import { blackTerrain } from '@/walls/render/blackTerrain'
import { checkFigure } from '@/collision/checkFigure'
import { eraseFigure } from '@/ship/render/eraseFigure'
import { SCENTER } from '@/figs/types'
import { LINE_KIND } from '@/shared/types/line'

// Bounce direction tables from Terrain.c:234-240
// First index: 0 = below wall, 1 = above wall
// Second index: 5 + (line.type * line.up_down)
// For line types 1-5 with up_down = -1 or 1
const bounceDirTable: number[][] = [
  [8, 7, 6, 5, -1, -1, -1, 11, 10, 9, 8], // Below wall
  [0, 15, 14, 13, -1, -1, -1, 3, 2, 1, 0] // Above wall
]

export type CheckForBounceData = {
  kindPointers: Record<number, string | null>
  organizedWalls: Record<string, LineRec>
}

export type CheckForBounceDeps = {
  screen: MonochromeBitmap
  store: Store<{ ship: ShipState } & Record<string, unknown>>
  shipDef: MonochromeBitmap
  wallData: CheckForBounceData
  viewport: { x: number; y: number; b: number; r: number }
  worldwidth: number
}

/**
 * Check if ship is colliding with bounce walls and update physics accordingly.
 * This is both a render and state function - it adds bounce walls to the screen
 * and updates the ship's physics state if a collision is detected.
 *
 * @see orig/Sources/Play.c:268-287 check_for_bounce()
 */
export function checkForBounce(deps: CheckForBounceDeps): MonochromeBitmap {
  const { screen, store, shipDef, wallData, viewport, worldwidth } = deps
  const shipState = store.getState().ship

  // Calculate global ship position (Play.c:302-303)
  const globalx = viewport.x + shipState.shipx
  const globaly = viewport.y + shipState.shipy

  // Step 1: Check if there's already a collision before adding bounce walls
  // This would be a collision with ghost walls or other non-bounce elements
  const preExistingCollision = checkFigure(screen, {
    x: shipState.shipx - SCENTER,
    y: shipState.shipy - SCENTER,
    height: 32, // SHIPHT
    def: shipDef
  })

  // Step 2: Render bounce walls onto the screen
  // This corresponds to black_terrain(L_BOUNCE) at Play.c:272
  const screenWithBounceWalls = blackTerrain({
    thekind: LINE_KIND.BOUNCE,
    kindPointers: wallData.kindPointers,
    organizedWalls: wallData.organizedWalls,
    viewport,
    worldwidth
  })(screen)

  // Step 3: Check for collision after adding bounce walls
  // This corresponds to check_figure() at Play.c:274
  const collisionAfterBounce = checkFigure(screenWithBounceWalls, {
    x: shipState.shipx - SCENTER,
    y: shipState.shipy - SCENTER,
    height: 32, // SHIPHT
    def: shipDef
  })

  // Step 4: Only bounce if the collision is NEW (caused by bounce walls, not ghost walls)
  const collision = !preExistingCollision && collisionAfterBounce

  // Step 5: Handle collision result
  if (collision) {
    // Find the closest bounce wall and calculate norm direction
    // This mimics bounce_ship() from Play.c:291-328
    const result = findClosestBounceWall(
      globalx,
      globaly,
      shipState.unbouncex, // Last safe global position
      shipState.unbouncey,
      wallData,
      worldwidth
    )

    if (result !== null) {
      // Dispatch with the norm value (0-15 direction index)
      store.dispatch({
        type: 'ship/bounceShip',
        payload: {
          norm: result.norm
        }
      })
    }

    // CRITICAL: Erase the ship from the screen after bounce detection!
    // This corresponds to Play.c:278-279
    // This prevents the later fatal collision check from triggering on bounce walls
    const screenWithErasedShip = eraseFigure({
      x: shipState.shipx - SCENTER,
      y: shipState.shipy - SCENTER,
      def: shipDef
    })(screenWithBounceWalls)

    return screenWithErasedShip
  } else {
    // No collision - update last safe position
    // Corresponds to Play.c:283-285
    store.dispatch({
      type: 'ship/noBounce',
      payload: {
        globalx: globalx,
        globaly: globaly
      }
    })

    // Return the screen with bounce walls rendered (ship not erased)
    return screenWithBounceWalls
  }
}

/**
 * Find the closest bounce wall to the ship and return the norm direction.
 * Corresponds to bounce_ship() at Play.c:302-313 and getstrafedir() at Terrain.c:242-263
 */
function findClosestBounceWall(
  globalx: number,
  globaly: number,
  unbouncex: number,
  unbouncey: number,
  wallData: CheckForBounceData,
  worldwidth: number
): { norm: number } | null {
  const firstBounceId = wallData.kindPointers[LINE_KIND.BOUNCE]
  if (!firstBounceId) return null

  let closestWall: LineRec | null = null
  let minDistance = 1000 // Start with large distance like original (Play.c:304)

  // Check all bounce walls (Play.c:305-310)
  let lineId: string | null = firstBounceId
  while (lineId !== null) {
    const line: LineRec | undefined = wallData.organizedWalls[lineId]
    if (!line) break

    // Calculate distance from ship to line using pt2line approximation
    // For simplicity, using distance to line midpoint
    const midX = (line.startx + line.endx) / 2
    const midY = (line.starty + line.endy) / 2

    let dx = globalx - midX
    let dy = globaly - midY

    // Handle world wrapping
    if (Math.abs(dx) > worldwidth / 2) {
      dx = dx > 0 ? dx - worldwidth : dx + worldwidth
    }

    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < minDistance) {
      minDistance = distance
      closestWall = line
    }

    lineId = line.nextId
  }

  if (!closestWall) return null

  // Calculate norm using simplified getstrafedir logic (Play.c:313)
  // The norm should point away from the wall toward unbouncex/unbouncey
  const norm = getStradeDir(closestWall, unbouncex, unbouncey)

  return { norm }
}

/**
 * Implementation of getstrafedir from Terrain.c:242-263
 * Returns a direction (0-15) that points away from the wall
 */
function getStradeDir(line: LineRec, targetX: number, targetY: number): number {
  // For vertical walls (type === LINE_N which is 1)
  if (line.type === 1) {
    // LINE_N = 1
    // Terrain.c:248-254
    if (targetX > line.startx) {
      return 4 // East direction (Terrain.c:250)
    } else if (line.kind === LINE_KIND.BOUNCE) {
      return 12 // West direction for bounce walls (Terrain.c:252)
    } else {
      return -1 // No strafe for non-bounce vertical walls (Terrain.c:254)
    }
  }

  // For diagonal walls, use slope to determine position relative to wall
  // Terrain.c:256-261

  // Slope tables for different line types (simplified)
  // In the original, slopes2[type] gives the slope * 2
  const slopes2: Record<number, number> = {
    2: 2, // LINE_NNE: slope = 1
    3: 1, // LINE_NE: slope = 0.5
    4: 0, // LINE_ENE: slope ≈ 0 (very shallow)
    5: 0 // LINE_E: horizontal
  }

  const m2 = line.up_down * (slopes2[line.type] ?? 1)

  // Calculate expected y position on the line at targetX
  const y0 = line.starty + ((m2 * (targetX - line.startx)) >> 1)

  // Determine if target is above or below the line
  const above = targetY < y0 ? 1 : 0

  // Calculate table index: 5 + (type * up_down)
  // This maps line type and direction to table column
  const tableIndex = 5 + line.type * line.up_down

  // Bounds check for table access
  if (tableIndex < 0 || tableIndex >= bounceDirTable[0]!.length) {
    // Fallback for out of bounds
    return above ? 0 : 8 // North or South
  }

  // Return direction from bounce table (Terrain.c:260-261)
  const direction = bounceDirTable[above]![tableIndex]!

  // -1 means no valid bounce direction for this configuration
  return direction >= 0 ? direction : 0
}
