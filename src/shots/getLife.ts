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
 * Calculate when and how a shot will hit a wall using ray-casting collision detection
 *
 * Based on get_life() from orig/Sources/Terrain.c:142-230
 *
 * This function performs line-line intersection tests between a shot's trajectory and all walls
 * to determine which wall (if any) the shot will hit first. It uses the shot's current position
 * (x8, y8) and velocity (h, v) to project a straight-line path, then checks each wall segment
 * for intersection with that path.
 *
 * ## Algorithm Overview:
 * 1. Projects shot endpoint based on current velocity and remaining lifetime
 * 2. Iterates through walls in ascending x-order (can early-exit when walls are too far right)
 * 3. For each wall, calculates if/when the shot's trajectory intersects it
 * 4. Tracks the nearest collision (smallest time to impact)
 * 5. Returns collision details including time, wall ID, and special effects
 *
 * ## Coordinate System:
 * - Uses 8x fixed-point coordinates for sub-pixel precision (x8, y8)
 * - Regular pixel coordinates are obtained by right-shifting by 3 (>> 3)
 * - Velocities (h, v) represent distance per logical frame in 8x fixed-point
 *
 * ## Wall Types Handled:
 * - **Vertical walls** (LINE_TYPE.N): Special case using simplified math
 * - **Diagonal walls**: Use slope-based intersection with slopes2 array [0,0,4,2,1,0]
 *   - Index 2 (NNE): slope = 4/2 = 2:1 ratio
 *   - Index 3 (NE): slope = 2/2 = 1:1 ratio (45°)
 *   - Index 4 (ENE): slope = 1/2 = 1:2 ratio
 *
 * ## Frame-Rate Independence:
 * The timeScale parameter allows the function to work at different framerates:
 * - Original game runs at 20 FPS (50ms per frame) with timeScale = 1.0
 * - For 60 FPS: use timeScale = 0.333 (16.67ms / 50ms)
 * - For 30 FPS: use timeScale = 0.667 (33.33ms / 50ms)
 *
 * The returned framesToImpact is in "logical frames" (20 FPS units), allowing the game
 * to maintain consistent physics regardless of rendering framerate.
 *
 * @param shot - The shot to trace. Must contain:
 *   - x8, y8: Current position in 8x fixed-point coordinates
 *   - h, v: Horizontal/vertical velocity in 8x fixed-point units per logical frame
 *   - lifecount: Current frames of life remaining
 *
 * @param walls - Array of wall segments to check for collision. Should be:
 *   - Sorted by ascending startx for optimal early-exit
 *   - Already filtered to exclude any walls to ignore (e.g., just bounced off)
 *   - Each wall must have: startx, starty, endx, endy, type, kind, up_down, id
 *
 * @param totallife - Total lifetime for this trajectory calculation (usually lifecount + btime).
 *   Used to calculate remaining bounce time if the hit wall is a bounce wall.
 *
 * @param timeScale - Ratio of actual frame time to original 50ms (default 1.0 for 20 FPS).
 *   Used to scale velocities for frame-rate independent physics.
 *
 * @returns Object containing:
 *   - framesToImpact: Logical frames (at 20 FPS) until collision (or totallife if no hit)
 *   - strafedir: Rotation value for strafe effect animation (-1 if no collision)
 *   - btime: Remaining lifetime after bounce (0 if not a bounce wall)
 *   - hitlineId: ID of the wall that will be hit (empty string if no collision)
 *
 * @example
 * ```typescript
 * // Shot moving right at 45° angle
 * const shot = {
 *   x8: 1000 << 3,  // x=1000 in 8x fixed-point
 *   y8: 500 << 3,   // y=500
 *   h: 16,          // Moving right at 2 pixels per frame (16/8)
 *   v: 16,          // Moving down at 2 pixels per frame
 *   lifecount: 35   // 35 frames remaining
 * }
 *
 * // Check collision with walls
 * const result = getLife(shot, walls, shot.lifecount, 1.0)
 *
 * if (result.hitlineId) {
 *   console.log(`Will hit wall ${result.hitlineId} in ${result.framesToImpact} frames`)
 *   if (result.btime > 0) {
 *     console.log(`It's a bounce wall, ${result.btime} frames remaining after bounce`)
 *   }
 * }
 * ```
 */
export function getLife(
  shot: ShotRec,
  walls: LineRec[],
  totallife: number,
  timeScale: number = 1.0
): GetLifeResult {
  // Initialize with defaults
  let shortest = shot.lifecount // Assume it won't hit any
  const totallifetime = totallife
  let hitline: LineRec | null = null
  let strafedir = -1

  // Calculate shot position and endpoint
  // Note: h and v are velocity per logical frame (50ms)
  // We scale them by timeScale to get distance for current framerate
  const x = shot.x8 >> 3
  const y = shot.y8 >> 3
  let x2 = (shot.x8 + shot.h * shortest * timeScale) >> 3
  let y2 = (shot.y8 + shot.v * shortest * timeScale) >> 3

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
        // Calculate frames to impact accounting for timeScale
        const spatialDistance = (line.startx - x) << 3
        const life = spatialDistance / (shot.h * timeScale)
        if (life > 0 && life < shortest) {
          shortest = life
          strafedir = getstrafedir(line, x, y)
          hitline = line
          x2 = (shot.x8 + shot.h * shortest * timeScale) >> 3
          y2 = (shot.y8 + shot.v * shortest * timeScale) >> 3
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
          // Calculate frames to impact accounting for timeScale
          const spatialDistance = (y0 - y) << 3
          const life = spatialDistance / (shot.v * timeScale)
          if (life > 0 && life < shortest) {
            shortest = life
            strafedir = getstrafedir(line, x, y)
            hitline = line
            x2 = (shot.x8 + shot.h * shortest * timeScale) >> 3
            y2 = (shot.y8 + shot.v * shortest * timeScale) >> 3
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
          // Calculate frames to impact accounting for timeScale
          const life = (x0 - shot.x8) / (shot.h * timeScale)
          if (life > 0 && life < shortest) {
            shortest = life
            strafedir = getstrafedir(line, x, y)
            hitline = line
            x2 = (shot.x8 + shot.h * shortest * timeScale) >> 3
            y2 = (shot.y8 + shot.v * shortest * timeScale) >> 3
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