/**
 * Main entry point for the full game
 */

import './style.css'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { App } from './App'
import { createSpriteService } from '@core/sprites'
import { createGalaxyService } from '@core/galaxy'
import { createFizzTransitionService } from '@core/transition'
import { createSoundService } from '@core/sound'
import { createGameRenderer } from './gameLoop'
import { setAlignmentMode } from '@/core/shared'
import { createGameStore } from './store'
import {
  ASSET_PATHS,
  DEFAULT_SOUND_VOLUME,
  DEFAULT_SOUND_MUTED,
  TOTAL_INITIAL_LIVES
} from './constants'

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

try {
  // Initialize services
  const spriteService = await createSpriteService({
    spriteResource: ASSET_PATHS.SPRITE_RESOURCE,
    statusBarResource: ASSET_PATHS.STATUS_BAR_RESOURCE,
    titlePageResource: ASSET_PATHS.TITLE_PAGE_RESOURCE
  })
  console.log('Sprite service created')

  const galaxyService = await createGalaxyService(ASSET_PATHS.GALAXY_DATA)
  console.log('Galaxy service created')

  const fizzTransitionService = createFizzTransitionService()
  console.log('Fizz transition service created')

  const soundService = await createSoundService({
    volume: DEFAULT_SOUND_VOLUME,
    muted: DEFAULT_SOUND_MUTED
  })
  console.log('Sound service created')

  // Create store with services and initial settings
  const store = createGameStore(
    {
      galaxyService,
      spriteService,
      fizzTransitionService,
      soundService
    },
    {
      soundVolume: DEFAULT_SOUND_VOLUME,
      soundEnabled: !DEFAULT_SOUND_MUTED,
      initialLives: TOTAL_INITIAL_LIVES
    }
  )
  console.log('Game store created with services')

  const renderer = createGameRenderer(
    store,
    spriteService,
    galaxyService,
    fizzTransitionService
  )
  const totalLevels = galaxyService.getHeader().planets

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
        totalLevels={totalLevels}
        soundService={soundService}
      />
    </Provider>
  )

  console.log('Game started!')
} catch (error) {
  console.error('Failed to initialize game:', error)
  app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
}
