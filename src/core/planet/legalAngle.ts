/**
 * Check if a point is within the field of view of a directional bunker
 * Based on orig/Sources/Play.c:898-924
 *
 * Bunkers can only be destroyed from their "front" 180 degree arc
 *
 * @param baserot - Bunker rotation (0-15, where 0 is north)
 * @param basex - Bunker x position
 * @param basey - Bunker y position
 * @param queryx - Query point x (e.g. ship position)
 * @param queryy - Query point y
 * @returns True if query point is in bunker's field of view
 */
export function legalAngle(
  baserot: number,
  basex: number,
  basey: number,
  queryx: number,
  queryy: number
): boolean {
  // Calculate angle from bunker to query point
  const dx = queryx - basex
  const dy = queryy - basey

  // Convert to angle in degrees (0 = north, clockwise)
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI)
  if (angle < 0) angle += 360

  // Bunker rotation to degrees (16 directions = 22.5 degrees each)
  // From Play.c:896 - angles360 array
  const angles360 = [
    0, 22, 45, 67, 90, 112, 135, 157, 180, 202, 225, 247, 270, 292, 315, 337
  ]

  // Get the bunker's facing angle
  // The (baserot + 12) & 15 rotates by 270 degrees to get the "back" of the bunker
  // Then we check if the target is within 180 degrees of that
  const lowangle = angles360[(baserot + 12) & 15]!

  // Normalize angle relative to lowangle
  if (angle < lowangle) {
    angle += 360
  }

  // Check if within 180 degree arc
  return angle < lowangle + 180
}
