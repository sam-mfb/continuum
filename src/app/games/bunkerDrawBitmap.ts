/**
 * Bunker Draw Bitmap Game
 *
 * A simple bitmap-based game that draws a single WALL bunker
 * in the 0 degree position on a gray background.
 */

import type { BitmapRenderer, MonochromeBitmap } from '../../bitmap'
import { drawBunker } from '../../planet/render/bunker'
import { loadSprites } from '@/store/spritesSlice'
import { configureStore } from '@reduxjs/toolkit'
import spritesReducer from '@/store/spritesSlice'
import { SCRWTH, VIEWHT } from '@/screen/constants'

// Create minimal store with just sprites
const store = configureStore({
  reducer: {
    sprites: spritesReducer
  }
})

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting bunkerDrawBitmap initialization...')

    // Load sprites
    console.log('Loading sprites...')
    await store.dispatch(loadSprites()).unwrap()
    console.log('Sprites loaded successfully')

    initializationComplete = true
    console.log('bunkerDrawBitmap initialization complete')
  } catch (error) {
    console.error('Error initializing bunkerDrawBitmap:', error)
    initializationError = error as Error
  }
}

// Start initialization
void initializeGame()

/**
 * Bitmap renderer for bunker drawing game
 */
export const bunkerDrawBitmapRenderer: BitmapRenderer = (
  bitmap,
  _frame,
  _env
) => {
  // Check initialization status
  if (initializationError) {
    console.error('Initialization failed:', initializationError)
    bitmap.data.fill(0)
    return
  }

  if (!initializationComplete) {
    // Still loading
    bitmap.data.fill(0)
    return
  }

  const state = store.getState()

  // Check if sprites are loaded
  if (!state.sprites.allSprites) {
    console.error('Sprites not loaded')
    bitmap.data.fill(0)
    return
  }

  // First, create a crosshatch gray background
  // Pattern must be based on world coordinates, not screen coordinates
  // For simplicity, we'll use screen coordinates as world coordinates (no scrolling)
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Set pixel if x + y is even (creates fixed checkerboard)
      if ((x + y) % 2 === 0) {
        const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
        const bitIndex = 7 - (x % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }

  // Get WALLBUNK (kind 0) sprite at rotation 0
  const bunkerSprite = state.sprites.allSprites.bunkers.getSprite(0, 0)

  if (!bunkerSprite) {
    console.error('Bunker sprite not found')
    return
  }

  // Convert sprite data to MonochromeBitmap format
  // Bunker sprites are 48 pixels wide, 48 pixels tall
  const bunkerBitmap: MonochromeBitmap = {
    data: bunkerSprite.def,
    width: 48,
    height: 48,
    rowBytes: 6 // 48 pixels / 8 bits per byte
  }

  // Calculate bunker position (center of screen)
  // Screen is 512x342, bunker is 48x48
  const bunkerX = Math.floor(SCRWTH / 2 - 24) // 256 - 24 = 232
  const bunkerY = Math.floor(VIEWHT / 2 - 24) // 171 - 24 = 147

  // Draw the bunker using XOR operations
  // WALLBUNK with rotation 0 uses drawBunker (XOR-based) per the architecture
  // Note: The original code uses pre-computed images with background patterns,
  // but our implementation XORs directly onto the existing bitmap
  const renderedBitmap = drawBunker({
    x: bunkerX,
    y: bunkerY,
    def: bunkerBitmap
  })(bitmap)

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}
