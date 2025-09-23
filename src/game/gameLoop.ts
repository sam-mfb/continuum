/**
 * Main Game Loop
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
import { playSounds } from '@core/sound'

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

    // This handles all game logic, physics, and state changes
    // except for ship collisions which use rendering to detect
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

    // This draws all visual elements based on the updated state
    // It also handles ship collisions so it does modify state
    bitmap = renderGame({
      bitmap,
      state,
      spriteService,
      store,
      fizzTransitionService
    })

    // Get fresh state because currently render does cause some state modifications
    const finalState = store.getState()

    // This plays all sounds that were triggered during this frame
    playSounds(
      finalState.sound,
      soundService,
      {
        fizzActive: finalState.transition.status === 'fizz',
        shipDeadCount: finalState.ship.deadCount
      }
    )

    // Return the final rendered bitmap
    return bitmap
  }
}
