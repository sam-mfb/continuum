/**
 * @fileoverview Explosions module - Explosion effects and animations
 */

// Types and constants
export * from './types'
export * from './constants'

// State management and actions
export {
  explosionsSlice,
  startShipDeathWithRandom,
  startExplosionWithRandom,
  startBlowupWithRandom,
  updateExplosions,
  decrementShipDeathFlash,
  resetSparksAlive,
  clearShards,
  clearExplosions
} from './explosionsSlice'
