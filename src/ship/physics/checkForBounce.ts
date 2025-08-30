/**
 * @fileoverview Corresponds to check_for_bounce() from orig/Sources/Play.c:268-287
 * and bounce_ship() from orig/Sources/Play.c:291-328
 */

import type { Store } from '@reduxjs/toolkit'
import type { MonochromeBitmap, LineRec } from '@/walls/types'
import type { ShipState } from '@/ship/types'
import { blackTerrain } from '@/walls/render/blackTerrain'
import { eraseFigure } from '@/ship/render/eraseFigure'
import { cloneBitmap } from '@/bitmap'
import { LINE_KIND } from '@/shared/types/line'

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
  
  // Step 1: Render bounce walls onto the screen
  // This corresponds to black_terrain(L_BOUNCE) at Play.c:272
  const screenWithBounceWalls = blackTerrain({
    thekind: LINE_KIND.BOUNCE,
    kindPointers: wallData.kindPointers,
    organizedWalls: wallData.organizedWalls,
    viewport,
    worldwidth
  })(screen)
  
  // Step 2: Create a test bitmap to check for collision
  // We'll erase the ship and see if any pixels change
  const testScreen = cloneBitmap(screenWithBounceWalls)
  const erasedScreen = eraseFigure({
    x: shipState.shipx,
    y: shipState.shipy,
    def: shipDef
  })(testScreen)
  
  // Step 3: Check if erasing the ship affected any pixels
  // If it did, that means the ship was overlapping bounce walls
  let collision = false
  for (let i = 0; i < erasedScreen.data.length; i++) {
    if (erasedScreen.data[i] !== screenWithBounceWalls.data[i]) {
      collision = true
      break
    }
  }
  
  // Step 4: Handle collision result
  if (collision) {
    // Find the closest bounce wall and calculate bounce physics
    // This is a simplified version - the full implementation would need
    // to find the actual wall and calculate proper normals
    const closestWall = findClosestBounceWall(
      shipState,
      wallData,
      viewport,
      worldwidth
    )
    
    if (closestWall) {
      // Calculate dot product of velocity with wall normal
      const dotProduct = shipState.dx * closestWall.normal.x + 
                        shipState.dy * closestWall.normal.y
      
      // Only bounce if moving toward the wall
      if (dotProduct < 0) {
        store.dispatch({
          type: 'ship/bounceShip',
          payload: {
            wallNormal: closestWall.normal,
            dotProduct
          }
        })
      }
    }
  } else {
    // No collision - update last safe position
    // Corresponds to Play.c:285-286
    store.dispatch({
      type: 'ship/noBounce'
    })
  }
  
  // Return the screen with bounce walls rendered
  return screenWithBounceWalls
}

/**
 * Find the closest bounce wall to the ship.
 * Simplified version of the logic from bounce_ship() at Play.c:305-318
 */
function findClosestBounceWall(
  shipState: ShipState,
  wallData: CheckForBounceData,
  viewport: { x: number; y: number; b: number; r: number },
  worldwidth: number
): { wall: LineRec; normal: { x: number; y: number } } | null {
  const firstBounceId = wallData.kindPointers[LINE_KIND.BOUNCE]
  if (!firstBounceId) return null
  
  let closestWall: LineRec | null = null
  let minDistance = Infinity
  
  // Check all bounce walls
  let lineId: string | null = firstBounceId
  while (lineId !== null) {
    const line: LineRec | undefined = wallData.organizedWalls[lineId]
    if (!line) break
    
    // Calculate distance from ship to line (simplified)
    const shipX = viewport.x + shipState.shipx
    const shipY = viewport.y + shipState.shipy
    
    // Simple distance to line midpoint (more complex calculation needed for accuracy)
    const midX = (line.startx + line.endx) / 2
    const midY = (line.starty + line.endy) / 2
    
    let dx = shipX - midX
    let dy = shipY - midY
    
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
  
  // Calculate wall normal (perpendicular to wall direction)
  // This is simplified - the actual implementation uses getstrafedir()
  const wallDx = closestWall.endx - closestWall.startx
  const wallDy = closestWall.endy - closestWall.starty
  const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy)
  
  // Normal points perpendicular to wall
  const normal = {
    x: -wallDy / wallLength,
    y: wallDx / wallLength
  }
  
  // Point normal toward last safe position
  const toSafeX = shipState.unbouncex - shipState.shipx
  const toSafeY = shipState.unbouncey - shipState.shipy
  
  if (normal.x * toSafeX + normal.y * toSafeY < 0) {
    normal.x = -normal.x
    normal.y = -normal.y
  }
  
  return { wall: closestWall, normal }
}