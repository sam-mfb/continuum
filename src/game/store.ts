/**
 * @fileoverview Central Redux store configuration for the game
 */

import { configureStore } from '@reduxjs/toolkit'

// Import all reducers
import gameReducer from './gameSlice'
import { shipSlice } from '@core/ship/shipSlice'
import { shotsSlice } from '@core/shots/shotsSlice'
import { planetSlice } from '@core/planet/planetSlice'
import { screenSlice } from '@core/screen/screenSlice'
import { statusSlice } from '@core/status/statusSlice'
import { explosionsSlice } from '@core/explosions/explosionsSlice'
import soundReducer from '@core/sound/soundSlice'
import { wallsSlice } from '@core/walls/wallsSlice'
import { highscoreSlice } from '@/core/highscore/highscoreSlice'
import { highscoreMiddleware, loadHighScores } from '@/core/highscore/highscoreMiddleware'

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
    highscore: highscoreSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(highscoreMiddleware),
  preloadedState: {
    highscore: persistedHighScores
  }
})

// Export types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
