import { planetSlice } from '@core/planet/planetSlice'
import { screenSlice } from '@core/screen/screenSlice'
import { shipSlice } from '@core/ship/shipSlice'
import { shotsSlice } from '@core/shots/shotsSlice'
import { wallsSlice } from '@core/walls/wallsSlice'
import { spritesSlice } from './spritesSlice'
import { statusSlice } from '@core/status/statusSlice'
import { configureStore, type Reducer } from '@reduxjs/toolkit'
import { containmentMiddleware } from './containmentMiddleware'
import { explosionsSlice } from '@core/explosions/explosionsSlice'

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
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(containmentMiddleware)
  })
}

type GameStore = ReturnType<typeof buildGameStore>
export type GameState = ReturnType<GameStore['getState']>
