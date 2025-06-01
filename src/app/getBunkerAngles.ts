import type { BunkerAngles } from './drawTypes'
import { BunkerKind } from './drawTypes'

/**
 * Calculate the start and end angles for bunker firing arcs
 * Based on the bunker's range settings, kind, and rotation
 */
export const getBunkerAngles = (
  low: number,
  high: number,
  kind: number,
  rot: number
): BunkerAngles => {
  // Default implementation - this would need to be adjusted based on
  // the original game's bunker angle calculation logic
  
  // For now, using the raw low/high values as degrees
  // The original game likely has more complex logic based on bunker type and rotation
  let start = low
  let end = high
  
  // Adjust for bunker rotation if needed
  if (kind !== BunkerKind.GENERATOR) {
    // Generators don't have firing arcs
    start = (start + rot * 90) % 360
    end = (end + rot * 90) % 360
  }
  
  return { start, end }
}