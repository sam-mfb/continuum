/**
 * Wall Drawing
 *
 * Test game for demonstrating complete wall rendering with both whiteTerrain() and blackTerrain()
 * Shows both black tops and white undersides for all 8 line directions plus junction handling
 */

import type { BitmapRenderer } from '../../bitmap'
import type { LineRec } from '../../walls/types'
import { whiteTerrain, blackTerrain } from '../../walls/render'
import { wallsActions } from '../../walls/wallsSlice'
import { buildGameStore } from './store'
import { LINE_KIND, NEW_TYPE } from '../../walls/types'
import { createWall } from '../../walls/unpack'

// Create store instance
const store = buildGameStore()

// Test with examples of all 8 NEW_TYPE values, each 25px long and well-spaced
// Using createWall function to ensure proper unpacking and endpoint calculation
const sampleLines: LineRec[] = [
  // NEW_TYPE.S (1) - South (vertical down)
  createWall(50, 30, 25, NEW_TYPE.S, LINE_KIND.NORMAL, 0),
  // NEW_TYPE.SSE (2) - South-Southeast
  createWall(120, 30, 25, NEW_TYPE.SSE, LINE_KIND.NORMAL, 1),
  // NEW_TYPE.SE (3) - Southeast (diagonal down-right)
  createWall(190, 30, 25, NEW_TYPE.SE, LINE_KIND.NORMAL, 2),
  // NEW_TYPE.ESE (4) - East-Southeast
  createWall(260, 30, 25, NEW_TYPE.ESE, LINE_KIND.NORMAL, 3),
  // NEW_TYPE.E (5) - East (horizontal right)
  createWall(50, 90, 25, NEW_TYPE.E, LINE_KIND.NORMAL, 4),
  // NEW_TYPE.ENE (6) - East-Northeast
  createWall(120, 102, 25, NEW_TYPE.ENE, LINE_KIND.NORMAL, 5),
  // NEW_TYPE.NE (7) - Northeast (diagonal up-right)
  createWall(190, 108, 25, NEW_TYPE.NE, LINE_KIND.NORMAL, 6),
  // NEW_TYPE.NNE (8) - North-Northeast
  createWall(260, 108, 25, NEW_TYPE.NNE, LINE_KIND.NORMAL, 7)
]

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sampleLines }))

/**
 * Renderer that displays complete walls using both blackTerrain and whiteTerrain
 */
export const wallDrawingRenderer: BitmapRenderer = (bitmap, _frame, _env) => {
  // First, create a crosshatch gray background (same as bitmapTest)
  // This gives us a pattern to see the white pieces against
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Set pixel if x + y is even (creates checkerboard)
      if ((x + y) % 2 === 0) {
        const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
        const bitIndex = 7 - (x % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }

  // Get wall data from Redux state
  const wallState = store.getState().walls

  // Set up viewport (static, centered)
  const viewport = {
    x: 0,
    y: 0,
    b: bitmap.height, // bottom
    r: bitmap.width // right
  }

  // First render white terrain (undersides, patches, junctions) on top
  let renderedBitmap = whiteTerrain({
    whites: wallState.whites,
    junctions: wallState.junctions,
    firstWhite: wallState.firstWhite,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: bitmap.width // No wrapping needed for this test
  })(bitmap)

  // Then render black terrain (top surfaces) for normal lines
  renderedBitmap = blackTerrain({
    thekind: LINE_KIND.NORMAL, // Draw only normal lines
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: bitmap.width // No wrapping needed for this test
  })(renderedBitmap)

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)

  // Note: This complete render shows:
  // - Black tops of all walls (from blackTerrain)
  // - White undersides/shadows (from whiteTerrain)
  // - Junction hashes if any walls intersect
  // - NNE wall white undersides
}

