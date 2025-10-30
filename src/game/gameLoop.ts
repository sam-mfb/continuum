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
import type { GameStore } from './store'
import type { RandomService } from '@/core/shared'

import { updateGameState, type GameRootState } from '@core/game'
import { renderGame } from './rendering'
import type { GameRenderLoop, NewGameRenderLoop } from './types'
import { renderGameOriginal } from './renderingOriginal'
import type { Frame } from '@/lib/frame/types'
import { renderGameNew } from './renderingNew'
import { setMode, setMostRecentScore, setLastRecordingId } from './appSlice'
import { TOTAL_INITIAL_LIVES } from './constants'
import { getStoreServices } from './store'
import { createRecordingStorage } from '@core/recording'

export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService,
  randomService: RandomService
): GameRenderLoop => {
  // Create callbacks for the bitmap-based fizz service
  const transitionCallbacks = {
    isInitialized: (): boolean => fizzTransitionService.isInitialized,
    isComplete: (): boolean => fizzTransitionService.isComplete,
    reset: (): void => fizzTransitionService.reset()
  }

  // Create state update callbacks
  const stateUpdateCallbacks = {
    onGameOver: async (finalState: GameRootState): Promise<void> => {
      const { score, currentlevel: level } = finalState.status
      const { fuel } = finalState.ship
      const { cheatUsed } = finalState.game

      // Stop recording if active and save to storage
      const recordingService = getStoreServices().recordingService
      if (recordingService.isRecording()) {
        const recording = recordingService.stopRecording(finalState)
        if (recording) {
          const storage = createRecordingStorage()
          const recordingId = await storage.save(recording)
          store.dispatch(setLastRecordingId(recordingId))
          console.log('Recording saved with ID:', recordingId)
        }
      } else {
        // Clear last recording ID if no recording was active
        store.dispatch(setLastRecordingId(null))
      }

      // Determine high score eligibility
      const highScoreEligible = !cheatUsed

      // Always record the most recent score
      store.dispatch(
        setMostRecentScore({
          score,
          planet: level,
          fuel,
          highScoreEligible
        })
      )

      // Determine which mode to go to based on high score eligibility
      if (highScoreEligible) {
        const state = store.getState()
        const currentGalaxyId = state.app.currentGalaxyId
        const allHighScores = state.highscore
        const highScores = allHighScores[currentGalaxyId]
        const lowestScore = highScores
          ? Math.min(...Object.values(highScores).map(hs => hs?.score || 0))
          : 0

        if (score > lowestScore) {
          // Score qualifies for high score entry
          store.dispatch(setMode('highScoreEntry'))
        } else {
          // Go directly to game over
          store.dispatch(setMode('gameOver'))
        }
      } else {
        // Cheat was used - go directly to game over
        store.dispatch(setMode('gameOver'))
      }
    },
    getGalaxyId: (): string => store.getState().app.currentGalaxyId,
    getInitialLives: (): number => TOTAL_INITIAL_LIVES,
    getCollisionMode: (): 'original' | 'modern' =>
      store.getState().app.collisionMode
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
      transitionCallbacks,
      randomService,
      stateUpdateCallbacks
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
        fizzTransitionService,
        randomService
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
  fizzTransitionServiceFrame: FizzTransitionServiceFrame,
  randomService: RandomService
): NewGameRenderLoop => {
  // Create callbacks for the Frame-based fizz service
  const transitionCallbacks = {
    isInitialized: (): boolean => fizzTransitionServiceFrame.isInitialized,
    isComplete: (): boolean => fizzTransitionServiceFrame.isComplete,
    reset: (): void => fizzTransitionServiceFrame.reset()
  }

  // Create state update callbacks
  const stateUpdateCallbacks = {
    onGameOver: async (finalState: GameRootState): Promise<void> => {
      const { score, currentlevel: level } = finalState.status
      const { fuel } = finalState.ship
      const { cheatUsed } = finalState.game

      // Stop recording if active and save to storage
      const recordingService = getStoreServices().recordingService
      if (recordingService.isRecording()) {
        const recording = recordingService.stopRecording(finalState)
        if (recording) {
          const storage = createRecordingStorage()
          const recordingId = await storage.save(recording)
          store.dispatch(setLastRecordingId(recordingId))
          console.log('Recording saved with ID:', recordingId)
        }
      } else {
        // Clear last recording ID if no recording was active
        store.dispatch(setLastRecordingId(null))
      }

      // Determine high score eligibility
      const highScoreEligible = !cheatUsed

      // Always record the most recent score
      store.dispatch(
        setMostRecentScore({
          score,
          planet: level,
          fuel,
          highScoreEligible
        })
      )

      // Determine which mode to go to based on high score eligibility
      if (highScoreEligible) {
        const state = store.getState()
        const currentGalaxyId = state.app.currentGalaxyId
        const allHighScores = state.highscore
        const highScores = allHighScores[currentGalaxyId]
        const lowestScore = highScores
          ? Math.min(...Object.values(highScores).map(hs => hs?.score || 0))
          : 0

        if (score > lowestScore) {
          // Score qualifies for high score entry
          store.dispatch(setMode('highScoreEntry'))
        } else {
          // Go directly to game over
          store.dispatch(setMode('gameOver'))
        }
      } else {
        // Cheat was used - go directly to game over
        store.dispatch(setMode('gameOver'))
      }
    },
    getGalaxyId: (): string => store.getState().app.currentGalaxyId,
    getInitialLives: (): number => TOTAL_INITIAL_LIVES,
    getCollisionMode: (): 'original' | 'modern' =>
      store.getState().app.collisionMode
  }

  return (frame, controls) => {
    // This handles all game logic, physics, and state changes
    updateGameState({
      store,
      frame,
      controls,
      galaxyService,
      transitionCallbacks,
      randomService,
      stateUpdateCallbacks
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
