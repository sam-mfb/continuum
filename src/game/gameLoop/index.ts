/**
 * Main Game Loop
 *
 * This file orchestrates the game loop by coordinating state updates,
 * rendering, and sound playback through specialized submodules.
 */

import { createGameBitmap } from '@lib/bitmap'
import type { SpriteService } from '@core/sprites'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { GameStore } from '../store'

import { updateGameState } from './stateUpdates'
import { renderGame } from './rendering'
import type { GameRenderLoop } from '../types'
import { renderGameOriginal } from './renderingOriginal'

export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService
): GameRenderLoop => {
  return (frame, controls) => {
    // Create a fresh bitmap for this frame
    let bitmap = createGameBitmap()

    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      controls,
      bitmap,
      galaxyService,
      fizzTransitionService
    })

    // Get current state after updates
    const state = store.getState()

    // This draws all visual elements based on the updated state
    // The new implementation only handles rendering and collisiosn are
    // handled via a collision map service in state. The original game
    // handled collisions via the render system and that is preserved
    // here for authenticity
    if (state.app.collisionMode === 'original') {
      bitmap = renderGameOriginal({
        bitmap,
        state,
        spriteService,
        store,
        fizzTransitionService
      })
    } else {
      bitmap = renderGame({
        bitmap,
        state,
        spriteService,
        store,
        fizzTransitionService
      })
    }

    // Return the final rendered bitmap
    return bitmap
  }
}
