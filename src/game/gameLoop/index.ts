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
import type { SoundService } from '@core/sound'
import type { GameStore } from '../store'

import { updateGameState } from './stateUpdates'
import { renderGame } from './rendering'
import type { GameRenderLoop } from '../types'

export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService,
  soundService: SoundService
): GameRenderLoop => {
  return (frame, controls) => {
    // Create a fresh bitmap for this frame
    let bitmap = createGameBitmap()

    // This handles all game logic, physics, and state changes
    // except for ship collisions which use rendering to detect
    updateGameState({
      store,
      frame,
      controls,
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

    // Return the final rendered bitmap
    return bitmap
  }
}
