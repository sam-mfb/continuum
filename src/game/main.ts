/**
 * Main entry point for the full game
 */

import './style.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import GameCanvas from './GameCanvas'
import { createSpriteServiceV2 } from '@core/sprites'
import { createGameRenderer, getGameStore, getGalaxyHeader } from './gameLoop'
import { loadLevel } from './levelManager'
import { setAlignmentMode } from '@/core/shared/alignment'
import { toggleAlignmentMode } from './gameSlice'

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

// Initialize sprite service
createSpriteServiceV2()
  .then(spriteService => {
    console.log('Sprite service initialized')

    const renderer = createGameRenderer(spriteService)

    // Wait a bit for the game to initialize and load galaxy data
    setTimeout(() => {
      const store = getGameStore()
      const galaxyHeader = getGalaxyHeader()
      const totalLevels = galaxyHeader?.planets || 30

      // Set up alignment mode subscription
      if (store) {
        // Set initial alignment mode from Redux state
        const initialState = store.getState()
        setAlignmentMode(initialState.game.alignmentMode)

        // Subscribe to alignment mode changes
        store.subscribe(() => {
          const state = store.getState()
          setAlignmentMode(state.game.alignmentMode)
        })
      }

      // Render the game canvas with level selector
      root.render(
        React.createElement(GameCanvas, {
          renderer,
          width: 512,
          height: 342,
          scale: 2, // Pixel-doubled like the demos
          fps: 20, // Original Continuum runs at 20 FPS
          totalLevels,
          onLevelSelect: (level: number) => {
            if (store) {
              loadLevel(store, level)
            }
          },
          onAlignmentToggle: () => {
            if (store) {
              store.dispatch(toggleAlignmentMode())
            }
          }
        })
      )
    }, 100)

    console.log('Game started!')
  })
  .catch(error => {
    console.error('Failed to initialize game:', error)
    app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
  })
