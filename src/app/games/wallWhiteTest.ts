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

// Test with just a single S line (vertical down)
const sampleLines: LineRec[] = [
  {
    id: 'line-0',
    startx: 100,
    starty: 50,
    endx: 100,
    endy: 150,
    length: 100,
    type: LINE_TYPE.N,
    up_down: LINE_DIR.DN,
    kind: LINE_KIND.NORMAL,
    newtype: NEW_TYPE.S,
    nextId: null,
    nextwhId: null
  }
]

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sampleLines }))

/**
 * Converts 16-bit integer array to byte array format expected by rendering
 * Each 16-bit value becomes two bytes: high byte, then low byte
 */
function convertWhiteData(data: number[]): number[] {
  const bytes: number[] = []
  for (const word of data) {
    bytes.push((word >>> 8) & 0xff) // High byte
    bytes.push(word & 0xff) // Low byte
  }
  return bytes
}


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

  // Get whites from Redux state and convert data format
  const stateWhites = store.getState().walls.whites
  const whites = stateWhites.map(white => ({
    ...white,
    data: convertWhiteData(white.data)
  }))

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
