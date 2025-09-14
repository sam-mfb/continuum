/**
 * Main entry point for the full game
 */

import './style.css'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createSpriteServiceV2 } from '@core/sprites'
import { createGameRenderer, getGalaxyHeader } from './gameLoop'
import { setAlignmentMode } from '@/core/shared/alignment'
import { store } from './store'

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

async function initGame(): Promise<void> {
  try {
    // Initialize sprite service
    const spriteService = await createSpriteServiceV2()
    console.log('Sprite service initialized')

    const renderer = createGameRenderer(spriteService)
    const galaxyHeader = getGalaxyHeader()
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

    // Render the App component with JSX
    root.render(<App renderer={renderer} totalLevels={totalLevels} />)

    console.log('Game started!')
  } catch (error) {
    console.error('Failed to initialize game:', error)
    app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
  }
}

// Start the game
initGame()
