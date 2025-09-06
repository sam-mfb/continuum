import { LINE_TYPE, LINE_KIND } from '@core/shared/types/line'
import type { LineRec } from '@core/shared/types/line'
import { bouncedirtable, stdirtable } from './constants'

/**
 * Calculate strafe sprite rotation based on wall angle and shot approach
 *
 * Based on getstrafedir() in orig/Sources/Terrain.c:242-262
 *
 * @param lp - The wall that was hit
 * @param x1 - X position of shot
 * @param y1 - Y position of shot
 * @returns Rotation index (0-15) for strafe sprite, or -1 for no strafe
 */
export function getstrafedir(lp: LineRec, x1: number, y1: number): number {
  // For vertical walls (LINE_N), check horizontal approach direction
  // (Terrain.c:248-254)
  if (lp.type === LINE_TYPE.N) {
    if (x1 > lp.startx) {
      return 4 // Approaching from right
    } else if (lp.kind === LINE_KIND.BOUNCE) {
      return 12 // Approaching from left (bounce walls only)
    } else {
      return -1 // No strafe for non-bounce walls from left
    }
  }

  // For non-vertical walls (diagonal and horizontal)
  // Calculate the y position on the wall at the shot's x position
  // (Terrain.c:256-259)

  // Slopes of lines * 2 (from Play.c:43)
  const slopes2 = [0, 0, 4, 2, 1, 0]
  const m2 = lp.up_down * slopes2[lp.type]!
  const y0 = lp.starty + ((m2 * (x1 - lp.startx)) >> 1)

  // Determine if shot is above the wall (Terrain.c:259)
  const above = y1 < y0 ? 1 : 0

  // Calculate table index (Terrain.c:261)
  // Original: [above][5 + line->type * line->up_down]
  const table_index = 5 + lp.type * lp.up_down

  // Ensure table_index is within bounds (0-10)
  if (table_index < 0 || table_index > 10) {
    return -1
  }

  // Select appropriate lookup table based on wall kind (Terrain.c:260-261)
  if (lp.kind === LINE_KIND.BOUNCE) {
    return bouncedirtable[above]![table_index]!
  } else {
    return stdirtable[above]![table_index]!
  }
}
