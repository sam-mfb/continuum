import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { gameSlice } from '@/game/gameSlice'
import { appSlice } from '@/game/appSlice'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { statusSlice } from '@core/status'
import { explosionsSlice } from '@core/explosions'
import { wallsSlice } from '@core/walls'
import { transitionSlice } from '@core/transition'
import { highscoreSlice } from '@/core/highscore'
import { controlsSlice } from '@/core/controls'
import { syncThunkMiddleware } from '@/game/syncThunkMiddleware'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { RandomService } from '@/core/shared'
import type { RecordingService } from '@/game/recording/RecordingService'
import type { CollisionService } from '@core/collision'
import type { SpriteService } from '@core/sprites'
import type { GameServices } from '@/game/store'

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
  appSlice,
  gameSlice,
  controlsSlice,
  shipSlice,
  shotsSlice,
  planetSlice,
  screenSlice,
  statusSlice,
  explosionsSlice,
  wallsSlice,
  highscoreSlice,
  transitionSlice
)

export type HeadlessRootState = ReturnType<typeof headlessReducer>

const createHeadlessStore = (
  services: HeadlessServices,
  initialLives: number,
  galaxyId: string
) => {
  const preloadedState = {
    app: {
      ...appSlice.getInitialState(),
      currentGalaxyId: galaxyId
    },
    ship: {
      ...shipSlice.getInitialState(),
      lives: initialLives
    }
  }

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
      }).prepend(syncThunkMiddleware(services as unknown as GameServices)), // Cast needed - headless doesn't have sound services
    preloadedState
  })
}

export type HeadlessStore = ReturnType<typeof createHeadlessStore>

export { createHeadlessStore, type HeadlessServices }
