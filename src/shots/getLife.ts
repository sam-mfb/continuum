import type { ShotRec } from './types'
import type { LineRec } from '@/shared/types/line'
import { LINE_TYPE, LINE_KIND } from '@/shared/types/line'
import { getstrafedir } from './getstrafedir'

/**
 * Slopes of lines * 2
 * From orig/Sources/Play.c:43
 * Indexed by LINE_TYPE (1-5): N, NNE, NE, ENE, E
 */
const slopes2 = [0, 0, 4, 2, 1, 0]

/**
 * Result of collision calculation
 */
export type GetLifeResult = {
  /** Frames until the shot hits a wall */
  framesToImpact: number
  /** Rotation for strafe effect (-1 if none) */
  strafedir: number
  /** Remaining lifetime after bounce (0 if not a bounce wall) */
  btime: number
  /** ID of the wall that will be hit */
  hitlineId: string
}

/**
 * Calculate when and how a shot will hit a wall
 *
 * Based on get_life() from orig/Sources/Terrain.c:142-230
 *
 * This function calculates:
 * - How many frames until the shot hits a wall
 * - Which wall will be hit first
 * - The strafe effect direction
 * - Whether it's a bounce (and remaining lifetime)
 *
 * @param shot - The shot to calculate trajectory for
 * @param walls - All walls to check for collision (already filtered to exclude ignored wall)
 * @param totallife - Total remaining lifetime of the shot (lifecount + btime)
 * @returns Collision calculation results
 */
export function getLife(
  shot: ShotRec,
  walls: LineRec[],
  totallife: number
): GetLifeResult {
  // Initialize with defaults
  let shortest = shot.lifecount // Assume it won't hit any
  const totallifetime = totallife
  let hitline: LineRec | null = null
  let strafedir = -1

  // Calculate shot position and endpoint
  const x = shot.x8 >> 3
  const y = shot.y8 >> 3
  let x2 = (shot.x8 + shot.h * shortest) >> 3
  let y2 = (shot.y8 + shot.v * shortest) >> 3

  // Check each wall for collision
  for (const line of walls) {
    // Early exit optimization - if shot can't reach this wall
    if (x < line.startx && x2 < line.startx) break

    // Skip ghost walls
    if (line.kind === LINE_KIND.GHOST) continue

    // Skip if shot won't reach wall's x range
    if (x >= line.endx && x2 >= line.endx) continue

    if (line.type === LINE_TYPE.N) {
      // Special case for vertical lines
      if (shot.h === 0) continue // Shot moving vertically, won't hit vertical wall

      const y0 = y + (shot.v * (line.startx - x)) / shot.h
      if (y0 >= line.starty && y0 <= line.starty + line.length) {
        const life = ((line.startx - x) << 3) / shot.h
        if (life > 0 && life < shortest) {
          shortest = life
          strafedir = getstrafedir(line, x, y)
          hitline = line
          x2 = (shot.x8 + shot.h * shortest) >> 3
          y2 = (shot.y8 + shot.v * shortest) >> 3
        }
      }
    } else {
      // Diagonal lines
      const m1 = line.up_down * slopes2[line.type]!

      // Check if shot trajectory crosses the line
      const startSide = (y - line.starty) * 2 - m1 * (x - line.startx)
      const endSide = (y2 - line.starty) * 2 - m1 * (x2 - line.startx)

      // If both points are on same side of line, no intersection
      if (startSide < 0 && endSide < 0) continue
      if (startSide > 0 && endSide > 0) continue

      if (shot.h === 0) {
        // Vertical shot trajectory
        if (x >= line.startx && x <= line.endx) {
          const y0 = line.starty + ((x - line.startx) * m1) / 2
          const life = ((y0 - y) << 3) / shot.v
          if (life > 0 && life < shortest) {
            shortest = life
            strafedir = getstrafedir(line, x, y)
            hitline = line
            x2 = (shot.x8 + shot.h * shortest) >> 3
            y2 = (shot.y8 + shot.v * shortest) >> 3
          }
        }
      } else {
        // General case - calculate intersection point
        const m2 = (shot.v << 8) / shot.h

        // Avoid division by zero
        if ((m1 << 7) === m2) continue

        // Calculate intersection x coordinate (in 8x fixed point)
        const numerator =
          ((shot.y8 - (line.starty << 3)) << 8) +
          ((m1 * line.startx) << 10) -
          m2 * shot.x8
        const denominator = (m1 << 7) - m2
        const x0 = numerator / denominator

        // Check if intersection is within line segment
        const x0_pixels = x0 / 8
        if (x0_pixels >= line.startx && x0_pixels <= line.endx) {
          const life = (x0 - shot.x8) / shot.h
          if (life > 0 && life < shortest) {
            shortest = life
            strafedir = getstrafedir(line, x, y)
            hitline = line
            x2 = (shot.x8 + shot.h * shortest) >> 3
            y2 = (shot.y8 + shot.v * shortest) >> 3
          }
        }
      }
    }
  }

  // Calculate btime for bounce walls
  let btime = 0
  if (hitline && hitline.kind === LINE_KIND.BOUNCE) {
    btime = totallifetime - shortest
  }

  return {
    framesToImpact: shortest,
    strafedir,
    btime,
    hitlineId: hitline?.id || ''
  }
}