import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { shipSlice } from '@/ship/shipSlice'
import { shotsSlice } from '@/shots/shotsSlice'
import { wallsSlice } from '@/walls/wallsSlice'
import { configureStore } from '@reduxjs/toolkit'
import { containmentMiddleware } from './containmentMiddleware'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function buildGameStore() {
  return configureStore({
    reducer: {
      ship: shipSlice.reducer,
      planet: planetSlice.reducer,
      screen: screenSlice.reducer,
      shots: shotsSlice.reducer,
      walls: wallsSlice.reducer
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(containmentMiddleware)
  })
}

type GameStore = ReturnType<typeof buildGameStore>
export type GameState = ReturnType<GameStore['getState']>
