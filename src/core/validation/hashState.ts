/**
 * @fileoverview State hashing utility for recording validation
 *
 * Provides a consistent hash function used by both recording and validation
 * to ensure deterministic replay validation.
 */

import type { GameRootState } from '@core/game'

/**
 * Hash the entire GameRootState for validation purposes
 *
 * This function is used by both:
 * - RecordingService: to capture state snapshots during recording
 * - RecordingValidator: to validate state snapshots during replay
 *
 * Having a single implementation ensures consistent hashing.
 *
 * @param state - The complete game state to hash
 * @returns Hexadecimal hash string
 */
export const hashState = (state: GameRootState): string => {
  // Extract only GameRootState slices to ensure consistent hashing
  // even if a supertype (like RootState with UI slices) is passed in
  const gameState = {
    game: state.game,
    planet: state.planet,
    ship: state.ship,
    screen: state.screen,
    status: state.status,
    shots: state.shots,
    explosions: state.explosions,
    walls: state.walls,
    transition: state.transition
  }

  const stateString = JSON.stringify(gameState)
  let hash = 0
  for (let i = 0; i < stateString.length; i++) {
    const char = stateString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}
