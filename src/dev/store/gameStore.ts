import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { wallsSlice } from '@core/walls'
import { spritesSlice } from './spritesSlice'
import { statusSlice } from '@core/status'
import { configureStore, type Reducer } from '@reduxjs/toolkit'
import { explosionsSlice } from '@core/explosions'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function buildGameStore<
  T extends Record<string, Reducer> = Record<string, never>
>(additionalReducers?: T) {
  return configureStore({
    reducer: {
      ship: shipSlice.reducer,
      planet: planetSlice.reducer,
      screen: screenSlice.reducer,
      shots: shotsSlice.reducer,
      walls: wallsSlice.reducer,
      sprites: spritesSlice.reducer,
      status: statusSlice.reducer,
      explosions: explosionsSlice.reducer,
      ...additionalReducers
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware()
  })
}

type GameStore = ReturnType<typeof buildGameStore>
export type GameState = ReturnType<GameStore['getState']>
