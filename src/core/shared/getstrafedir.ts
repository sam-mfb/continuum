/**
 * @fileoverview Port of getstrafedir() from orig/Sources/Terrain.c:242-263
 * Calculate strafe sprite rotation based on wall angle and shot approach
 */

import { LINE_TYPE, LINE_KIND } from './types/line'
import type { LineRec } from './types/line'

/**
 * Bounce direction lookup table
 * From orig/Sources/Terrain.c:234-236
 * First index: 0 = from below, 1 = from above
 * Second index: calculated from wall type and direction
 * -1 means no strafe effect for that angle
 */
const bouncedirtable: number[][] = [
  [8, 7, 6, 5, -1, -1, -1, 11, 10, 9, 8], // From below
  [0, 15, 14, 13, -1, -1, -1, 3, 2, 1, 0] // From above
]

/**
 * Standard (non-bounce) direction lookup table
 * From orig/Sources/Terrain.c:237-239
 * Same indexing as bouncedirtable
 */
const stdirtable: number[][] = [
  [8, 7, 6, 5, -1, -1, -1, -1, -1, 9, 8], // From below
  [-1, -1, -1, -1, -1, -1, -1, 3, 2, 1, -1] // From above
]

/**
 * Calculate strafe sprite rotation based on wall angle and shot approach
 *
 * Based on getstrafedir() in orig/Sources/Terrain.c:242-262
 *
 * @param line - The wall that was hit
 * @param x1 - X position to check (shot or unbounce position)
 * @param y1 - Y position to check (shot or unbounce position)
 * @returns Rotation index (0-15) for strafe sprite, or -1 for no strafe
 */
export function getstrafedir(line: LineRec, x1: number, y1: number): number {
  // For vertical walls (LINE_N), check horizontal approach direction
  // (Terrain.c:248-254)
  if (line.type === LINE_TYPE.N) {
    if (x1 > line.startx) {
      return 4 // Approaching from right
    } else if (line.kind === LINE_KIND.BOUNCE) {
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
  const m2 = line.up_down * slopes2[line.type]!
  
  // Use integer division (right shift) to match original C code
  const y0 = line.starty + ((m2 * (x1 - line.startx)) >> 1)

  // Determine if shot is above the wall (Terrain.c:259)
  const above = y1 < y0 ? 1 : 0

  // Calculate table index (Terrain.c:261)
  // Original: [above][5 + line->type * line->up_down]
  const table_index = 5 + line.type * line.up_down

  // Ensure table_index is within bounds (0-10)
  if (table_index < 0 || table_index > 10) {
    return -1
  }

  // Select appropriate lookup table based on wall kind (Terrain.c:260-261)
  if (line.kind === LINE_KIND.BOUNCE) {
    return bouncedirtable[above]![table_index]!
  } else {
    return stdirtable[above]![table_index]!
  }
}