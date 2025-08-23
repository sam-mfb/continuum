export type Alignment = 0 | 1

// For simple world position alignment
type GlobalPosition = {
  x: number
  y: number
}

// For combined screen + object position alignment (used in wall rendering)
type ScreenRelativePosition = {
  screenX: number
  screenY: number
  objectX: number
  objectY: number
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
