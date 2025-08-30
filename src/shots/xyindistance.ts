/**
 * Check if a point is within a circular distance
 * Based on orig/Sources/Play.c:1216-1233
 * 
 * Checks if x² + y² <= dist²
 * 
 * @param x - X distance from center
 * @param y - Y distance from center
 * @param dist - Maximum distance (radius)
 * @returns True if point is within distance, false otherwise
 */
export function xyindistance(x: number, y: number, dist: number): boolean {
  // Calculate squared distances to avoid square root
  const distSquared = dist * dist
  const pointDistSquared = x * x + y * y
  
  return pointDistSquared <= distSquared
}