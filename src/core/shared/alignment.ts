/**
 * @fileoverview Unified alignment calculation for Continuum's checkerboard background pattern
 *
 * RECENT CHANGES (Phase B of Alignment Signature Update):
 *
 * The GlobalPosition type now requires screenX and screenY coordinates in addition to world
 * coordinates. This change prepares the infrastructure for future alignment mode switching
 * between world-fixed and screen-fixed background patterns.
 *
 * WHY THIS CHANGE:
 * - Currently, the background pattern is fixed to world coordinates: (x + y) & 1
 * - This creates a stable checkerboard that doesn't move as the viewport scrolls
 * - A future feature will allow switching to screen-fixed mode where the pattern stays
 *   fixed relative to the screen, creating a different visual effect
 * - By requiring screen coordinates now, all call sites are prepared for this switch
 *
 * WHAT CHANGED:
 * - GlobalPosition now requires screenX/screenY (viewport offset in world coordinates)
 * - The getAlignment function still returns (x + y) & 1 for GlobalPosition
 * - But it now has the screen data available for when mode switching is implemented
 * - All sprite rendering call sites (bunkers, fuels, craters, explosions) now pass screen coords
 *
 * JUNCTION DECORATIONS:
 * - Junction decorations (crosshatch patterns at wall intersections) are pre-computed
 * - Since they depend on alignment, we now store both versions (dataAlign0 and dataAlign1)
 * - At render time, fastWhites.ts calculates the current alignment and selects the right version
 * - This ensures junction decorations always match the current alignment mode
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

// For simple world position alignment - now requires screen coordinates for future mode switching
type GlobalPosition = {
  x: number // world x coordinate
  y: number // world y coordinate
  screenX: number // viewport x offset (required for future screen-fixed mode)
  screenY: number // viewport y offset (required for future screen-fixed mode)
}

// For combined screen + object position alignment (used in wall rendering)
// objectX/objectY are the LOCAL coordinates within the wall segment being drawn,
// NOT world coordinates. For example, when drawing a diagonal wall line pixel by pixel,
// objectX and objectY represent the current pixel position along that line segment.
type ScreenRelativePosition = {
  screenX: number // Viewport's X offset in world coordinates
  screenY: number // Viewport's Y offset in world coordinates
  objectX: number // Local X coordinate within the object being drawn (e.g., pixel position in wall line)
  objectY: number // Local Y coordinate within the object being drawn (e.g., pixel position in wall line)
}

export type AlignmentMode = 'world-fixed' | 'screen-fixed'

/**
 * Creates an alignment system with configurable background pattern mode.
 * Uses a closure to encapsulate the mode state while keeping the API clean.
 */
export function createAlignmentSystem(): {
  setMode: (newMode: AlignmentMode) => void
  getMode: () => AlignmentMode
  getAlignment: (pos: GlobalPosition | ScreenRelativePosition) => Alignment
} {
  let mode: AlignmentMode = 'world-fixed'

  return {
    /**
     * Set the alignment mode for sprite/object rendering.
     * - 'world-fixed': Background pattern is fixed to world coordinates (default)
     *   Objects maintain consistent alignment as viewport moves
     * - 'screen-fixed': Background pattern is fixed to screen
     *   Pattern appears stationary to the viewer as viewport moves
     *
     * @param newMode The alignment mode to use
     */
    setMode(newMode: AlignmentMode): void {
      mode = newMode
    },

    /**
     * Get the current alignment mode.
     * @returns The current alignment mode
     */
    getMode(): AlignmentMode {
      return mode
    },

    /**
     * Calculate alignment based on position and current mode.
     * Creates a diagonal checkerboard pattern across the game world.
     *
     * @param pos Either a global position or screen-relative position
     * @returns 0 or 1 for selecting between two background patterns
     */
    getAlignment(pos: GlobalPosition | ScreenRelativePosition): Alignment {
      if ('objectX' in pos) {
        // Screen-relative position (for walls)
        if (mode === 'screen-fixed') {
          // In screen-fixed mode, only use object position (screen-relative coordinates)
          // This keeps the pattern fixed to the screen
          return ((pos.objectX + pos.objectY) & 1) as Alignment
        } else {
          // In world-fixed mode, combine screen and object positions
          // This creates stable alignment in world space
          return ((pos.screenX + pos.screenY + pos.objectX + pos.objectY) &
            1) as Alignment
        }
      } else {
        // Global position - mode-dependent calculation
        if (mode === 'screen-fixed') {
          // Screen-fixed: pattern stays fixed relative to screen
          // Calculate based on sprite's screen position to match background
          // Screen position = world position - viewport position
          const screenPosX = pos.x - pos.screenX
          const screenPosY = pos.y - pos.screenY
          return ((screenPosX + screenPosY) & 1) as Alignment
        } else {
          // World-fixed: pattern stays fixed relative to world (default)
          // Use world coordinates, creating stable alignment for objects
          return ((pos.x + pos.y) & 1) as Alignment
        }
      }
    }
  }
}

// Create and export the alignment system
const alignmentSystem = createAlignmentSystem()

/**
 * Set the alignment mode for sprite/object rendering.
 * @param mode The alignment mode to use ('world-fixed' or 'screen-fixed')
 */
export const setAlignmentMode = alignmentSystem.setMode

/**
 * Get the current alignment mode.
 * @returns The current alignment mode
 */
export const getAlignmentMode = alignmentSystem.getMode

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
  return alignmentSystem.getAlignment(pos)
}
