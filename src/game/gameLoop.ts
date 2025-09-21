/**
 * Main Game Loop
 *
 * Full game implementation with level progression, lives management,
 * and game over/restart functionality. Based on shipMoveBitmap demo
 * but with complete game flow.
 *
 * This file orchestrates the game loop by coordinating state updates,
 * rendering, and sound playback through specialized submodules.
 */

import type { BitmapRenderer } from '@lib/bitmap'
import type { SpriteServiceV2 } from '@core/sprites'
import type { GalaxyHeader } from '@core/galaxy'

import { SCRWTH } from '@core/screen'
import { updateTransition } from '@core/transition'
import { store, type RootState } from './store'
import { getInitializationStatus } from './initialization'
import { updateGameState } from './gameLoop/stateUpdates'
import { renderGame } from './gameLoop/rendering'
import { playFrameSounds } from './gameLoop/soundManager'

/**
 * Main game renderer with level progression and game over handling
 *
 * This function coordinates the three main phases of game execution:
 * 1. State updates - game logic, physics, collision detection
 * 2. Rendering - drawing all visual elements to the bitmap
 * 3. Sound - playing accumulated sounds for the frame
 */
export const createGameRenderer =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Check initialization status
    const { complete, error } = getInitializationStatus()

    if (error) {
      console.error('Initialization failed:', error)
      bitmap.data.fill(0)
      return bitmap
    }

    if (!complete) {
      // Still loading
      bitmap.data.fill(0)
      return bitmap
    }

    // Phase 1: Update game state
    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      bitmap
    })

    // Get current state after updates
    const state = store.getState()

    // Phase 2: Render the game
    // This draws all visual elements based on the updated state
    // Calculate rendering context from current state
    const on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH

    bitmap = renderGame({
      bitmap,
      state,
      spriteService,
      globalx: state.ship.globalx,
      globaly: state.ship.globaly,
      on_right_side
    })

    // Phase 3: Handle transition effects
    // Apply any active transition effects (level complete fizz, etc.)
    const transitionFrame = store.dispatch(
      updateTransition(bitmap, {
        statusData: {
          fuel: state.ship.fuel,
          lives: state.ship.lives,
          score: state.status.score,
          bonus: state.status.planetbonus,
          level: state.status.currentlevel,
          message: state.status.curmessage,
          spriteService
        },
        store
      })
    )

    if (transitionFrame) {
      // Transition is active, use the transition frame
      bitmap = transitionFrame
    }

    // Phase 4: Play accumulated sounds
    // This plays all sounds that were triggered during this frame
    // Get fresh state in case transition modified it
    const finalState = store.getState()
    playFrameSounds({
      state: finalState,
      shipDeadCount: finalState.ship.deadCount,
      transitionActive: finalState.transition.active,
      preDelayFrames: finalState.transition.preDelayFrames
    })

    // Return the final rendered bitmap
    return bitmap
  }

/**
 * Export galaxy header for level jumping
 */
export const getGalaxyHeader = (): GalaxyHeader | null => {
  const state = store.getState() as RootState
  return state.game.galaxyHeader
}