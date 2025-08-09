import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { shipSlice } from '@/ship/shipSlice'
import { shotsSlice } from '@/shots/shotsSlice'
import { wallsSlice } from '@/walls/wallsSlice'
import { spritesSlice } from '@/store/spritesSlice'
import { configureStore, type Reducer } from '@reduxjs/toolkit'
import { containmentMiddleware } from './containmentMiddleware'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function buildGameStore(additionalReducers?: Record<string, Reducer>) {
  return configureStore({
    reducer: {
      ship: shipSlice.reducer,
      planet: planetSlice.reducer,
      screen: screenSlice.reducer,
      shots: shotsSlice.reducer,
      walls: wallsSlice.reducer,
      sprites: spritesSlice.reducer,
      ...additionalReducers
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(containmentMiddleware)
  })
}

type GameStore = ReturnType<typeof buildGameStore>
export type GameState = ReturnType<GameStore['getState']>
