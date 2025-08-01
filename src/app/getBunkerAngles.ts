import type { BunkerAngles } from './drawTypes'

/**
 * Calculate the start and end angles for bunker firing arcs
 * Based on the bunker's range settings, kind, and rotation
 * 
 * The game uses a 0-511 angle system where:
 * - 0 = North (up)
 * - 128 = East (right) 
 * - 256 = South (down)
 * - 384 = West (left)
 * 
 * This needs to be converted to degrees for canvas drawing
 */
export const getBunkerAngles = (
  low: number,
  high: number,
  _kind: number,
  _rot: number
): BunkerAngles => {
  // Convert from game's 0-511 angle system to degrees (0-360)
  // In the game: 512 units = 360 degrees
  const start = (low * 360) / 512
  const end = (high * 360) / 512
  
  // The ranges are absolute world angles, NOT relative to bunker rotation
  // A bunker always shoots in the same world directions regardless of 
  // which way its sprite is facing
  
  return { start, end }
}
