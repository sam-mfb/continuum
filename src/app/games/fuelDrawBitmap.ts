/**
 * Fuel Draw Bitmap Game
 *
 * Displays examples of fuel cells:
 * - Animated fuel cells that cycle through frames
 * - Empty fuel cells (not alive)
 * - Flash effect on random fuel cells
 */

import type { BitmapRenderer } from '../../bitmap'
import { drawFuels } from '../../planet/render/drawFuels'
import { configureStore } from '@reduxjs/toolkit'
import planetReducer, {
  loadPlanet,
  updateFuelAnimations
} from '@/planet/planetSlice'
import type { Fuel, PlanetState } from '@/planet/types'
import { isOnRightSide } from '@/shared/viewport'
import { FUELFRAMES } from '@/figs/types'
import type { SpriteServiceV2 } from '@/sprites/service'

// Create store with planet slice
const store = configureStore({
  reducer: {
    planet: planetReducer
  }
})

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Define a world larger than the viewport
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 1024

// Create initial planet state with fuels
const createInitialPlanetState = (): PlanetState => {
  const fuels: Fuel[] = [
    // Row of animated fuel cells
    { x: 300, y: 300, alive: true, currentfig: 0, figcount: 1 },
    { x: 350, y: 300, alive: true, currentfig: 1, figcount: 1 },
    { x: 400, y: 300, alive: true, currentfig: 2, figcount: 1 },
    { x: 450, y: 300, alive: true, currentfig: 3, figcount: 1 },
    { x: 500, y: 300, alive: true, currentfig: 4, figcount: 1 },
    { x: 550, y: 300, alive: true, currentfig: 5, figcount: 1 },

    // Row of empty fuel cells (not alive) - should use FUELFRAMES (8) as per Play.c:519
    { x: 300, y: 350, alive: false, currentfig: FUELFRAMES, figcount: 0 },
    { x: 350, y: 350, alive: false, currentfig: FUELFRAMES, figcount: 0 },
    { x: 400, y: 350, alive: false, currentfig: FUELFRAMES, figcount: 0 },
    { x: 450, y: 350, alive: false, currentfig: FUELFRAMES, figcount: 0 },

    // More animated fuel cells at different positions
    { x: 600, y: 400, alive: true, currentfig: 0, figcount: 1 },
    { x: 650, y: 450, alive: true, currentfig: 2, figcount: 1 },
    { x: 700, y: 500, alive: true, currentfig: 4, figcount: 1 },

    // Fuel cells near world edges to test wrapping
    { x: 50, y: 512, alive: true, currentfig: 0, figcount: 1 }, // Near left edge
    { x: WORLD_WIDTH - 50, y: 512, alive: true, currentfig: 0, figcount: 1 }, // Near right edge

    // Scattered fuel cells across the world
    { x: 200, y: 600, alive: true, currentfig: 1, figcount: 1 },
    { x: 800, y: 200, alive: true, currentfig: 3, figcount: 1 },
    { x: 512, y: 700, alive: true, currentfig: 5, figcount: 1 },
    { x: 100, y: 100, alive: true, currentfig: 0, figcount: 1 },
    { x: 900, y: 900, alive: true, currentfig: 2, figcount: 1 },

    // End marker (x >= 10000 indicates end of array)
    { x: 10000, y: 0, alive: false, currentfig: 0, figcount: 0 }
  ]

  return {
    worldwidth: WORLD_WIDTH,
    worldheight: WORLD_HEIGHT,
    worldwrap: true, // Enable wrapping to test the feature
    shootslow: 0,
    xstart: 512,
    ystart: 512,
    planetbonus: 0,
    gravx: 0,
    gravy: 0,
    numcraters: 0,
    lines: [],
    bunkers: [],
    fuels,
    craters: []
  }
}

// Viewport state - start centered
const viewportState = {
  x: (WORLD_WIDTH - 512) / 2, // Center horizontally (512 is default bitmap width)
  y: (WORLD_HEIGHT - 342) / 2 // Center vertically (342 is default bitmap height)
}

// Initialize game on module load
const initializeGame = (): void => {
  try {
    console.log(
      'Starting fuelDrawBitmap initialization...',
      'FUELFRAMES=',
      FUELFRAMES
    )

    // Initialize planet state with fuels
    console.log('Initializing planet state...')
    const planetState = createInitialPlanetState()
    console.log(
      'Empty fuel cells:',
      planetState.fuels
        .filter(f => !f.alive)
        .map(f => ({ x: f.x, y: f.y, currentfig: f.currentfig }))
    )
    store.dispatch(loadPlanet(planetState))
    // Don't call initializeFuels() - we want to keep our test fuel states as-is
    console.log('Planet state initialized')

    initializationComplete = true
    console.log('fuelDrawBitmap initialization complete')
  } catch (error) {
    console.error('Error initializing fuelDrawBitmap:', error)
    initializationError = error as Error
  }
}

// Start initialization
initializeGame()

/**
 * Factory function to create bitmap renderer for fuel drawing game
 */
export const createFuelDrawBitmapRenderer =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
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
        viewportState.x =
          ((viewportState.x % WORLD_WIDTH) + WORLD_WIDTH) % WORLD_WIDTH
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

    // Update fuel animation state using the reducer
    store.dispatch(updateFuelAnimations())

    // Draw all fuel cells using drawFuels
    const fuelSprites = {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      emptyCell: (() => {
        const empty = spriteService.getFuelSprite(8, { variant: 'def' })
        const emptyMask = spriteService.getFuelSprite(8, { variant: 'mask' })
        const emptyBg1 = spriteService.getFuelSprite(8, {
          variant: 'background1'
        })
        const emptyBg2 = spriteService.getFuelSprite(8, {
          variant: 'background2'
        })
        return {
          def: empty.uint8,
          mask: emptyMask.uint8,
          images: {
            background1: emptyBg1.uint8,
            background2: emptyBg2.uint8
          }
        }
      })(),
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      getFrame: (index: number) => {
        const def = spriteService.getFuelSprite(index, { variant: 'def' })
        const mask = spriteService.getFuelSprite(index, { variant: 'mask' })
        const bg1 = spriteService.getFuelSprite(index, {
          variant: 'background1'
        })
        const bg2 = spriteService.getFuelSprite(index, {
          variant: 'background2'
        })
        return {
          def: def.uint8,
          mask: mask.uint8,
          images: {
            background1: bg1.uint8,
            background2: bg2.uint8
          }
        }
      }
    }

    // Check if we're near the right edge for world wrapping
    const onRightSide = isOnRightSide(
      viewportState.x,
      bitmap.width,
      planetState.worldwidth,
      planetState.worldwrap
    )

    // Create the fuel drawing function with dependencies
    const drawFuelsFunc = drawFuels({
      fuels: planetState.fuels,
      scrnx: viewportState.x,
      scrny: viewportState.y,
      fuelSprites: fuelSprites
    })

    // Apply fuel drawing to the bitmap
    let renderedBitmap = drawFuelsFunc(bitmap)

    // Handle world wrapping - call drawFuels again with wrapped coordinates
    if (onRightSide) {
      const drawFuelsWrapped = drawFuels({
        fuels: planetState.fuels,
        scrnx: viewportState.x - planetState.worldwidth,
        scrny: viewportState.y,
        fuelSprites: fuelSprites
      })
      renderedBitmap = drawFuelsWrapped(renderedBitmap)
    }

    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)

    // Draw a position marker in corner to show viewport is updating
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const pixelX = 10 + i
        const pixelY = 10 + j
        if (pixelX < bitmap.width && pixelY < bitmap.height) {
          const byteIndex = Math.floor(pixelY * bitmap.rowBytes + pixelX / 8)
          const bitIndex = 7 - (pixelX % 8)
          bitmap.data[byteIndex]! |= 1 << bitIndex
        }
      }
    }
  }
