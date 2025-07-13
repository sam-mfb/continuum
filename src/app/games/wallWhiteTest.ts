/**
 * Test game for demonstrating the fastWhites() wall rendering function
 * Shows white shadow pieces for all 8 line directions
 */

import type { BitmapRenderer } from '../../bitmap'
import type { LineRec } from '../../walls/types'
import { fastWhites } from '../../walls/render/fastWhites'
import { wallsActions } from '../../walls/wallsSlice'
import { buildGameStore } from './store'
import { LINE_TYPE, LINE_DIR, LINE_KIND, NEW_TYPE } from '../../walls/types'

// Create store instance
const store = buildGameStore()

// Test with examples of all 8 NEW_TYPE values, each 25px long and well-spaced
const sampleLines: LineRec[] = [
  // NEW_TYPE.S (1) - South (vertical down)
  {
    id: 'line-0',
    startx: 50,
    starty: 30,
    endx: 50,
    endy: 55,
    length: 25,
    type: LINE_TYPE.N,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.S,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.SSE (2) - South-Southeast
  {
    id: 'line-1',
    startx: 120,
    starty: 30,
    endx: 132,
    endy: 55,
    length: 25,
    type: LINE_TYPE.NNE,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.SSE,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.SE (3) - Southeast (diagonal down-right)
  {
    id: 'line-2',
    startx: 190,
    starty: 30,
    endx: 208,
    endy: 48,
    length: 25,
    type: LINE_TYPE.NE,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.SE,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.ESE (4) - East-Southeast
  {
    id: 'line-3',
    startx: 260,
    starty: 30,
    endx: 285,
    endy: 42,
    length: 25,
    type: LINE_TYPE.ENE,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.ESE,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.E (5) - East (horizontal right)
  {
    id: 'line-4',
    startx: 50,
    starty: 90,
    endx: 75,
    endy: 90,
    length: 25,
    type: LINE_TYPE.E,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.E,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.ENE (6) - East-Northeast
  {
    id: 'line-5',
    startx: 120,
    starty: 102,
    endx: 145,
    endy: 90,
    length: 25,
    type: LINE_TYPE.ENE,
    up_down: LINE_DIR.UP,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.ENE,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.NE (7) - Northeast (diagonal up-right)
  {
    id: 'line-6',
    startx: 190,
    starty: 108,
    endx: 208,
    endy: 90,
    length: 25,
    type: LINE_TYPE.NE,
    up_down: LINE_DIR.UP,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.NE,
    nextId: null,
    nextwhId: null
  },
  // NEW_TYPE.NNE (8) - North-Northeast
  {
    id: 'line-7',
    startx: 260,
    starty: 108,
    endx: 272,
    endy: 83,
    length: 25,
    type: LINE_TYPE.NNE,
    up_down: LINE_DIR.UP,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.NNE,
    nextId: null,
    nextwhId: null
  }
]

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sampleLines }))


/**
 * Renderer that displays white wall pieces using fastWhites
 */
export const wallWhiteTestRenderer: BitmapRenderer = (bitmap, _frame, _env) => {
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

  // Get whites from Redux state
  const whites = store.getState().walls.whites

  // Set up viewport (static, centered)
  const viewport = {
    x: 0,
    y: 0,
    b: bitmap.height, // bottom
    r: bitmap.width // right
  }

  // Call fastWhites to render the white pieces
  const renderedBitmap = fastWhites(bitmap, {
    whites: whites,
    viewport: viewport,
    worldwidth: bitmap.width // No wrapping needed for this test
  })

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)

  // Optional: Add labels for each direction
  // (This would require text rendering which isn't implemented yet)
}
