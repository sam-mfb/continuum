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

  // We don't need the original def - we'll use the pre-computed images

  // Define bunker world position to place it at center of screen
  // Since screenx = screeny = 0 (no scrolling), world pos = screen pos + center offset
  const bunkerWorldX = 256 // Center of 512 wide screen
  const bunkerWorldY = 171 // Center of 342 high viewport

  // Get bunker center offsets for WALLBUNK (kind 0) rotation 0
  const xcenter = 24
  const ycenter = 26

  // Calculate screen position from world position
  // From Bunkers.c:231: bunkx = bp->x - scrnx - xcenter;
  const screenX = 0 // No scrolling
  const screenY = 0 // No scrolling
  const bunkerX = bunkerWorldX - screenX - xcenter // 256 - 0 - 24 = 232
  const bunkerY = bunkerWorldY - screenY - ycenter // 171 - 0 - 26 = 145

  // Calculate alignment for pre-computed image selection
  // From Bunkers.c:235: align = (bp->x + bp->y + xcenter + ycenter) & 1;
  // This uses world coordinates, not screen coordinates
  const align = (bunkerWorldX + bunkerWorldY + xcenter + ycenter) & 1

  // Use the pre-computed image that has the correct background pattern
  // This matches the original implementation exactly
  const precomputedBitmap: MonochromeBitmap = {
    data:
      align === 0
        ? bunkerSprite.images.background1
        : bunkerSprite.images.background2,
    width: 48,
    height: 48,
    rowBytes: 6
  }

  // Draw the bunker using the pre-computed image
  // The pre-computed image already has the background pattern XORed in
  const renderedBitmap = drawBunker({
    x: bunkerX,
    y: bunkerY,
    def: precomputedBitmap
  })(bitmap)

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}
