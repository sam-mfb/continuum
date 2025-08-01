/**
 * Mimics the Mac Toolbox PtToAngle function
 *
 * PtToAngle measures the angle from the center of a rectangle to a point.
 *
 * The Mac PtToAngle function returns angles where:
 * - Y increases downward (screen coordinates)
 * - 0° = North (up)
 * - 90° = East (right)
 * - 180° = South (down)
 * - 270° = West (left)
 * - Angles are measured clockwise from North
 *
 * @param centerX - X coordinate of the center point
 * @param centerY - Y coordinate of the center point
 * @param pointX - X coordinate of the target point
 * @param pointY - Y coordinate of the target point
 * @returns Angle in degrees (0-359), measured clockwise from North
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

  // The Mac PtToAngle appears to be rotated 90° CW from Math.atan2
  // Math.atan2: 0° = East, 90° = South (Y down)
  // Mac PtToAngle: 0° = North, 90° = East
  // So we need to add 90° to convert
  angle = (angle + 90) % 360

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
