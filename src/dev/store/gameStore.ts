import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { wallsSlice } from '@core/walls'
import { spritesSlice } from './spritesSlice'
import { statusSlice } from '@core/status'
import { configureStore, type Reducer } from '@reduxjs/toolkit'
import { explosionsSlice } from '@core/explosions'
import { controlsSlice, loadControlBindings } from '@core/controls'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function buildGameStore<
  T extends Record<string, Reducer> = Record<string, never>
>(additionalReducers?: T) {
  // Load persisted control bindings
  const persistedControls = loadControlBindings()

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
      controls: controlsSlice.reducer,
      ...additionalReducers
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware(),
    preloadedState: {
      controls: {
        bindings: persistedControls
      }
    }
  })
}

type GameStore = ReturnType<typeof buildGameStore>
export type GameState = ReturnType<GameStore['getState']>
