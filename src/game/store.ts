/**
 * @fileoverview Central Redux store configuration for the game
 */

import {
  combineReducers,
  configureStore,
  createListenerMiddleware
} from '@reduxjs/toolkit'
import type { GalaxyService } from '@core/galaxy'
import type { SpriteService } from '@core/sprites'
import type { FizzTransitionService } from '@core/transition'
import type { SoundService } from '@core/sound'

// Import all reducers
import { gameSlice } from './gameSlice'
import { appSlice } from './appSlice'
import { appMiddleware, loadAppSettings } from './appMiddleware'
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

// Define the services that will be injected
export type GameServices = {
  galaxyService: GalaxyService
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
  soundService: SoundService
  collisionService: CollisionService
}

// Initial settings for the game
export type GameInitialSettings = {
  soundVolume: number
  soundEnabled: boolean
  initialLives: number
}

const rootReducer = combineReducers({
  game: gameSlice.reducer,
  app: appSlice.reducer,
  controls: controlsSlice.reducer,
  ship: shipSlice.reducer,
  shots: shotsSlice.reducer,
  planet: planetSlice.reducer,
  screen: screenSlice.reducer,
  status: statusSlice.reducer,
  explosions: explosionsSlice.reducer,
  walls: wallsSlice.reducer,
  highscore: highscoreSlice.reducer,
  transition: transitionSlice.reducer
})

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
      volume: persistedAppSettings.volume ?? initialSettings.soundVolume,
      soundOn: persistedAppSettings.soundOn ?? initialSettings.soundEnabled,
      alignmentMode:
        persistedAppSettings.alignmentMode ??
        appSlice.getInitialState().alignmentMode,
      showInGameControls:
        persistedAppSettings.showInGameControls ??
        appSlice.getInitialState().showInGameControls
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
        }
      })
        .prepend(soundListenerMiddleware.middleware)
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

  return store
}
