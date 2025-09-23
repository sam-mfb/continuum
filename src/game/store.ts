/**
 * @fileoverview Central Redux store configuration for the game
 */

import { configureStore } from '@reduxjs/toolkit'
import type { GalaxyService } from '@core/galaxy'
import type { SpriteService } from '@core/sprites'
import type { FizzTransitionService } from '@core/transition'
import type { SoundService } from '@core/sound'

// Import all reducers
import { gameSlice } from './gameSlice'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { statusSlice } from '@core/status'
import { explosionsSlice } from '@core/explosions'
import { soundSlice } from '@core/sound'
import { wallsSlice } from '@core/walls'
import { highscoreSlice } from '@/core/highscore'
import { transitionSlice } from '@core/transition'
import { highscoreMiddleware, loadHighScores } from '@/core/highscore'

// Define the services that will be injected
export type GameServices = {
  galaxyService: GalaxyService
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
  soundService: SoundService
}

// Initial settings for the game
export type GameInitialSettings = {
  soundVolume: number
  soundEnabled: boolean
  initialLives: number
}

// Create store factory function
export const createGameStore = (
  services: GameServices,
  initialSettings: GameInitialSettings
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  // Load persisted high scores
  const persistedHighScores = loadHighScores()

  // Build preloaded state with initial settings
  const preloadedState = {
    highscore: persistedHighScores,
    sound: {
      ...soundSlice.getInitialState(),
      volume: initialSettings.soundVolume,
      enabled: initialSettings.soundEnabled
    },
    ship: {
      ...shipSlice.getInitialState(),
      lives: initialSettings.initialLives
    }
  }

  return configureStore({
    reducer: {
      game: gameSlice.reducer,
      ship: shipSlice.reducer,
      shots: shotsSlice.reducer,
      planet: planetSlice.reducer,
      screen: screenSlice.reducer,
      status: statusSlice.reducer,
      explosions: explosionsSlice.reducer,
      sound: soundSlice.reducer,
      walls: wallsSlice.reducer,
      highscore: highscoreSlice.reducer,
      transition: transitionSlice.reducer
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services
        }
      }).concat(highscoreMiddleware),
    preloadedState
  })
}

// Define the actual state shape
export type GameStore = ReturnType<typeof createGameStore>
export type RootState = ReturnType<GameStore['getState']>

// Export types
export type AppDispatch = GameStore['dispatch']
