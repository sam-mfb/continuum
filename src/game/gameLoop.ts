/**
 * Main Game Loop
 *
 * Full game implementation with level progression, lives management,
 * and game over/restart functionality.
 *
 * This file orchestrates the game loop by coordinating state updates,
 * rendering, and sound playback through specialized submodules.
 */

import type { BitmapRenderer, MonochromeBitmap } from '@lib/bitmap'
import type { SpriteService } from '@core/sprites'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { GameStore } from './store'
import type { UnknownAction } from '@reduxjs/toolkit'

import { updateTransition, starBackgroundWithShip } from '@core/transition'
import { sbarClear, updateSbar } from '@core/status/render'
import { transitionToNextLevel } from './levelManager'
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
export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService
): BitmapRenderer => {
  return (bitmap, frame, _env) => {
    // Check initialization status from Redux state
    const gameState = store.getState().game
    const { initializationStatus, initializationError } = gameState

    if (initializationStatus === 'error') {
      console.error('Initialization failed:', initializationError)
      bitmap.data.fill(0)
      return bitmap
    }

    if (initializationStatus !== 'complete') {
      // Still loading or not started
      bitmap.data.fill(0)
      return bitmap
    }

    // Phase 1: Update game state
    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      bitmap,
      galaxyService
    })

    // Get current state after updates
    const state = store.getState()

    // Phase 2: Render the game
    // This draws all visual elements based on the updated state
    bitmap = renderGame({
      bitmap,
      state,
      spriteService,
      store
    })

    // Phase 3: Handle transition effects
    // Apply any active transition effects (level complete fizz, etc.)

    // Create status bar adder function with current state
    const addStatusBar = (bmp: MonochromeBitmap): MonochromeBitmap => {
      const statusBarTemplate = spriteService.getStatusBarTemplate()
      let result = sbarClear({ statusBarTemplate })(bmp)
      result = updateSbar({
        fuel: state.ship.fuel,
        lives: state.ship.lives,
        score: state.status.score,
        bonus: state.status.planetbonus,
        level: state.status.currentlevel,
        message: state.status.curmessage,
        spriteService
      })(result)
      return result
    }

    // Create target bitmap creator function
    const createTargetBitmap = (shipState: {
      deadCount: number
      shiprot: number
      shipx: number
      shipy: number
    }): MonochromeBitmap => {
      const targetBitmap: MonochromeBitmap = {
        width: 512,
        height: 342,
        rowBytes: 64,
        data: new Uint8Array((512 * 342) / 8)
      }

      return starBackgroundWithShip({
        includeShip: shipState.deadCount === 0,
        shipState: {
          shiprot: shipState.shiprot,
          shipx: shipState.shipx,
          shipy: shipState.shipy
        },
        spriteService
      })(targetBitmap)
    }

    const transitionFrame = store.dispatch(
      updateTransition(bitmap, {
        addStatusBar,
        createTargetBitmap,
        store: store as unknown as Parameters<
          typeof updateTransition
        >[1]['store'],
        fizzTransitionService,
        onTransitionComplete: () => transitionToNextLevel(store, galaxyService)
      }) as unknown as UnknownAction
    ) as unknown as MonochromeBitmap | null

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
}
