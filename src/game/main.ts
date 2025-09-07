/**
 * Main entry point for the full game
 */

import './style.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import GameCanvas from './GameCanvas'
import { createSpriteServiceV2 } from '@core/sprites'
import { createGameRenderer } from './gameLoop'

const app = document.querySelector<HTMLDivElement>('#app')!
const root = createRoot(app)

// Initialize sprite service
createSpriteServiceV2().then(spriteService => {
  console.log('Sprite service initialized')
  
  // Render the game canvas
  root.render(
    React.createElement(GameCanvas, {
      renderer: createGameRenderer(spriteService),
      width: 512,
      height: 342,
      scale: 2,  // Pixel-doubled like the demos
      fps: 20   // Original Continuum runs at 20 FPS
    })
  )
  
  console.log('Game started!')
}).catch(error => {
  console.error('Failed to initialize game:', error)
  app.innerHTML = `<div style="color: red; padding: 20px;">Failed to initialize game: ${error}</div>`
})