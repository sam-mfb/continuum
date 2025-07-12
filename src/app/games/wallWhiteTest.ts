/**
 * Test game for demonstrating the fastWhites() wall rendering function
 * Shows white shadow pieces for all 8 line directions
 */

import type { BitmapRenderer } from '../../bitmap'
import type { WhiteRec } from '../../walls/types'
import { fastWhites } from '../../walls/render/fastWhites'
import { NEW_TYPE } from '../../walls/constants'

// White pattern data from orig/Sources/Junctions.c:105-115
// These are 16-bit patterns, 6 rows each
const generictop = [0xFFFF, 0x3FFF, 0x0FFF, 0x03FF, 0x00FF, 0x007F]
const sbot = [0x803F, 0xC03F, 0xF03F, 0xFC3F, 0xFF3F, 0xFFFF]
const ssetop = [0xFFFF, 0xBFFF, 0xCFFF, 0xC3FF, 0xE0FF, 0xE03F]
const ssebot = [0x80FF, 0xC07F, 0xF07F, 0xFC3F, 0xFF3F, 0xFFFF]
const setop = [0xFFFF, 0xFFFF, 0xEFFF, 0xF3FF, 0xF8FF, 0xFC3F]
const sebot = [0x87FF, 0xC3FF, 0xF1FF, 0xFCFF, 0xFF7F, 0xFFFF]
const eseright = [0xFFFF, 0x3FFF, 0x8FFF, 0xE3FF, 0xF8FF, 0xFE7F]
const eleft = [0xFFFF, 0xFFFF, 0xF000, 0xFC00, 0xFF00, 0xFF80]
const eneleft = [0x8000, 0xC000, 0xF000, 0xFC01, 0xFF07, 0xFFDF]
const nebot = [0x8001, 0xC003, 0xF007, 0xFC0F, 0xFF1F, 0xFFFF]
const nnebot = [0x800F, 0xC01F, 0xF01F, 0xFC3F, 0xFF3F, 0xFFFF]

// Map from NEW_TYPE to white patterns for start/end of lines
// Based on whitepicts array from orig/Sources/Junctions.c:118-127
const whitePatterns: Record<number, { start: number[] | null; end: number[] | null }> = {
  [NEW_TYPE.S]: { start: generictop, end: sbot },
  [NEW_TYPE.SSE]: { start: ssetop, end: ssebot },
  [NEW_TYPE.SE]: { start: setop, end: sebot },
  [NEW_TYPE.ESE]: { start: null, end: eseright },
  [NEW_TYPE.E]: { start: eleft, end: generictop },
  [NEW_TYPE.ENE]: { start: eneleft, end: generictop },
  [NEW_TYPE.NE]: { start: nebot, end: generictop },
  [NEW_TYPE.NNE]: { start: nnebot, end: generictop }
}

// Direction names for display (unused for now, but useful for debugging)
// const directionNames: Record<number, string> = {
//   [NEW_TYPE.S]: 'S',
//   [NEW_TYPE.SSE]: 'SSE',
//   [NEW_TYPE.SE]: 'SE',
//   [NEW_TYPE.ESE]: 'ESE',
//   [NEW_TYPE.E]: 'E',
//   [NEW_TYPE.ENE]: 'ENE',
//   [NEW_TYPE.NE]: 'NE',
//   [NEW_TYPE.NNE]: 'NNE'
// }

/**
 * Creates sample white pieces for testing
 */
function createSampleWhites(): WhiteRec[] {
  const whites: WhiteRec[] = []
  
  // Test all 8 directional lines, 25 pixels long each
  const lineLength = 25
  const spacing = 80  // Space between lines
  
  // Helper function to add white pieces for a line type
  function addLineWhites(type: number, baseX: number, baseY: number) {
    const patterns = whitePatterns[type]
    if (!patterns) return
    
    // Calculate end position based on direction
    let endX = baseX
    let endY = baseY + lineLength
    
    switch (type) {
      case NEW_TYPE.S:
        // Straight down (already set above)
        break
      case NEW_TYPE.SSE:
        // 22.5 degrees from vertical
        endX = baseX + Math.round(lineLength * Math.sin(22.5 * Math.PI / 180))  // ~10 pixels
        endY = baseY + Math.round(lineLength * Math.cos(22.5 * Math.PI / 180))  // ~23 pixels
        break
      case NEW_TYPE.SE:
        // 45 degrees (diagonal)
        endX = baseX + Math.round(lineLength * Math.sin(45 * Math.PI / 180))  // ~18 pixels
        endY = baseY + Math.round(lineLength * Math.cos(45 * Math.PI / 180))  // ~18 pixels
        break
      case NEW_TYPE.ESE:
        // 67.5 degrees from vertical
        endX = baseX + Math.round(lineLength * Math.sin(67.5 * Math.PI / 180))  // ~23 pixels
        endY = baseY + Math.round(lineLength * Math.cos(67.5 * Math.PI / 180))  // ~10 pixels
        break
      case NEW_TYPE.E:
        // Horizontal (90 degrees)
        endX = baseX + lineLength
        endY = baseY
        break
      case NEW_TYPE.ENE:
        // 112.5 degrees from vertical (going up and right)
        endX = baseX + Math.round(lineLength * Math.sin(67.5 * Math.PI / 180))  // ~23 pixels
        endY = baseY - Math.round(lineLength * Math.cos(67.5 * Math.PI / 180))  // ~-10 pixels
        break
      case NEW_TYPE.NE:
        // 135 degrees from vertical (45 degrees going up)
        endX = baseX + Math.round(lineLength * Math.sin(45 * Math.PI / 180))  // ~18 pixels
        endY = baseY - Math.round(lineLength * Math.cos(45 * Math.PI / 180))  // ~-18 pixels
        break
      case NEW_TYPE.NNE:
        // 157.5 degrees from vertical
        endX = baseX + Math.round(lineLength * Math.sin(22.5 * Math.PI / 180))  // ~10 pixels
        endY = baseY - Math.round(lineLength * Math.cos(22.5 * Math.PI / 180))  // ~-23 pixels
        break
    }
    
    // Add white piece at start of line
    if (patterns.start) {
      const startData: number[] = []
      for (const word of patterns.start) {
        startData.push((word >>> 8) & 0xFF)  // High byte
        startData.push(word & 0xFF)          // Low byte
      }
      
      whites.push({
        id: `white_${type}_start`,
        x: baseX,
        y: baseY,
        hasj: false,
        ht: 6,
        data: startData
      })
    }
    
    // Add white piece at end of line
    if (patterns.end) {
      const endData: number[] = []
      for (const word of patterns.end) {
        endData.push((word >>> 8) & 0xFF)  // High byte
        endData.push(word & 0xFF)          // Low byte
      }
      
      whites.push({
        id: `white_${type}_end`,
        x: endX,
        y: endY,
        hasj: false,
        ht: 6,
        data: endData
      })
    }
  }
  
  // First row - downward directions
  const startX = 40
  const startY = 100
  
  // Add S line (vertical)
  addLineWhites(NEW_TYPE.S, startX, startY)
  
  // Add SSE line (22.5 degrees from vertical)
  addLineWhites(NEW_TYPE.SSE, startX + spacing, startY)
  
  // Add SE line (45 degrees diagonal)
  addLineWhites(NEW_TYPE.SE, startX + spacing * 2, startY)
  
  // Add ESE line (67.5 degrees from vertical)
  addLineWhites(NEW_TYPE.ESE, startX + spacing * 3, startY)
  
  // Second row - horizontal and upward directions
  const row2Y = startY + 80
  
  // Add E line (horizontal)
  addLineWhites(NEW_TYPE.E, startX, row2Y)
  
  // Add ENE line (112.5 degrees)
  addLineWhites(NEW_TYPE.ENE, startX + spacing, row2Y)
  
  // Add NE line (135 degrees - diagonal up)
  addLineWhites(NEW_TYPE.NE, startX + spacing * 2, row2Y)
  
  // Add NNE line (157.5 degrees)
  addLineWhites(NEW_TYPE.NNE, startX + spacing * 3, row2Y)

  // Add sentinel value (required by original algorithm)
  whites.push({
    id: 'white_sentinel',
    x: 20000,
    y: 0,
    hasj: false,
    ht: 0,
    data: []
  })

  return whites
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

  // Create sample white pieces
  const whites = createSampleWhites()

  // Set up viewport (static, centered)
  const viewport = {
    x: 0,
    y: 0,
    b: bitmap.height,  // bottom
    r: bitmap.width    // right
  }

  // Call fastWhites to render the white pieces
  const renderedBitmap = fastWhites(bitmap, {
    whites: whites,
    viewport: viewport,
    worldwidth: bitmap.width  // No wrapping needed for this test
  })

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)

  // Optional: Add labels for each direction
  // (This would require text rendering which isn't implemented yet)
}