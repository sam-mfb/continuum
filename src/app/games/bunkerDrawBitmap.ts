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
import planetReducer, {
  loadPlanet,
  updateBunkerRotations
} from '@/planet/planetSlice'
import { BunkerKind } from '@/figs/types'
import type { Bunker, PlanetState } from '@/planet/types'

// Create store with sprites and planet slices
const store = configureStore({
  reducer: {
    sprites: spritesReducer,
    planet: planetReducer
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

// Create initial planet state with bunkers
const createInitialPlanetState = (): PlanetState => {
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

    // Third row: Animated bunkers (with rotcount initialized)
    {
      x: 362,
      y: 552,
      rot: 0,
      rotcount: BUNKFCYCLES,
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
      rotcount: BUNKFCYCLES,
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
      rotcount: BUNKFCYCLES,
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

  return {
    worldwidth: WORLD_WIDTH,
    worldheight: WORLD_HEIGHT,
    worldwrap: false,
    shootslow: 0,
    xstart: 512,
    ystart: 512,
    planetbonus: 0,
    gravx: 0,
    gravy: 0,
    numcraters: 0,
    lines: [],
    bunkers,
    fuels: [],
    craters: []
  }
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

    // Initialize planet state with bunkers
    console.log('Initializing planet state...')
    store.dispatch(loadPlanet(createInitialPlanetState()))
    console.log('Planet state initialized')

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

  // Update animation state using the reducer
  // The follow bunker needs ship position - use viewport center as mock ship position
  const globalx = viewportState.x + bitmap.width / 2
  const globaly = viewportState.y + bitmap.height / 2

  store.dispatch(updateBunkerRotations({ globalx, globaly }))

  // Get current planet state
  const planetState = store.getState().planet

  // Draw all bunkers using doBunks
  const bunkerSprites = state.sprites.allSprites.bunkers

  const renderedBitmap = doBunks({
    bunkrec: planetState.bunkers,
    scrnx: viewportState.x,
    scrny: viewportState.y,
    bunkerSprites: bunkerSprites
  })(bitmap)

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
  
  // Draw a black box to indicate the mock ship position (center of screen)
  const shipX = bitmap.width / 2 - 4 // Center minus half of 8px
  const shipY = bitmap.height / 2 - 4
  
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const pixelX = shipX + x
      const pixelY = shipY + y
      
      // Make sure we're within bounds
      if (pixelX >= 0 && pixelX < bitmap.width && pixelY >= 0 && pixelY < bitmap.height) {
        const byteIndex = Math.floor(pixelY * bitmap.rowBytes + pixelX / 8)
        const bitIndex = 7 - (pixelX % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }
}
