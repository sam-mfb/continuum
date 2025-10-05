/**
 * @fileoverview Find the closest bounce wall to the ship.
 * Corresponds to bounce_ship() at Play.c:302-313 and getstrafedir() at Terrain.c:242-263
 */

import type { LineRec } from '@core/walls'
import type { Point } from '@core/shared/pt2xy'
import { getstrafedir, LINE_KIND, pt2line } from '@core/shared'

export type WallData = {
  kindPointers: Record<number, string | null>
  organizedWalls: Record<string, LineRec>
}

/**
 * Find the closest bounce wall to the ship and return the norm direction.
 * Corresponds to bounce_ship() at Play.c:302-313 and getstrafedir() at Terrain.c:242-263
 */
export function findClosestBounceWall(
  globalx: number,
  globaly: number,
  unbouncex: number,
  unbouncey: number,
  wallData: WallData,
  _worldwidth: number
): { norm: number } | null {
  const firstBounceId = wallData.kindPointers[LINE_KIND.BOUNCE]
  if (!firstBounceId) return null

  let closestWall: LineRec | null = null
  let minDistance = 1000 // Start with large squared distance like original (Play.c:304)

  // Create Point object for ship position (Play.c:302-303)
  const shipPoint: Point = { h: globalx, v: globaly }

  // Check all bounce walls (Play.c:305-310)
  let lineId: string | null = firstBounceId
  while (lineId !== null) {
    const line: LineRec | undefined = wallData.organizedWalls[lineId]
    if (!line) break

    // Calculate actual distance from ship to line segment using pt2line
    // This matches the original pt2line() call at Play.c:306
    const distance = pt2line(shipPoint, line)

    // Compare squared distances (pt2line returns squared distance)
    if (distance < minDistance) {
      minDistance = distance
      closestWall = line
    }

    lineId = line.nextId
  }

  if (!closestWall) return null

  // Calculate norm using getstrafedir (Play.c:313)
  // The norm should point away from the wall toward unbouncex/unbouncey
  const norm = getstrafedir(closestWall, unbouncex, unbouncey)

  return { norm }
}
