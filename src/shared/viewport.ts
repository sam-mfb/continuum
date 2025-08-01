/**
 * Viewport utility functions
 */

/**
 * Determines if the viewport is near the right edge of a wrapping world.
 * When true, objects need to be rendered twice - once at normal position
 * and once at wrapped position (offset by -worldwidth).
 * 
 * Based on original Continuum logic in Bunkers.c
 * 
 * @param viewportX - Current viewport X position
 * @param viewportWidth - Width of the viewport (typically bitmap width)
 * @param worldWidth - Total width of the world
 * @param worldWrap - Whether the world wraps horizontally
 * @returns true if viewport is near right edge and world wraps
 */
export const isOnRightSide = (
  viewportX: number,
  viewportWidth: number,
  worldWidth: number,
  worldWrap: boolean
): boolean => {
  // Only applies to wrapping worlds
  if (!worldWrap) return false
  
  // Check if viewport extends near the right edge
  // 48 pixel margin matches original code's bunker sprite allowance
  return viewportX + viewportWidth > worldWidth - 48
}
