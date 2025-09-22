/**
 * Main entry point for the full game
 */

import './style.css'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import { createSpriteService } from '@core/sprites'
import { createGalaxyService } from '@core/galaxy'
import { createFizzTransitionService } from '@core/transition'
import { createGameRenderer } from './gameLoop'
import { setAlignmentMode } from '@/core/shared'
import { createGameStore } from './store'
import { initializeGame } from './initializationThunks'
import { loadLevel } from './levelManager'
import { ASSET_PATHS } from './constants'

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

async function initGame(): Promise<void> {
  try {
    // Initialize services
    const spriteService = await createSpriteService({
      spriteResource: ASSET_PATHS.SPRITE_RESOURCE,
      statusBarResource: ASSET_PATHS.STATUS_BAR_RESOURCE
    })
    console.log('Sprite service initialized')

    const galaxyService = await createGalaxyService(ASSET_PATHS.GALAXY_DATA)
    console.log('Galaxy service created with initial galaxy loaded')

    const fizzTransitionService = createFizzTransitionService()
    console.log('Fizz transition service created')

    // Create store with services
    const store = createGameStore({
      galaxyService,
      spriteService,
      fizzTransitionService
    })
    console.log('Store created with services')

    store.dispatch(initializeGame())

    // Load level 1
    loadLevel(store, 1, galaxyService)

    const renderer = createGameRenderer(
      store,
      spriteService,
      galaxyService,
      fizzTransitionService
    )
    const totalLevels = galaxyService.getHeader().planets

    // Set up alignment mode subscription
    // Set initial alignment mode from Redux state
    const initialState = store.getState()
    setAlignmentMode(initialState.game.alignmentMode)

    // Subscribe to alignment mode changes
    store.subscribe(() => {
      const state = store.getState()
      setAlignmentMode(state.game.alignmentMode)
    })

    root.render(
      <Provider store={store}>
        <App
          renderer={renderer}
          totalLevels={totalLevels}
          galaxyService={galaxyService}
        />
      </Provider>
    )

    console.log('Game started!')
  } catch (error) {
    console.error('Failed to initialize game:', error)
    app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
  }
}

// Start the game
initGame()
