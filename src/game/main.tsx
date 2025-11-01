/**
 * Main entry point for the full game
 */

import './style.css'
import './mobile/mobile.css'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { App } from './App'
import { createSpriteService } from '@core/sprites'
import { createGalaxyService } from '@core/galaxy'
import {
  createFizzTransitionService,
  createFizzTransitionServiceFrame
} from '@core/transition'
import { createSoundService } from '@/core/sound'
import { createModernSoundService } from '@/core/sound-modern'
import { createGameRenderer, createGameRendererNew } from './gameLoop'
import { loadAppSettings } from './appMiddleware'
import { setAlignmentMode, createRandomService } from '@/core/shared'
import { createGameStore } from './store'
import {
  setCurrentGalaxy,
  setTotalLevels,
  enableTouchControls,
  disableTouchControls
} from './appSlice'
import { isTouchDevice } from './mobile/deviceDetection'
import {
  ASSET_PATHS,
  DEFAULT_SOUND_VOLUME,
  DEFAULT_SOUND_MUTED
} from './constants'
import { TOTAL_INITIAL_LIVES } from '@/core/ship'
import { getDefaultGalaxy } from './galaxyConfig'
import { createCollisionService } from '@/core/collision'
import { SCRWTH, VIEWHT } from '@/core/screen'
import { initializeSpriteRegistry } from '@/lib/frame/initializeSpriteRegistry'
import { createRecordingService } from '@core/recording'
import { enableDebugOption } from './debug'

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

enableDebugOption({ ENABLE_FULL_SNAPSHOTS: false })

try {
  // Initialize services
  const spriteService = await createSpriteService({
    spriteResource: ASSET_PATHS.SPRITE_RESOURCE,
    statusBarResource: ASSET_PATHS.STATUS_BAR_RESOURCE,
    titlePageResource: ASSET_PATHS.TITLE_PAGE_RESOURCE
  })
  console.log('Sprite service created')

  // Initialize sprite registry (but don't load sprites yet - App.tsx will handle loading based on renderMode)
  const spriteRegistry = initializeSpriteRegistry()
  console.log('Sprite registry initialized (sprites not loaded yet)')

  // Load default galaxy
  const defaultGalaxy = getDefaultGalaxy()
  const galaxyService = await createGalaxyService(defaultGalaxy.path)
  console.log('Galaxy service created')

  const fizzTransitionService = createFizzTransitionService()
  const fizzTransitionServiceFrame = createFizzTransitionServiceFrame()
  console.log('Fizz transition services created')

  // Load persisted sound mode setting
  const persistedSettings = loadAppSettings()
  const soundMode = persistedSettings.soundMode ?? 'original'

  // Create appropriate sound service based on mode
  const soundService =
    soundMode === 'modern'
      ? await createModernSoundService({
          volume: DEFAULT_SOUND_VOLUME,
          muted: DEFAULT_SOUND_MUTED
        })
      : await createSoundService({
          volume: DEFAULT_SOUND_VOLUME,
          muted: DEFAULT_SOUND_MUTED
        })
  console.log(`Sound service created (${soundMode} mode)`)

  const collisionService = createCollisionService()
  collisionService.initialize({ width: SCRWTH, height: VIEWHT })
  console.log('Collision service created')

  const randomService = createRandomService()
  console.log('Random service created')

  const recordingService = createRecordingService()
  console.log('Recording service created')

  // Create store with services and initial settings
  const store = createGameStore(
    {
      galaxyService,
      spriteService,
      fizzTransitionService,
      soundService,
      collisionService,
      randomService,
      recordingService
    },
    {
      soundVolume: DEFAULT_SOUND_VOLUME,
      soundEnabled: !DEFAULT_SOUND_MUTED,
      initialLives: TOTAL_INITIAL_LIVES
    }
  )
  console.log('Game store created with services')

  // Set initial galaxy state
  const totalLevels = galaxyService.getHeader().planets
  store.dispatch(setCurrentGalaxy(defaultGalaxy.id))
  store.dispatch(setTotalLevels(totalLevels))

  // Initialize touch controls based on device detection and user override
  const touchControlsOverride = store.getState().app.touchControlsOverride
  const shouldEnableTouchControls =
    touchControlsOverride !== null ? touchControlsOverride : isTouchDevice()

  if (shouldEnableTouchControls) {
    store.dispatch(enableTouchControls())
  } else {
    store.dispatch(disableTouchControls())
  }

  const renderer = createGameRenderer(
    store,
    spriteService,
    galaxyService,
    fizzTransitionService,
    randomService
  )
  const rendererNew = createGameRendererNew(
    store,
    spriteService,
    galaxyService,
    fizzTransitionServiceFrame,
    randomService
  )

  // Set up alignment mode subscription
  let currentAlignmentMode = store.getState().app.alignmentMode
  // Set initial alignment mode from Redux state
  setAlignmentMode(currentAlignmentMode)

  // Subscribe to alignment mode changes
  store.subscribe(() => {
    const newAlignmentMode = store.getState().app.alignmentMode
    if (newAlignmentMode !== currentAlignmentMode) {
      setAlignmentMode(newAlignmentMode)
      currentAlignmentMode = newAlignmentMode
    }
  })

  root.render(
    <Provider store={store}>
      <App
        renderer={renderer}
        rendererNew={rendererNew}
        collisionService={collisionService}
        soundService={soundService}
        spriteService={spriteService}
        spriteRegistry={spriteRegistry}
      />
    </Provider>
  )

  console.log('Game started!')
} catch (error) {
  console.error('Failed to initialize game:', error)
  app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
}
