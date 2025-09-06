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

// Rendering functions
export { drawExplosions } from './render/drawExplosions'
export { drawShard } from './render/drawShard'
export { drawSparkSafe } from './render/drawSparkSafe'
