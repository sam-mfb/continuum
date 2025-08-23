/**
 * @fileoverview Unified alignment calculation for Continuum's checkerboard background pattern
 * 
 * DEVIATION FROM ORIGINAL GAME:
 * 
 * In the original 68K Mac code, alignment calculations were scattered throughout the codebase
 * with the pattern `(x + y) & 1` appearing in dozens of places:
 * 
 * - Terrain.c:308 for fuel cells: `rot = (fp->x + fp->y) & 1`
 * - Terrain.c:522 for craters: `rot = (crat[c].x + crat[c].y) & 1`
 * - Bunkers.c:237 for bunkers: `align = (bp->x + bp->y + xcenter + ycenter) & 1`
 * - Terrain.c:469 for explosion shards: `(sp->x + sp->y) & 1`
 * - Junctions.c:596 for white hash merge: `(wh->x + wh->y) & 1`
 * 
 * The original also had a complex "background swapping" system in view_clear() (Play.c:1080-1089)
 * where background patterns were swapped based on screen position:
 * ```c
 * if ((screenx + screeny) & 1) {
 *     bgr1 = backgr2; bgr2 = backgr1;  // swap patterns
 * }
 * background[0] = bgr1; background[1] = bgr2;
 * ```
 * 
 * Wall rendering then used: `background[(x + y) & 1]` to select the pattern.
 * 
 * This module consolidates ALL these calculations into a single function with two modes:
 * 
 * 1. GLOBAL POSITION: For sprites/objects with world coordinates
 *    - Simple `(x + y) & 1` calculation
 *    - Used by: bunkers, fuel cells, craters, explosion shards, junction hashing
 * 
 * 2. SCREEN-RELATIVE POSITION: For wall rendering that needs viewport-aware alignment
 *    - Combines screen offset with object position: `(screenX + screenY + objectX + objectY) & 1`
 *    - screenX/screenY: The viewport's position in the world (e.g., camera position)
 *    - objectX/objectY: LOCAL coordinates within the wall being drawn (NOT world coordinates!)
 *      For example, when drawing a diagonal wall from (100,200) to (150,250) in world space,
 *      objectX/objectY would be the current pixel offset along that line (0,0) to (50,50),
 *      not the world coordinates. The original code used variables like `x` and `y` that
 *      were already screen-relative: `x = line.startx - scrx` and `y = line.starty - scry`
 *    - Mathematically equivalent to the original's swap + index approach
 *    - Eliminates the confusing "swap" logic by computing the final alignment directly
 * 
 * The result is always 0 or 1, selecting between two background patterns:
 * - Pattern 0: 0xAAAAAAAA (alternating 1010...)
 * - Pattern 1: 0x55555555 (alternating 0101...)
 * 
 * This creates the game's signature diagonal checkerboard pattern that remains
 * stable as the viewport moves through the world.
 */

export type Alignment = 0 | 1

// For simple world position alignment
type GlobalPosition = {
  x: number
  y: number
}

// For combined screen + object position alignment (used in wall rendering)
// objectX/objectY are the LOCAL coordinates within the wall segment being drawn,
// NOT world coordinates. For example, when drawing a diagonal wall line pixel by pixel,
// objectX and objectY represent the current pixel position along that line segment.
type ScreenRelativePosition = {
  screenX: number  // Viewport's X offset in world coordinates
  screenY: number  // Viewport's Y offset in world coordinates  
  objectX: number  // Local X coordinate within the object being drawn (e.g., pixel position in wall line)
  objectY: number  // Local Y coordinate within the object being drawn (e.g., pixel position in wall line)
}

/**
 * Calculate alignment based on position.
 * Creates a diagonal checkerboard pattern across the game world.
 *
 * @param pos Either a global position or screen-relative position
 * @returns 0 or 1 for selecting between two background patterns
 */
export function getAlignment(pos: GlobalPosition): Alignment
export function getAlignment(pos: ScreenRelativePosition): Alignment
export function getAlignment(
  pos: GlobalPosition | ScreenRelativePosition
): Alignment {
  if ('screenX' in pos) {
    // Combined alignment for screen-relative rendering
    // This combines screen alignment with object alignment in one calculation
    return ((pos.screenX + pos.screenY + pos.objectX + pos.objectY) &
      1) as Alignment
  } else {
    // Simple global position alignment
    return ((pos.x + pos.y) & 1) as Alignment
  }
}
