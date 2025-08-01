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
  updateBunkerRotations,
  initializeBunkers
} from '@/planet/planetSlice'
import shotsReducer, { bunkShoot, moveBullets } from '@/shots/shotsSlice'
import { BunkerKind } from '@/figs/types'
import type { Bunker, PlanetState } from '@/planet/types'
import { drawDotSafe } from '@/shots/render/drawDotSafe'
import { rint } from '@/shared/rint'
import { SBARHT } from '@/screen/constants'
import { isOnRightSide } from '@/shared/viewport'

// Create store with sprites, planet, and shots slices
const store = configureStore({
  reducer: {
    sprites: spritesReducer,
    planet: planetReducer,
    shots: shotsReducer
  }
})

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Define a world larger than the viewport
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 1024

// Create initial planet state with bunkers
const createInitialPlanetState = (): PlanetState => {
  // Use shootslow = 12 like the original example planet
  const SHOOT_SLOW = 12 // 12% chance per frame to shoot

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

    // Third row: Animated bunkers (rotcount will be initialized by reducer)
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
    
    // Bunkers near world edges to test wrapping
    {
      x: 50, // Near left edge
      y: 512,
      rot: 0,
      ranges: [
        { low: 0, high: 100 },
        { low: 200, high: 300 }
      ],
      alive: true,
      kind: BunkerKind.WALL
    },
    {
      x: WORLD_WIDTH - 50, // Near right edge
      y: 512,
      rot: 0,
      ranges: [
        { low: 0, high: 100 },
        { low: 200, high: 300 }
      ],
      alive: true,
      kind: BunkerKind.WALL
    },

    // End marker (rot < 0 indicates end of array)
    { x: 0, y: 0, rot: -1, ranges: [], alive: false, kind: BunkerKind.WALL }
  ]

  return {
    worldwidth: WORLD_WIDTH,
    worldheight: WORLD_HEIGHT,
    worldwrap: true, // Enable wrapping to test the feature
    shootslow: SHOOT_SLOW,
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
    store.dispatch(initializeBunkers())
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

  // Get current planet state
  const planetState = state.planet

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
    viewportState.x -= moveSpeed
    if (planetState.worldwrap) {
      // Wrap around if we go negative
      viewportState.x = ((viewportState.x % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH
    } else {
      // Clamp to world bounds for non-wrapping worlds
      viewportState.x = Math.max(0, viewportState.x)
    }
  }
  if (frame.keysDown.has('ArrowRight')) {
    viewportState.x += moveSpeed
    if (planetState.worldwrap) {
      // Wrap around if we exceed world width
      viewportState.x = viewportState.x % WORLD_WIDTH
    } else {
      // Clamp to world bounds for non-wrapping worlds
      viewportState.x = Math.min(WORLD_WIDTH - bitmap.width, viewportState.x)
    }
  }

  // First, create a crosshatch gray background
  // IMPORTANT: Pattern must be based on world coordinates, not screen coordinates
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Calculate world position, handling wrapping
      let worldX = x + viewportState.x
      const worldY = y + viewportState.y
      
      // For wrapping worlds, normalize worldX to be within world bounds
      if (planetState.worldwrap) {
        worldX = ((worldX % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH
      }
      
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
  // Adjust Y to account for status bar - the game world Y coordinates don't include SBARHT
  const globaly = viewportState.y + bitmap.height / 2 - SBARHT

  store.dispatch(updateBunkerRotations({ globalx, globaly }))

  // Check if bunkers should shoot this frame (probabilistic based on shootslow)
  // if (rint(100) < shootslow) bunk_shoot(); (Bunkers.c:30-31)
  if (rint(100) < planetState.shootslow) {
    // Calculate screen boundaries for shot eligibility
    const screenb = viewportState.y + bitmap.height
    const screenr = viewportState.x + bitmap.width

    store.dispatch(
      bunkShoot({
        screenx: viewportState.x,
        screenr: screenr,
        screeny: viewportState.y,
        screenb: screenb,
        bunkrecs: planetState.bunkers,
        worldwidth: planetState.worldwidth,
        worldwrap: planetState.worldwrap,
        globalx: globalx,
        globaly: globaly
      })
    )
  }

  // Move all bunker shots
  store.dispatch(
    moveBullets({
      worldwidth: planetState.worldwidth,
      worldwrap: planetState.worldwrap
    })
  )

  // Draw all bunkers using doBunks
  const bunkerSprites = state.sprites.allSprites.bunkers

  // Draw bunkers at normal position
  let renderedBitmap = doBunks({
    bunkrec: planetState.bunkers,
    scrnx: viewportState.x,
    scrny: viewportState.y,
    bunkerSprites: bunkerSprites
  })(bitmap)

  // If wrapping world and near right edge, draw wrapped bunkers
  const onRightSide = isOnRightSide(
    viewportState.x,
    bitmap.width,
    planetState.worldwidth,
    planetState.worldwrap
  )
  
  if (onRightSide) {
    renderedBitmap = doBunks({
      bunkrec: planetState.bunkers,
      scrnx: viewportState.x - planetState.worldwidth,
      scrny: viewportState.y,
      bunkerSprites: bunkerSprites
    })(renderedBitmap) // Pass already-rendered bitmap
  }

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)

  // Draw all bunker shots
  const updatedShotsState = store.getState().shots
  for (const shot of updatedShotsState.bunkshots) {
    if (shot.lifecount > 0) {
      // Check if shot is visible on screen at normal position
      const shotScreenX = shot.x - viewportState.x
      const shotScreenY = shot.y - viewportState.y

      if (
        shotScreenX >= 0 &&
        shotScreenX < bitmap.width - 1 &&
        shotScreenY >= 0 &&
        shotScreenY < bitmap.height - 1
      ) {
        drawDotSafe(shotScreenX, shotScreenY, bitmap)
      }
      
      // If wrapping world and near right edge, also check wrapped position
      if (onRightSide) {
        const wrappedScreenX = shot.x - (viewportState.x - planetState.worldwidth)
        
        if (
          wrappedScreenX >= 0 &&
          wrappedScreenX < bitmap.width - 1 &&
          shotScreenY >= 0 &&
          shotScreenY < bitmap.height - 1
        ) {
          drawDotSafe(wrappedScreenX, shotScreenY, bitmap)
        }
      }
    }
  }

  // Draw a black box to indicate the mock ship position (center of screen)
  const shipX = bitmap.width / 2 - 4 // Center minus half of 8px
  const shipY = bitmap.height / 2 - 4

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const pixelX = shipX + x
      const pixelY = shipY + y

      // Make sure we're within bounds
      if (
        pixelX >= 0 &&
        pixelX < bitmap.width &&
        pixelY >= 0 &&
        pixelY < bitmap.height
      ) {
        const byteIndex = Math.floor(pixelY * bitmap.rowBytes + pixelX / 8)
        const bitIndex = 7 - (pixelX % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }
}
