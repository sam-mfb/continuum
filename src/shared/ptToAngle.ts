/**
 * Mimics the Mac Toolbox PtToAngle function
 *
 * PtToAngle measures the angle from the center of a rectangle to a point,
 * with angles measured clockwise from East (right) in the Mac coordinate system.
 *
 * In Mac coordinates:
 * - Y increases downward
 * - 0° = East (right)
 * - 90° = South (down)
 * - 180° = West (left)
 * - 270° = North (up)
 *
 * @param centerX - X coordinate of the center point
 * @param centerY - Y coordinate of the center point
 * @param pointX - X coordinate of the target point
 * @param pointY - Y coordinate of the target point
 * @returns Angle in degrees (0-359), measured clockwise from East
 */
export function ptToAngle(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number
): number {
  const deltaX = pointX - centerX
  const deltaY = pointY - centerY

  // Math.atan2(y, x) gives counter-clockwise angle from positive X axis
  // In screen coordinates (Y down), this gives us clockwise from East
  let angle = Math.atan2(deltaY, deltaX)

  // Convert from radians to degrees
  angle = (angle * 180) / Math.PI

  // Convert to 0-359 range (Math.atan2 returns -180 to 180)
  if (angle < 0) angle += 360

  return Math.floor(angle)
}

/**
 * Convenience function that takes a rectangle (like the original Mac function)
 * Uses the center of the rectangle as the reference point
 */
export function ptToAngleRect(
  rect: { left: number; top: number; right: number; bottom: number },
  point: { h: number; v: number }
): number {
  const centerX = (rect.left + rect.right) / 2
  const centerY = (rect.top + rect.bottom) / 2
  return ptToAngle(centerX, centerY, point.h, point.v)
}
