import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { gameSlice } from '@core/game'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { statusSlice } from '@core/status'
import { explosionsSlice } from '@core/explosions'
import { wallsSlice } from '@core/walls'
import { transitionSlice } from '@core/transition'
import { createSyncThunkMiddleware } from '@lib/redux'
import type { GameRootState } from '@core/game'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { RandomService } from '@/core/shared'
import type { RecordingService } from '@core/recording'
import type { CollisionService } from '@core/collision'
import type { SpriteService } from '@core/sprites'

// Minimal services needed for game logic only
type HeadlessServices = {
  galaxyService: GalaxyService
  fizzTransitionService: FizzTransitionService
  randomService: RandomService
  recordingService: RecordingService
  collisionService: CollisionService
  spriteService: SpriteService
}

const headlessReducer = combineSlices(
  gameSlice,
  shipSlice,
  shotsSlice,
  planetSlice,
  screenSlice,
  statusSlice,
  explosionsSlice,
  wallsSlice,
  transitionSlice
)

const createHeadlessStore = (
  services: HeadlessServices,
  initialLives: number,
  startLevel: number
): ReturnType<typeof configureStore<GameRootState>> => {
  const preloadedState = {
    ship: {
      ...shipSlice.getInitialState(),
      lives: initialLives
    },
    status: {
      ...statusSlice.getInitialState(),
      currentlevel: startLevel
    }
  }

  // Create the sync thunk middleware instance
  const syncThunkMiddleware = createSyncThunkMiddleware<
    GameRootState,
    HeadlessServices
  >()

  return configureStore({
    reducer: headlessReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services
        },
        // Disable serialization checks for headless validation
        // (randomService functions are passed in actions but that's okay for validation)
        serializableCheck: false
      }).prepend(syncThunkMiddleware(services)),
    preloadedState
  })
}

export type HeadlessStore = ReturnType<typeof createHeadlessStore>

export { createHeadlessStore, type HeadlessServices, type GameRootState }
