/**
 * @fileoverview Central Redux store configuration for the game
 */

import { configureStore } from '@reduxjs/toolkit'

// Import all reducers
import gameReducer from './gameSlice'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { statusSlice } from '@core/status'
import { explosionsSlice } from '@core/explosions'
import { soundReducer } from '@core/sound'
import { wallsSlice } from '@core/walls'
import { highscoreSlice } from '@/core/highscore'
import { transitionSlice } from '@core/transition'
import { highscoreMiddleware, loadHighScores } from '@/core/highscore'

// Load persisted high scores
const persistedHighScores = loadHighScores()

// Create and export the store
export const store = configureStore({
  reducer: {
    game: gameReducer,
    ship: shipSlice.reducer,
    shots: shotsSlice.reducer,
    planet: planetSlice.reducer,
    screen: screenSlice.reducer,
    status: statusSlice.reducer,
    explosions: explosionsSlice.reducer,
    sound: soundReducer,
    walls: wallsSlice.reducer,
    highscore: highscoreSlice.reducer,
    transition: transitionSlice.reducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(highscoreMiddleware),
  preloadedState: {
    highscore: persistedHighScores
  }
})

// Export types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
