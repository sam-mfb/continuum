/**
 * Test game for demonstrating complete wall rendering with both whiteTerrain() and blackTerrain()
 * Shows both black tops and white undersides for all 8 line directions plus junction handling
 */

import type { BitmapRenderer } from '../../bitmap'
import type { LineRec } from '../../walls/types'
import { whiteTerrain, blackTerrain } from '../../walls/render'
import { wallsActions } from '../../walls/wallsSlice'
import { buildGameStore } from './store'
import { LINE_KIND } from '../../walls/types'
import { createLine } from '../../walls/createLine'
import { packLine } from '../../walls/packLine'
import { unpackLine } from '../../walls/unpackLine'
import { LINE_KIND as LineKind } from '../../shared/types/line'

// Create store instance
const store = buildGameStore()

// Generate walls using the complete flow: create -> pack -> unpack
// This demonstrates the full editor -> save -> load cycle

// Create examples of all 8 directions with desired endpoints
const wallSpecs = [
  // South (vertical down)
  { x1: 50, y1: 30, x2: 50, y2: 55 },
  // South-Southeast 
  { x1: 120, y1: 30, x2: 132, y2: 55 },
  // Southeast (diagonal down-right)
  { x1: 190, y1: 30, x2: 208, y2: 48 },
  // East-Southeast
  { x1: 260, y1: 30, x2: 285, y2: 42 },
  // East (horizontal right)
  { x1: 50, y1: 90, x2: 75, y2: 90 },
  // East-Northeast
  { x1: 120, y1: 102, x2: 145, y2: 90 },
  // Northeast (diagonal up-right)
  { x1: 190, y1: 108, x2: 208, y2: 90 },
  // North-Northeast
  { x1: 260, y1: 108, x2: 272, y2: 83 }
]

// Process lines through the complete flow
const sampleLines: LineRec[] = wallSpecs
  .map((spec, index) => {
    // Step 1: Create line (editor logic)
    const created = createLine(spec.x1, spec.y1, spec.x2, spec.y2, {
      kind: LineKind.NORMAL,
      safeMode: false,
      worldWidth: 512,
      worldHeight: 318
    })
    
    if (!created) return null
    
    // Step 2: Pack line (save to file format)
    const packed = packLine(created)
    
    // Step 3: Unpack line (load from file format)
    const unpacked = unpackLine(packed, `line-${index}`)
    
    return unpacked
  })
  .filter((line): line is LineRec => line !== null)

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sampleLines }))

/**
 * Renderer that displays complete walls using both blackTerrain and whiteTerrain
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
