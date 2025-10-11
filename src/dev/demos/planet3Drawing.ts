/**
 * Planet 3 Drawing
 *
 * Loads the release galaxy and renders planet 3's walls with complete wall rendering
 * Shows both black tops and white undersides for all wall types
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer, FrameInfo, KeyInfo } from '@lib/bitmap'
import { createGameBitmap } from '@lib/bitmap'
import type { PlanetState } from '@core/planet'
import { whiteTerrain, blackTerrain } from '@core/walls/render'
import { wallsActions } from '@core/walls'
import { buildGameStore } from '@dev/store'
import { LINE_KIND } from '@core/walls'
import { Galaxy } from '@core/galaxy'
import { parsePlanet } from '@core/planet'
import { VIEWHT } from '@core/screen'
import { viewClear } from '@render/screen'
import { ASSET_PATHS } from '@/dev/constants'

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
    const response = await fetch(ASSET_PATHS.GALAXY_DATA)
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
export const planet3DrawingRenderer: BitmapRenderer = (
  _frame: FrameInfo,
  keys: KeyInfo
) => {
  const bitmap = createGameBitmap()
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
    const loadingBitmap = { ...bitmap }
    loadingBitmap.data.fill(0)
    return loadingBitmap
  }

  const planet = cachedPlanet

  // Handle keyboard input for viewport movement
  const moveSpeed = 5
  if (keys.keysDown.has('ArrowUp')) {
    viewportState.y = Math.max(0, viewportState.y - moveSpeed)
  }
  if (keys.keysDown.has('ArrowDown')) {
    viewportState.y = Math.min(
      planet.worldheight - VIEWHT,
      viewportState.y + moveSpeed
    )
  }
  if (keys.keysDown.has('ArrowLeft')) {
    viewportState.x = Math.max(0, viewportState.x - moveSpeed)
  }
  if (keys.keysDown.has('ArrowRight')) {
    viewportState.x = Math.min(
      planet.worldwidth - bitmap.width,
      viewportState.x + moveSpeed
    )
  }

  // First, create a crosshatch gray background
  let resultBitmap = viewClear({
    screenX: viewportState.x,
    screenY: viewportState.y
  })(bitmap)

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
  resultBitmap = whiteTerrain({
    whites: wallState.whites,
    junctions: wallState.junctions,
    firstWhite: wallState.firstWhite,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: planet.worldwidth
  })(resultBitmap)

  // Then render black terrain (top surfaces) for each wall type
  // Render in order: NORMAL, BOUNCE, GHOST, XPLODE
  const wallKinds = [
    LINE_KIND.NORMAL,
    LINE_KIND.BOUNCE,
    LINE_KIND.GHOST,
    LINE_KIND.EXPLODE
  ]

  for (const kind of wallKinds) {
    resultBitmap = blackTerrain({
      thekind: kind,
      kindPointers: wallState.kindPointers,
      organizedWalls: wallState.organizedWalls,
      viewport: viewport,
      worldwidth: planet.worldwidth
    })(resultBitmap)
  }

  return resultBitmap
}
