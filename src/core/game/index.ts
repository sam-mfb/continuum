/**
 * @fileoverview Core game module
 *
 * This module contains the core game state management and update logic
 * that is independent of the application UI layer.
 */

// Game state slice
export { gameSlice } from './gameSlice'
export type { GameState } from './gameSlice'
export {
  markLevelComplete,
  clearLevelComplete,
  triggerGameOver,
  resetGame,
  pause,
  unpause,
  togglePause,
  showMap,
  hideMap,
  markCheatUsed,
  resetCheatUsed,
  killShipNextFrame,
  resetKillShipNextFrame
} from './gameSlice'

// State update types and functions
export type {
  TransitionCallbacks,
  StateUpdateCallbacks,
  StateUpdateContext
} from './stateUpdates'
export { updateGameState } from './stateUpdates'

// Collision handling
export { checkCollisions } from './checkCollisionsThunk'
export { createCollisionMap } from './createCollisionMapThunk'

// Level loading
export { loadLevel } from './levelThunks'

// Ship death
export { triggerShipDeath } from './shipDeath'

// Core types
export type { GameRootState, GameLogicServices } from './types'
