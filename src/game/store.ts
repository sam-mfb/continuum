/**
 * @fileoverview Central Redux store configuration for the game
 */

import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from 'redux'

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
import { spritesSlice } from '@dev/store/spritesSlice'

// Combine all reducers
const rootReducer = combineReducers({
  game: gameReducer,
  ship: shipSlice.reducer,
  shots: shotsSlice.reducer,
  planet: planetSlice.reducer,
  screen: screenSlice.reducer,
  status: statusSlice.reducer,
  explosions: explosionsSlice.reducer,
  sound: soundReducer,
  walls: wallsSlice.reducer,
  sprites: spritesSlice.reducer
})

// Create and export the store
export const store = configureStore({
  reducer: rootReducer
})

// Export types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
