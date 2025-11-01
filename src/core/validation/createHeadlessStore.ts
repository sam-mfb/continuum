import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { gameSlice } from '@core/game'
import { shipSlice, TOTAL_INITIAL_LIVES } from '@core/ship'
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
import type { RandomService } from '@/core/shared'
import type { RecordingService } from '@core/recording'
import type { CollisionService } from '@core/collision'
import type { SpriteService } from '@core/sprites'

// Minimal services needed for game logic only
// Note: No fizzTransitionService needed - headless engine uses frame counter instead
type HeadlessServices = {
  galaxyService: GalaxyService
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
  startLevel: number
): ReturnType<typeof configureStore<GameRootState>> => {
  // Create the sync thunk middleware instance
  const syncThunkMiddleware = createSyncThunkMiddleware<
    GameRootState,
    HeadlessServices
  >()

  const store = configureStore({
    reducer: headlessReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services
        },
        // Disable serialization checks for headless validation
        // (randomService functions are passed in actions but that's okay for validation)
        serializableCheck: false
      }).prepend(syncThunkMiddleware(services))
  })

  // Initialize state using the same actions as replay and game
  // (ReplaySelectionScreen.tsx:132-136 and App.tsx:186-189)
  // This ensures validator state matches game/replay state exactly
  store.dispatch(shipSlice.actions.resetShip())
  store.dispatch(shipSlice.actions.resetFuel())
  store.dispatch(statusSlice.actions.initStatus(startLevel))
  store.dispatch(shipSlice.actions.resetLives(TOTAL_INITIAL_LIVES))

  // Mark cheat used if starting beyond level 1
  if (startLevel > 1) {
    store.dispatch(gameSlice.actions.markCheatUsed())
  }

  return store
}

export type HeadlessStore = ReturnType<typeof createHeadlessStore>

export { createHeadlessStore, type HeadlessServices, type GameRootState }
