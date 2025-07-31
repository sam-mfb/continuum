/**
 * Bunker Draw Bitmap Game
 *
 * Displays examples of bunkers:
 * - Static bunkers (WALL, DIFF) at different rotations
 * - Animated bunkers (GROUND, FOLLOW, GENERATOR) that rotate
 */

import type { BitmapRenderer, MonochromeBitmap } from '../../bitmap'
import { drawBunker, fullBunker } from '../../planet/render/bunker'
import { loadSprites } from '@/store/spritesSlice'
import { configureStore } from '@reduxjs/toolkit'
import spritesReducer from '@/store/spritesSlice'
import { BunkerKind, BUNKROTKINDS } from '@/figs/types'

// Create minimal store with just sprites
const store = configureStore({
  reducer: {
    sprites: spritesReducer
  }
})

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Define a world larger than the viewport
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 1024

// Animation state for rotating bunkers
const BUNKFCYCLES = 2  // From GW.h:88 - ticks per animation frame
const BUNKFRAMES = 8   // Number of animation frames for rotating bunkers

// Track animation counters for each animated bunker
const animationState = {
  groundRotCount: BUNKFCYCLES,
  groundRot: 0,
  followRotCount: BUNKFCYCLES,
  followRot: 0,
  generatorRotCount: BUNKFCYCLES,
  generatorRot: 0
}

// Viewport state - start centered
const viewportState = {
  x: (WORLD_WIDTH - 512) / 2,   // Center horizontally (512 is default bitmap width)
  y: (WORLD_HEIGHT - 342) / 2   // Center vertically (342 is default bitmap height)
}

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
 * Helper function to draw a single bunker
 */
function drawSingleBunker(
  bitmap: MonochromeBitmap,
  kind: BunkerKind,
  rotation: number,
  worldX: number,
  worldY: number,
  animationFrame?: number
): void {
  const state = store.getState()
  
  // Get the sprite
  const bunkerSprite = state.sprites.allSprites?.bunkers.getSprite(
    kind,
    rotation,
    animationFrame
  )
  
  if (!bunkerSprite) {
    console.error(`Bunker sprite not found: kind ${kind}, rotation ${rotation}`)
    return
  }
  
  // Get bunker center offsets (simplified - in real game these vary by type/rotation)
  const xcenter = 24
  const ycenter = 24
  
  // Calculate screen position from world position
  // From Bunkers.c:231: bunkx = bp->x - scrnx - xcenter;
  const screenX = viewportState.x
  const screenY = viewportState.y
  const bunkerX = worldX - screenX - xcenter
  const bunkerY = worldY - screenY - ycenter
  
  // Decide which rendering function to use based on bunker type and rotation
  // From Bunkers.c:232-242
  if (kind >= BUNKROTKINDS || rotation <= 1 || rotation >= 9) {
    // Use XOR-based rendering for:
    // - All animated bunkers
    // - Static bunkers facing up/down (rot 0-1, 9-15)
    
    // Calculate alignment for pre-computed image selection
    // From Bunkers.c:235: align = (bp->x + bp->y + xcenter + ycenter) & 1;
    const align = (worldX + worldY + xcenter + ycenter) & 1
    
    // Use the pre-computed image that has the correct background pattern
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
    const renderedBitmap = drawBunker({
      x: bunkerX,
      y: bunkerY,
      def: precomputedBitmap
    })(bitmap)
    
    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)
  } else {
    // Use mask-based rendering for side-facing static bunkers (rot 2-8)
    const defBitmap: MonochromeBitmap = {
      data: bunkerSprite.def,
      width: 48,
      height: 48,
      rowBytes: 6
    }
    
    const maskBitmap: MonochromeBitmap = {
      data: bunkerSprite.mask,
      width: 48,
      height: 48,
      rowBytes: 6
    }
    
    const renderedBitmap = fullBunker({
      x: bunkerX,
      y: bunkerY,
      def: defBitmap,
      mask: maskBitmap
    })(bitmap)
    
    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)
  }
}

/**
 * Bitmap renderer for bunker drawing game
 */
export const bunkerDrawBitmapRenderer: BitmapRenderer = (
  bitmap,
  frame,
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

  // Handle keyboard input for viewport movement
  const moveSpeed = 5
  if (frame.keysDown.has('ArrowUp')) {
    viewportState.y = Math.max(0, viewportState.y - moveSpeed)
  }
  if (frame.keysDown.has('ArrowDown')) {
    viewportState.y = Math.min(
      WORLD_HEIGHT - bitmap.height,
      viewportState.y + moveSpeed
    )
  }
  if (frame.keysDown.has('ArrowLeft')) {
    viewportState.x = Math.max(0, viewportState.x - moveSpeed)
  }
  if (frame.keysDown.has('ArrowRight')) {
    viewportState.x = Math.min(
      WORLD_WIDTH - bitmap.width,
      viewportState.x + moveSpeed
    )
  }

  // First, create a crosshatch gray background
  // IMPORTANT: Pattern must be based on world coordinates, not screen coordinates
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Calculate world position
      const worldX = x + viewportState.x
      const worldY = y + viewportState.y
      // Set pixel if worldX + worldY is even (creates fixed checkerboard)
      if ((worldX + worldY) % 2 === 0) {
        const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
        const bitIndex = 7 - (x % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }

  // Update animation state (game runs at 20 FPS)
  // From Bunkers.c:33-44 - animated bunkers update their rotation
  
  // Ground bunker animation
  animationState.groundRotCount--
  if (animationState.groundRotCount <= 0) {
    animationState.groundRot = (animationState.groundRot + 1) % BUNKFRAMES
    animationState.groundRotCount = BUNKFCYCLES
  }
  
  // Follow bunker animation (but at 3x slower for tracking - Bunkers.c:38)
  animationState.followRotCount--
  if (animationState.followRotCount <= 0) {
    animationState.followRot = (animationState.followRot + 1) % BUNKFRAMES
    animationState.followRotCount = 3 * BUNKFCYCLES  // 3x slower
  }
  
  // Generator bunker animation
  animationState.generatorRotCount--
  if (animationState.generatorRotCount <= 0) {
    animationState.generatorRot = (animationState.generatorRot + 1) % BUNKFRAMES
    animationState.generatorRotCount = BUNKFCYCLES
  }

  // Draw static bunkers showing first 4 rotations (0, 1, 2, 3)
  // Center all bunkers in the world
  const centerX = WORLD_WIDTH / 2
  const centerY = WORLD_HEIGHT / 2
  
  // Top row: WALL bunkers
  for (let i = 0; i < 4; i++) {
    drawSingleBunker(bitmap, BunkerKind.WALL, i, centerX - 150 + i * 100, centerY - 100)
  }
  
  // Second row: DIFF bunkers
  for (let i = 0; i < 4; i++) {
    drawSingleBunker(bitmap, BunkerKind.DIFF, i, centerX - 150 + i * 100, centerY - 30)
  }
  
  // Draw animated bunkers
  // Third row: Animated bunkers
  drawSingleBunker(
    bitmap, 
    BunkerKind.GROUND, 
    0,  // rotation param ignored for animated bunkers
    centerX - 150, 
    centerY + 40,
    animationState.groundRot
  )
  
  drawSingleBunker(
    bitmap,
    BunkerKind.FOLLOW,
    0,
    centerX - 50,
    centerY + 40,
    animationState.followRot
  )
  
  drawSingleBunker(
    bitmap,
    BunkerKind.GENERATOR,
    0,
    centerX + 50,
    centerY + 40,
    animationState.generatorRot
  )
  
  // Add labels (would need text rendering, so just add a comment)
  // Row 1: WALL bunkers at rotations 0, 1, 2, 3
  // Row 2: DIFF bunkers at rotations 0, 1, 2, 3
  // Row 3: GROUND (rotating), FOLLOW (tracking, slow), GENERATOR (rotating)
}
