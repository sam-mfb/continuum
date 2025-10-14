/**
 * Main Game Loop
 *
 * This file orchestrates the game loop by coordinating state updates,
 * rendering, and sound playback through specialized submodules.
 */

import { createGameBitmap } from '@lib/bitmap'
import type { SpriteService } from '@core/sprites'
import type { GalaxyService } from '@core/galaxy'
import type {
  FizzTransitionService,
  FizzTransitionServiceFrame
} from '@core/transition'
import type { GameStore } from '../store'

import { updateGameState } from './stateUpdates'
import { renderGame } from './rendering'
import type { GameRenderLoop, NewGameRenderLoop } from '../types'
import { renderGameOriginal } from './renderingOriginal'
import type { Frame } from '@/lib/frame/types'
import { renderGameNew } from './renderingNew'

export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService
): GameRenderLoop => {
  // Create callbacks for the bitmap-based fizz service
  const transitionCallbacks = {
    isInitialized: () => fizzTransitionService.isInitialized,
    isComplete: () => fizzTransitionService.isComplete,
    reset: () => fizzTransitionService.reset()
  }

  return (frame, controls) => {
    // Create a fresh bitmap for this frame
    let bitmap = createGameBitmap()

    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      controls,
      galaxyService,
      transitionCallbacks
    })

    // Get current state after updates
    const state = store.getState()

    // This draws all visual elements based on the updated state
    // The new implementation only handles rendering. Collisions are
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
        fizzTransitionService
      })
    }

    // Return the final rendered bitmap
    return bitmap
  }
}

export const createGameRendererNew = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionServiceFrame: FizzTransitionServiceFrame
): NewGameRenderLoop => {
  // Create callbacks for the Frame-based fizz service
  const transitionCallbacks = {
    isInitialized: () => fizzTransitionServiceFrame.isInitialized,
    isComplete: () => fizzTransitionServiceFrame.isComplete,
    reset: () => fizzTransitionServiceFrame.reset()
  }

  return (frame, controls) => {
    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      controls,
      galaxyService,
      transitionCallbacks
    })

    // Create a fresh frame
    const startFrame: Frame = {
      width: 512,
      height: 342,
      drawables: []
    }

    // Get current state after updates
    const state = store.getState()

    const newFrame = renderGameNew({
      frame: startFrame,
      state,
      spriteService,
      fizzTransitionServiceFrame
    })

    return newFrame
  }
}
