/**
 * Simple test game for debugging - renders a single 50px South line
 */

import type { BitmapRenderer } from '../../bitmap'
import type { LineRec } from '../../walls/types'
import { whiteTerrain, blackTerrain } from '../../walls/render'
import { wallsActions } from '../../walls/wallsSlice'
import { buildGameStore } from './store'
import { LINE_TYPE, LINE_DIR, LINE_KIND, NEW_TYPE } from '../../walls/types'

// Create store instance
const store = buildGameStore()

// Single 50px South line
const singleLine: LineRec[] = [
  {
    id: 'test-line',
    startx: 200,
    starty: 100,
    endx: 200,
    endy: 150,
    length: 50,
    type: LINE_TYPE.N,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.S,
    nextId: null,
    nextwhId: null
  }
]

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: singleLine }))

/**
 * Renderer that displays a single line for testing
 */
export const singleLineTestRenderer: BitmapRenderer = (bitmap, _frame, _env) => {
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

  // Set up viewport
  const viewport = {
    x: 0,
    y: 0,
    b: bitmap.height,
    r: bitmap.width
  }

  // First render white terrain (undersides)
  let renderedBitmap = whiteTerrain(bitmap, {
    whites: wallState.whites,
    junctions: wallState.junctions,
    firstWhite: wallState.firstWhite,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: bitmap.width
  })

  // Then render black terrain (top surfaces)
  renderedBitmap = blackTerrain(renderedBitmap, {
    thekind: LINE_KIND.NORMAL,
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: bitmap.width
  })

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)
}