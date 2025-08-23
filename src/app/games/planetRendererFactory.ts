/**
 * Planet Renderer Factory
 *
 * Creates planet-specific bitmap renderers using the game rendering approach
 */

import type { PlanetRendererFactory, GameRendererStore } from './types'
import type { PlanetState } from '../../planet/types'
import type { BitmapRenderer } from '../../bitmap'
import { whiteTerrain, blackTerrain } from '../../walls/render'
import { wallsActions } from '../../walls/wallsSlice'
import { screenSlice } from '../../screen/screenSlice'
import { gameViewActions } from '../../store/gameViewSlice'
import { LINE_KIND } from '../../walls/types'
import { VIEWHT } from '../../screen/constants'
import { isOnRightSide } from '@/shared/viewport'
import { doBunks } from '@/planet/render/bunker'
import { configureStore } from '@reduxjs/toolkit'
import planetReducer, {
  loadPlanet,
  updateBunkerRotations,
  initializeFuels,
  updateFuelAnimations
} from '@/planet/planetSlice'
import { drawFuels } from '@/planet/render/drawFuels'
import { drawCraters } from '@/planet/render/drawCraters'

// Create store with planet slice
const bunkerStore = configureStore({
  reducer: {
    planet: planetReducer
  }
})

/**
 * Creates a bitmap renderer for a specific planet
 */
export const createPlanetRenderer: PlanetRendererFactory = (
  planet: PlanetState,
  store: GameRendererStore,
  spriteService
): BitmapRenderer => {
  // Initialize walls for this planet
  store.dispatch(wallsActions.initWalls({ walls: planet.lines }))

  // Load planet data into bunker store
  bunkerStore.dispatch(loadPlanet(planet))

  // Initialize fuels with random animation states
  bunkerStore.dispatch(initializeFuels())

  // Initialize viewport to planet's starting position
  // Note: bitmap dimensions are 512x342, but viewable area is 512x318 (VIEWHT)
  const bitmapWidth = 512

  // Apply constraints based on whether planet wraps
  let initialX = planet.xstart - bitmapWidth / 2

  if (planet.worldwrap) {
    // For circular planets: ensure X is properly wrapped
    initialX =
      ((initialX % planet.worldwidth) + planet.worldwidth) % planet.worldwidth
  } else {
    // For non-circular planets: clamp X to world boundaries
    initialX = Math.max(0, Math.min(planet.worldwidth - bitmapWidth, initialX))
  }
  const initialY = Math.max(
    0,
    Math.min(planet.worldheight - VIEWHT, planet.ystart - VIEWHT / 2)
  )

  store.dispatch(screenSlice.actions.setPosition({ x: initialX, y: initialY }))
  store.dispatch(gameViewActions.setInitialized())

  // Return the renderer function
  const renderer: BitmapRenderer = (bitmap, frame, _env) => {
    const state = store.getState()
    const { walls, gameView, screen } = state

    // If viewport is not initialized, ensure we use the initial viewport
    if (!gameView.initialized) {
      store.dispatch(
        screenSlice.actions.setPosition({ x: initialX, y: initialY })
      )
      store.dispatch(gameViewActions.setInitialized())
      return // Skip this frame to avoid jump
    }

    // Handle keyboard input for viewport movement
    const moveSpeed = 5
    let dx = 0
    let dy = 0

    if (frame.keysDown.has('ArrowUp')) {
      dy = -moveSpeed
    }
    if (frame.keysDown.has('ArrowDown')) {
      dy = moveSpeed
    }
    if (frame.keysDown.has('ArrowLeft')) {
      dx = -moveSpeed
    }
    if (frame.keysDown.has('ArrowRight')) {
      dx = moveSpeed
    }

    // Update viewport if there's movement
    if (dx !== 0 || dy !== 0) {
      let newX = screen.screenx + dx
      let newY = screen.screeny + dy

      if (planet.worldwrap) {
        // For circular planets: wrap X coordinate
        newX =
          ((newX % planet.worldwidth) + planet.worldwidth) % planet.worldwidth
      } else {
        // For non-circular planets: clamp X to world boundaries
        newX = Math.max(0, Math.min(planet.worldwidth - bitmap.width, newX))
      }

      // Always clamp Y for all planets (no vertical wrapping)
      // Use VIEWHT instead of bitmap.height to account for status bar
      newY = Math.max(0, Math.min(planet.worldheight - VIEWHT, newY))

      store.dispatch(screenSlice.actions.setPosition({ x: newX, y: newY }))
    }

    // Get updated viewport after potential movement
    const currentScreen = store.getState().screen

    // Create crosshatch gray background
    // Pattern must be based on world coordinates, not screen coordinates
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        // Calculate world position
        let worldX = x + currentScreen.screenx
        const worldY = y + currentScreen.screeny

        // Normalize worldX for wrapping worlds to ensure consistent pattern
        if (planet.worldwrap) {
          worldX =
            ((worldX % planet.worldwidth) + planet.worldwidth) %
            planet.worldwidth
        }

        // Set pixel if worldX + worldY is even (creates fixed checkerboard)
        if ((worldX + worldY) % 2 === 0) {
          const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
          const bitIndex = 7 - (x % 8)
          bitmap.data[byteIndex]! |= 1 << bitIndex
        }
      }
    }

    // Set up viewport for rendering
    const viewport = {
      x: currentScreen.screenx,
      y: currentScreen.screeny,
      b: currentScreen.screeny + bitmap.height, // bottom
      r: currentScreen.screenx + bitmap.width // right
    }

    // First render white terrain (undersides, patches, junctions)
    let renderedBitmap = whiteTerrain({
      whites: walls.whites,
      junctions: walls.junctions,
      firstWhite: walls.firstWhite,
      organizedWalls: walls.organizedWalls,
      viewport: viewport,
      worldwidth: planet.worldwidth
    })(bitmap)

    // Then render black terrain (top surfaces) for each wall type
    // Render in order: NORMAL, BOUNCE, GHOST, XPLODE
    const wallKinds = [
      LINE_KIND.NORMAL,
      LINE_KIND.BOUNCE,
      LINE_KIND.GHOST,
      LINE_KIND.EXPLODE
    ]

    for (const kind of wallKinds) {
      renderedBitmap = blackTerrain({
        thekind: kind,
        kindPointers: walls.kindPointers,
        organizedWalls: walls.organizedWalls,
        viewport: viewport,
        worldwidth: planet.worldwidth
      })(renderedBitmap)
    }

    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)

    // Draw bunkers and other sprites
    {
      // Update bunker rotations for animated bunkers
      // Use planet center as a mock ship position for FOLLOW bunkers
      const globalx = currentScreen.screenx + bitmap.width / 2
      const globaly = currentScreen.screeny + bitmap.height / 2
      bunkerStore.dispatch(updateBunkerRotations({ globalx, globaly }))

      // Get updated planet state with rotated bunkers
      const planetState = bunkerStore.getState().planet

      // Draw bunkers at normal position
      let bunkerBitmap = doBunks({
        bunkrec: planetState.bunkers,
        scrnx: currentScreen.screenx,
        scrny: currentScreen.screeny,
        getSprite: (kind, rotation) =>
          spriteService.getBunkerSprite(kind, rotation)
      })(bitmap)

      // If wrapping world and near right edge, draw wrapped bunkers
      const onRightSide = isOnRightSide(
        currentScreen.screenx,
        bitmap.width,
        planet.worldwidth,
        planet.worldwrap
      )

      if (onRightSide) {
        bunkerBitmap = doBunks({
          bunkrec: planetState.bunkers,
          scrnx: currentScreen.screenx - planet.worldwidth,
          scrny: currentScreen.screeny,
          getSprite: (kind, rotation) =>
            spriteService.getBunkerSprite(kind, rotation)
        })(bunkerBitmap) // Pass already-rendered bitmap
      }

      // Copy bunker bitmap data back to original
      bitmap.data.set(bunkerBitmap.data)

      // Update fuel cell animations
      bunkerStore.dispatch(updateFuelAnimations())

      // Get updated planet state with animated fuels
      const updatedPlanetState = bunkerStore.getState().planet

      // Draw fuels at normal position
      let fuelBitmap = drawFuels({
        fuels: updatedPlanetState.fuels,
        scrnx: currentScreen.screenx,
        scrny: currentScreen.screeny,
        fuelSprites: {
          emptyCell: spriteService.getFuelSprite(8),
          getFrame: (index: number) => spriteService.getFuelSprite(index)
        }
      })(bitmap)

      // If wrapping world and near right edge, draw wrapped fuels
      if (onRightSide) {
        fuelBitmap = drawFuels({
          fuels: updatedPlanetState.fuels,
          scrnx: currentScreen.screenx - planet.worldwidth,
          scrny: currentScreen.screeny,
          fuelSprites: {
            emptyCell: spriteService.getFuelSprite(8),
            getFrame: (index: number) => spriteService.getFuelSprite(index)
          }
        })(fuelBitmap)
      }

      // Copy fuel bitmap data back to original
      bitmap.data.set(fuelBitmap.data)

      // Draw craters (world wrapping is handled internally by drawCraters)
      const craterBitmap = drawCraters({
        craters: updatedPlanetState.craters,
        numcraters: updatedPlanetState.numcraters,
        scrnx: currentScreen.screenx,
        scrny: currentScreen.screeny,
        worldwidth: planet.worldwidth,
        on_right_side: onRightSide,
        craterImages: spriteService.getCraterSprite().images
      })(bitmap)

      // Copy crater bitmap data back to original
      bitmap.data.set(craterBitmap.data)
    }
  }

  return renderer
}
