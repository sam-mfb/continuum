/**
 * @fileoverview Port of pt2xy() from orig/Sources/Utils.c:84-93
 * Calculates the squared distance between a point and a specific x,y coordinate
 */

export interface Point {
  h: number // horizontal position (x)
  v: number // vertical position (y)
}

/**
 * Calculate squared distance from a point to an x,y coordinate
 * @see orig/Sources/Utils.c:84-93 pt2xy()
 *
 * @param thept The point to measure from
 * @param x The x coordinate to measure to
 * @param y The y coordinate to measure to
 * @returns The squared distance (not taking square root for performance)
 */
export function pt2xy(thept: Point, x: number, y: number): number {
  // Utils.c:90-91
  const dx = thept.h - x
  const dy = thept.v - y

  // Utils.c:92 - Return squared distance
  return dx * dx + dy * dy
}
