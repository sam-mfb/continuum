/**
 * @fileoverview Central Redux store configuration for the game
 */

import {
  combineSlices,
  configureStore,
  createListenerMiddleware
} from '@reduxjs/toolkit'
import type { GalaxyService } from '@core/galaxy'
import type { SpriteService } from '@core/sprites'
import type { FizzTransitionService } from '@core/transition'
import type { GameSoundService } from './types'
import type { RandomService } from '@/core/shared'

// Import all reducers
import { gameSlice } from './gameSlice'
import { appSlice } from './appSlice'
import { replaySlice } from './replaySlice'
import { appMiddleware, loadAppSettings } from './appMiddleware'
import { syncThunkMiddleware } from './syncThunkMiddleware'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { statusSlice } from '@core/status'
import { explosionsSlice } from '@core/explosions'
import { wallsSlice } from '@core/walls'
import { transitionSlice } from '@core/transition'
import {
  highscoreSlice,
  highscoreMiddleware,
  loadHighScores
} from '@/core/highscore'
import {
  controlsSlice,
  controlsMiddleware,
  loadControlBindings
} from '@/core/controls'
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook
} from 'react-redux'
import { setupSoundListener } from './soundListenerMiddleware'
import type { CollisionService } from '@/core/collision'
import type { RecordingService } from '@core/recording'

// Define the services that will be injected
export type GameServices = {
  galaxyService: GalaxyService
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
  soundService: GameSoundService
  collisionService: CollisionService
  randomService: RandomService
  recordingService: RecordingService
}

// Initial settings for the game
export type GameInitialSettings = {
  soundVolume: number
  soundEnabled: boolean
  initialLives: number
}

const rootReducer = combineSlices(
  appSlice,
  gameSlice,
  replaySlice,
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

export type RootReducer = typeof rootReducer
export type RootState = ReturnType<RootReducer>

// Factory function to create store and listeners
const createStoreAndListeners = (
  reducer: RootReducer,
  services: GameServices,
  initialSettings: GameInitialSettings
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  // Create the listener middleware instance
  const soundListenerMiddleware = createListenerMiddleware()
  // Load persisted high scores
  const persistedHighScores = loadHighScores()
  // Load persisted control bindings
  const persistedControls = loadControlBindings()
  // Load persisted app settings
  const persistedAppSettings = loadAppSettings()

  // Build preloaded state with initial settings
  const preloadedState = {
    app: {
      ...appSlice.getInitialState(),
      // Use persisted settings if available, otherwise use initial settings
      collisionMode:
        persistedAppSettings.collisionMode ??
        appSlice.getInitialState().collisionMode,
      soundMode:
        persistedAppSettings.soundMode ?? appSlice.getInitialState().soundMode,
      volume: persistedAppSettings.volume ?? initialSettings.soundVolume,
      soundOn: persistedAppSettings.soundOn ?? initialSettings.soundEnabled,
      alignmentMode:
        persistedAppSettings.alignmentMode ??
        appSlice.getInitialState().alignmentMode,
      showInGameControls:
        persistedAppSettings.showInGameControls ??
        appSlice.getInitialState().showInGameControls,
      scaleMode:
        persistedAppSettings.scaleMode ?? appSlice.getInitialState().scaleMode,
      touchControlsOverride:
        persistedAppSettings.touchControlsOverride ??
        appSlice.getInitialState().touchControlsOverride,
      renderMode:
        persistedAppSettings.renderMode ??
        appSlice.getInitialState().renderMode,
      solidBackground:
        persistedAppSettings.solidBackground ??
        appSlice.getInitialState().solidBackground
    },
    highscore: persistedHighScores,
    controls: {
      bindings: persistedControls
    },
    ship: {
      ...shipSlice.getInitialState(),
      lives: initialSettings.initialLives
    }
  }

  const store = configureStore({
    reducer: reducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services
        },
        serializableCheck: {
          // Ignore these paths in the state/actions for serializability checks
          ignoredActionPaths: ['meta.payloadCreator', 'meta.result']
        }
      })
        .prepend(soundListenerMiddleware.middleware)
        .prepend(syncThunkMiddleware(services))
        .concat(appMiddleware)
        .concat(highscoreMiddleware)
        .concat(controlsMiddleware),
    preloadedState
  })

  return { store, soundListenerMiddleware }
}

// Define the actual state shape
export type GameStore = ReturnType<typeof createStoreAndListeners>['store']

export type AppDispatch = GameStore['dispatch']

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Store instance for accessing services
// This will be set when the store is created
let storeInstance: GameStore | null = null

export const getStoreServices = (): GameServices => {
  if (!storeInstance) {
    throw new Error('Store not initialized')
  }
  // Access services via the thunk extra argument (stored during creation)
  // We'll need to store services separately since they're not in state
  return servicesInstance!
}

let servicesInstance: GameServices | null = null

export const createGameStore = (
  services: GameServices,
  initialSettings: GameInitialSettings
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  const { store, soundListenerMiddleware } = createStoreAndListeners(
    rootReducer,
    services,
    initialSettings
  )
  // Setup the sound listener with the sound service
  setupSoundListener(
    soundListenerMiddleware.startListening.withTypes<RootState, AppDispatch>(),
    services.soundService
  )

  // Store the instance and services for access
  storeInstance = store
  servicesInstance = services

  return store
}
