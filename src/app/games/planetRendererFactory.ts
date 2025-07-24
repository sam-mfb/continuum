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
import { gameViewActions } from '../../store/gameViewSlice'
import { LINE_KIND } from '../../walls/types'
import { VIEWHT } from '../../screen/constants'

/**
 * Creates a bitmap renderer for a specific planet
 */
export const createPlanetRenderer: PlanetRendererFactory = (
  planet: PlanetState,
  store: GameRendererStore
): BitmapRenderer => {
  // Initialize walls for this planet
  store.dispatch(wallsActions.initWalls({ walls: planet.lines }))

  // Initialize viewport to planet's starting position
  // Note: bitmap dimensions are 512x342, but viewable area is 512x318 (VIEWHT)
  const bitmapWidth = 512

  // Apply constraints based on whether planet wraps
  const initialViewport = {
    x: planet.worldwrap
      ? planet.xstart - bitmapWidth / 2 // No X constraints for circular planets
      : Math.max(
          0,
          Math.min(
            planet.worldwidth - bitmapWidth,
            planet.xstart - bitmapWidth / 2
          )
        ),
    y: Math.max(
      0,
      Math.min(planet.worldheight - VIEWHT, planet.ystart - VIEWHT / 2)
    )
  }
  store.dispatch(gameViewActions.setViewport(initialViewport))

  // Return the renderer function
  const renderer: BitmapRenderer = (bitmap, frame, _env) => {
    const state = store.getState()
    const { walls, gameView } = state

    // If viewport is not initialized, ensure we use the initial viewport
    if (!gameView.initialized) {
      store.dispatch(gameViewActions.setViewport(initialViewport))
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
      let newX = gameView.viewport.x + dx
      let newY = gameView.viewport.y + dy

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

      store.dispatch(gameViewActions.setViewport({ x: newX, y: newY }))
    }

    // Get updated viewport after potential movement
    const currentViewport = store.getState().gameView.viewport

    // Create crosshatch gray background
    // Pattern must be based on world coordinates, not screen coordinates
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        // Calculate world position
        const worldX = x + currentViewport.x
        const worldY = y + currentViewport.y
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
      x: currentViewport.x,
      y: currentViewport.y,
      b: currentViewport.y + bitmap.height, // bottom
      r: currentViewport.x + bitmap.width // right
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
  }

  return renderer
}
