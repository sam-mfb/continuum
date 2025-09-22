/**
 * Main entry point for the full game
 */

import './style.css'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createSpriteService } from '@core/sprites'
import { createGalaxyService } from '@core/galaxy'
import { createGameRenderer } from './gameLoop'
import { setAlignmentMode } from '@/core/shared'
import { store } from './store'
import { initializeGame } from './initialization'
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

    // Initialize game (sound setup, etc)
    await initializeGame(galaxyService)
    console.log('Game initialized')

    // Load level 1
    loadLevel(store, 1, galaxyService)

    const renderer = createGameRenderer(spriteService, galaxyService)
    const galaxyHeader = store.getState().game.galaxyHeader
    const totalLevels = galaxyHeader?.planets || 30

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
      <App
        renderer={renderer}
        totalLevels={totalLevels}
        galaxyService={galaxyService}
      />
    )

    console.log('Game started!')
  } catch (error) {
    console.error('Failed to initialize game:', error)
    app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
  }
}

// Start the game
initGame()
