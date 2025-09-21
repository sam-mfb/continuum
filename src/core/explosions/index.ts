/**
 * @fileoverview Explosions module - Explosion effects and animations
 */

// Types and constants
export * from './types'
export * from './constants'

// State management and actions
export {
  explosionsSlice,
  startShipDeath,
  startExplosion,
  updateExplosions,
  clearShipDeathFlash,
  resetSparksAlive,
  clearShards
} from './explosionsSlice'
