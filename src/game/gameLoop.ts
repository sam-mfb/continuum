/**
 * Main Game Loop
 *
 * Full game implementation with level progression, lives management,
 * and game over/restart functionality.
 *
 * This file orchestrates the game loop by coordinating state updates,
 * rendering, and sound playback through specialized submodules.
 */

import type { BitmapRenderer } from '@lib/bitmap'
import { createGameBitmap } from '@lib/bitmap'
import type { SpriteService } from '@core/sprites'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { SoundService } from '@core/sound'
import type { GameStore } from './store'

import { updateGameState } from './gameLoop/stateUpdates'
import { renderGame } from './gameLoop/rendering'
import { playFrameSounds } from './gameLoop/soundManager'

/**
 * Main game renderer with level progression and game over handling
 *
 * This function coordinates the three main phases of game execution:
 * 1. State updates - game logic, physics, collision detection, transitions
 * 2. Rendering - drawing all visual elements including transition effects
 * 3. Sound - playing accumulated sounds for the frame
 */
export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService,
  soundService: SoundService
): BitmapRenderer => {
  return (frame, keys) => {
    // Create a fresh bitmap for this frame
    let bitmap = createGameBitmap()

    // Phase 1: Update game state
    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      keys,
      bitmap,
      galaxyService,
      fizzTransitionService,
      soundService
    })

    // Get current state after updates
    const state = store.getState()

    // Phase 2: Render the game (includes transition effects)
    // This draws all visual elements based on the updated state
    bitmap = renderGame({
      bitmap,
      state,
      spriteService,
      store,
      fizzTransitionService
    })

    // Phase 3: Play accumulated sounds
    // This plays all sounds that were triggered during this frame
    // Get fresh state in case transition modified it
    const finalState = store.getState()
    playFrameSounds(
      {
        state: finalState,
        shipDeadCount: finalState.ship.deadCount,
        transitionActive: finalState.transition.active,
        preDelayFrames: finalState.transition.preDelayFrames
      },
      soundService
    )

    // Return the final rendered bitmap
    return bitmap
  }
}
