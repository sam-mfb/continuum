/**
 * Wall Drawing
 *
 * Test game for demonstrating complete wall rendering with both whiteTerrain() and blackTerrain()
 * Shows both black tops and white undersides for all 8 line directions plus junction handling
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer } from '@lib/bitmap'
import type { LineRec } from '@core/walls/types'
import { whiteTerrain, blackTerrain } from '@core/walls/render'
import { wallsActions } from '@core/walls/wallsSlice'
import { buildGameStore } from '@dev/store/gameStore'
import { LINE_KIND, NEW_TYPE } from '@core/walls/types'
import { createWall } from '@core/walls/unpack'
import { viewClear } from '@core/screen/render'

// Create store instance
const store = buildGameStore()

// Define a world larger than the viewport
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 768

// Test with examples of all 8 NEW_TYPE values, each 25px long and well-spaced
// Using createWall function to ensure proper unpacking and endpoint calculation
const sampleLines: LineRec[] = [
  // NEW_TYPE.S (1) - South (vertical down)
  createWall(50, 30, 25, NEW_TYPE.S, LINE_KIND.NORMAL, 0),
  // NEW_TYPE.E (5) - East (horizontal right)
  createWall(50, 90, 25, NEW_TYPE.E, LINE_KIND.NORMAL, 4),
  // NEW_TYPE.SSE (2) - South-Southeast
  createWall(120, 30, 25, NEW_TYPE.SSE, LINE_KIND.NORMAL, 1),
  // NEW_TYPE.ENE (6) - East-Northeast
  createWall(120, 102, 25, NEW_TYPE.ENE, LINE_KIND.NORMAL, 5),
  // NEW_TYPE.SE (3) - Southeast (diagonal down-right)
  createWall(190, 30, 25, NEW_TYPE.SE, LINE_KIND.NORMAL, 2),
  // NEW_TYPE.NE (7) - Northeast (diagonal up-right)
  createWall(190, 108, 25, NEW_TYPE.NE, LINE_KIND.NORMAL, 6),
  createWall(191, 188, 55, NEW_TYPE.NE, LINE_KIND.NORMAL, 9),
  createWall(228, 168, 35, NEW_TYPE.NNE, LINE_KIND.NORMAL, 8),
  // NEW_TYPE.ESE (4) - East-Southeast
  createWall(260, 30, 25, NEW_TYPE.ESE, LINE_KIND.NORMAL, 3),
  // NEW_TYPE.NNE (8) - North-Northeast
  createWall(260, 108, 25, NEW_TYPE.NNE, LINE_KIND.NORMAL, 7)
]

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sampleLines }))

// Viewport state
const viewportState = {
  x: 0,
  y: 0
}

/**
 * Renderer that displays complete walls using both blackTerrain and whiteTerrain
 */
export const wallDrawingRenderer: BitmapRenderer = (bitmap, frame, _env) => {
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
  const clearedBitmap = viewClear({
    screenX: viewportState.x,
    screenY: viewportState.y
  })(bitmap)
  bitmap.data.set(clearedBitmap.data)

  // Get wall data from Redux state
  const wallState = store.getState().walls

  // Set up viewport based on state
  const viewport = {
    x: viewportState.x,
    y: viewportState.y,
    b: viewportState.y + bitmap.height, // bottom
    r: viewportState.x + bitmap.width // right
  }

  // First render white terrain (undersides, patches, junctions) on top
  let renderedBitmap = whiteTerrain({
    whites: wallState.whites,
    junctions: wallState.junctions,
    firstWhite: wallState.firstWhite,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(bitmap)

  // Then render black terrain (top surfaces) for normal lines
  renderedBitmap = blackTerrain({
    thekind: LINE_KIND.NORMAL, // Draw only normal lines
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(renderedBitmap)

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)

  // Note: This complete render shows:
  // - Black tops of all walls (from blackTerrain)
  // - White undersides/shadows (from whiteTerrain)
  // - Junction hashes if any walls intersect
  // - NNE wall white undersides
}
