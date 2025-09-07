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

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

// Initialize sprite service
createSpriteServiceV2()
  .then(spriteService => {
    console.log('Sprite service initialized')

    setAlignmentMode('world-fixed')

    const renderer = createGameRenderer(spriteService)

    // Wait a bit for the game to initialize and load galaxy data
    setTimeout(() => {
      const galaxyHeader = getGalaxyHeader()
      const totalLevels = galaxyHeader?.planets || 30

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
            const store = getGameStore()
            if (store) {
              loadLevel(store as any, level)
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
