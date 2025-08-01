/**
 * Planet 3 Drawing
 *
 * Loads the release galaxy and renders planet 3's walls with complete wall rendering
 * Shows both black tops and white undersides for all wall types
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer } from '../../bitmap'
import type { PlanetState } from '../../planet/types'
import { whiteTerrain, blackTerrain } from '../../walls/render'
import { wallsActions } from '../../walls/wallsSlice'
import { buildGameStore } from './store'
import { LINE_KIND } from '../../walls/types'
import { Galaxy } from '../../galaxy/methods'
import { parsePlanet } from '../../planet/parsePlanet'
import { VIEWHT } from '../../screen/constants'

// Create store instance
const store = buildGameStore()

// Module-level promise for loading planet 3 data
let planet3DataPromise: Promise<PlanetState> | null = null

/**
 * Load planet 3 from the release galaxy
 */
async function loadPlanet3(): Promise<PlanetState> {
  try {
    // Load release galaxy file
    const response = await fetch('/src/assets/release_galaxy.bin')
    if (!response.ok) {
      throw new Error(`Failed to load galaxy: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()

    // Parse galaxy structure
    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
    const galaxyHeader = Galaxy.parseHeader(headerBuffer)

    // Validate planet 3 exists
    if (galaxyHeader.planets < 3) {
      throw new Error('Galaxy does not contain planet 3')
    }

    // Extract planet 3 (1-indexed in parsePlanet)
    const planet3 = parsePlanet(planetsBuffer, galaxyHeader.indexes, 3)

    // Initialize walls in Redux store
    store.dispatch(wallsActions.initWalls({ walls: planet3.lines }))

    return planet3
  } catch (error) {
    console.error('Failed to load planet 3:', error)
    throw error
  }
}

// Viewport state
let viewportState = {
  x: 0,
  y: 0,
  initialized: false
}

// Planet data cache
let cachedPlanet: PlanetState | null = null

/**
 * Renderer that displays planet 3's walls using both blackTerrain and whiteTerrain
 */
export const planet3DrawingRenderer: BitmapRenderer = (bitmap, frame, _env) => {
  // Initialize planet loading on first render
  if (!planet3DataPromise) {
    planet3DataPromise = loadPlanet3()
  }

  // Check if planet data is ready
  if (!cachedPlanet) {
    planet3DataPromise
      .then(planet => {
        cachedPlanet = planet
        // Initialize viewport to planet's starting position
        if (!viewportState.initialized) {
          viewportState.x = Math.max(0, planet.xstart - bitmap.width / 2)
          viewportState.y = Math.max(0, planet.ystart - VIEWHT / 2)
          viewportState.initialized = true
        }
      })
      .catch(error => {
        console.error('Error loading planet:', error)
      })

    // Show loading state
    bitmap.data.fill(0)
    return
  }

  const planet = cachedPlanet

  // Handle keyboard input for viewport movement
  const moveSpeed = 5
  if (frame.keysDown.has('ArrowUp')) {
    viewportState.y = Math.max(0, viewportState.y - moveSpeed)
  }
  if (frame.keysDown.has('ArrowDown')) {
    viewportState.y = Math.min(
      planet.worldheight - VIEWHT,
      viewportState.y + moveSpeed
    )
  }
  if (frame.keysDown.has('ArrowLeft')) {
    viewportState.x = Math.max(0, viewportState.x - moveSpeed)
  }
  if (frame.keysDown.has('ArrowRight')) {
    viewportState.x = Math.min(
      planet.worldwidth - bitmap.width,
      viewportState.x + moveSpeed
    )
  }

  // First, create a crosshatch gray background
  // Pattern must be based on world coordinates, not screen coordinates
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

  // Get wall data from Redux state
  const wallState = store.getState().walls

  // Set up viewport based on state
  const viewport = {
    x: viewportState.x,
    y: viewportState.y,
    b: viewportState.y + bitmap.height, // bottom
    r: viewportState.x + bitmap.width // right
  }

  // First render white terrain (undersides, patches, junctions)
  let renderedBitmap = whiteTerrain({
    whites: wallState.whites,
    junctions: wallState.junctions,
    firstWhite: wallState.firstWhite,
    organizedWalls: wallState.organizedWalls,
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
      kindPointers: wallState.kindPointers,
      organizedWalls: wallState.organizedWalls,
      viewport: viewport,
      worldwidth: planet.worldwidth
    })(renderedBitmap)
  }

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}
