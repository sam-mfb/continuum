/**
 * Bunker Draw Bitmap Game
 *
 * Displays examples of bunkers:
 * - Static bunkers (WALL, DIFF) at different rotations
 * - Animated bunkers (GROUND, FOLLOW, GENERATOR) that rotate
 */

import type { BitmapRenderer } from '../../bitmap'
import { doBunks } from '../../planet/render/bunker'
import { loadSprites } from '@/store/spritesSlice'
import { configureStore } from '@reduxjs/toolkit'
import spritesReducer from '@/store/spritesSlice'
import { BunkerKind, BUNKROTKINDS } from '@/figs/types'
import type { Bunker } from '@/planet/types'

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
const BUNKFCYCLES = 2 // From GW.h:88 - ticks per animation frame
const BUNKFRAMES = 8 // Number of animation frames for rotating bunkers

// Create bunker array following original game structure
// In the original, bunkers array has NUMBUNKERS (25) entries
// We'll create a smaller array for demo purposes
const bunkers: Bunker[] = [
  // Top row: WALL bunkers (static, different rotations)
  {
    x: 362,
    y: 412,
    rot: 0,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.WALL
  },
  {
    x: 462,
    y: 412,
    rot: 1,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.WALL
  },
  {
    x: 562,
    y: 412,
    rot: 2,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.WALL
  },
  {
    x: 662,
    y: 412,
    rot: 3,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.WALL
  },

  // Second row: DIFF bunkers (static, different rotations)
  {
    x: 362,
    y: 482,
    rot: 0,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.DIFF
  },
  {
    x: 462,
    y: 482,
    rot: 1,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.DIFF
  },
  {
    x: 562,
    y: 482,
    rot: 2,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.DIFF
  },
  {
    x: 662,
    y: 482,
    rot: 3,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.DIFF
  },

  // Third row: Animated bunkers
  {
    x: 362,
    y: 552,
    rot: 0,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.GROUND
  },
  {
    x: 462,
    y: 552,
    rot: 0,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.FOLLOW
  },
  {
    x: 562,
    y: 552,
    rot: 0,
    ranges: [
      { low: 0, high: 100 },
      { low: 200, high: 300 }
    ],
    alive: true,
    kind: BunkerKind.GENERATOR
  },

  // End marker (rot < 0 indicates end of array)
  { x: 0, y: 0, rot: -1, ranges: [], alive: false, kind: BunkerKind.WALL }
]

// Track rotation counts for animated bunkers
const rotCounts = {
  ground: BUNKFCYCLES,
  follow: BUNKFCYCLES,
  generator: BUNKFCYCLES
}

// Viewport state - start centered
const viewportState = {
  x: (WORLD_WIDTH - 512) / 2, // Center horizontally (512 is default bitmap width)
  y: (WORLD_HEIGHT - 342) / 2 // Center vertically (342 is default bitmap height)
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

  // Find animated bunkers in the array and update their rotation
  for (let i = 0; i < bunkers.length; i++) {
    const bunker = bunkers[i]
    if (!bunker || bunker.rot < 0) break // End of array

    if (bunker.kind >= BUNKROTKINDS) {
      // This is an animated bunker
      switch (bunker.kind) {
        case BunkerKind.GROUND:
          rotCounts.ground--
          if (rotCounts.ground <= 0) {
            bunker.rot = (bunker.rot + 1) & (BUNKFRAMES - 1)
            rotCounts.ground = BUNKFCYCLES
          }
          break

        case BunkerKind.FOLLOW:
          // Follow bunker rotates 3x slower (Bunkers.c:38)
          rotCounts.follow--
          if (rotCounts.follow <= 0) {
            bunker.rot = (bunker.rot + 1) & (BUNKFRAMES - 1)
            rotCounts.follow = 3 * BUNKFCYCLES
          }
          break

        case BunkerKind.GENERATOR:
          rotCounts.generator--
          if (rotCounts.generator <= 0) {
            bunker.rot = (bunker.rot + 1) & (BUNKFRAMES - 1)
            rotCounts.generator = BUNKFCYCLES
          }
          break
      }
    }
  }

  // Draw all bunkers using doBunks
  const bunkerSprites = state.sprites.allSprites.bunkers

  const renderedBitmap = doBunks({
    bunkrec: bunkers,
    scrnx: viewportState.x,
    scrny: viewportState.y,
    bunkerSprites: bunkerSprites
  })(bitmap)

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}
