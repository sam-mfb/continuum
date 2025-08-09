import { LINE_TYPE, LINE_KIND } from '@/shared/types/line'
import type { LineRec } from '@/shared/types/line'
import { bouncedirtable, stdirtable } from './constants'

/**
 * Calculate strafe sprite rotation based on wall angle and shot approach
 *
 * Based on getstrafedir() in orig/Sources/Terrain.c:242-262
 *
 * @param lp - The wall that was hit
 * @param h - Horizontal velocity of shot
 * @param v - Vertical velocity of shot
 * @returns Rotation index (0-15) for strafe sprite, or -1 for no strafe
 */
export function getstrafedir(lp: LineRec, h: number, v: number): number {
  let from_above: number
  let table_index: number

  // For vertical walls (LINE_N), check horizontal approach direction
  if (lp.type === LINE_TYPE.N) {
    if (h > 0) {
      return 4 // Approaching from right
    } else if (lp.kind === LINE_KIND.BOUNCE) {
      return 12 // Approaching from left (bounce walls only)
    } else {
      return -1 // No strafe for non-bounce walls from left
    }
  }

  // For diagonal walls, determine if shot approaches from above or below
  from_above = v > 0 ? 0 : 1

  // Calculate table index based on wall type and orientation
  // The original uses (5 - lp->type) * lp->up_down + 5
  // This maps wall angles to table indices 0-10
  table_index = (5 - lp.type) * lp.up_down + 5

  // Ensure table_index is within bounds (0-10)
  if (table_index < 0 || table_index > 10) {
    return -1
  }

  // Select appropriate lookup table based on wall kind
  if (lp.kind === LINE_KIND.BOUNCE) {
    return bouncedirtable[from_above]![table_index]!
  } else {
    return stdirtable[from_above]![table_index]!
  }
}
