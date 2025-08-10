/**
 * Strafe Test Bitmap Game
 *
 * Test game for demonstrating strafe rendering on walls at different orientations.
 * Creates walls at various angles and draws strafes on them to test the drawStrafe function.
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer } from '../../bitmap'
import type { LineRec } from '../../walls/types'
import { whiteTerrain, blackTerrain } from '../../walls/render'
import { drawStrafe } from '../../shots/render/drawStrafe'
import { wallsActions } from '../../walls/wallsSlice'
import { buildGameStore } from './store'
import { LINE_KIND, NEW_TYPE } from '../../walls/types'
import { createWall } from '../../walls/unpack'

// Create store instance
const store = buildGameStore()

// Define a world larger than the viewport
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 768

// Create walls at different orientations with strafes positioned on them
// Each wall will have a strafe at its midpoint
const sampleLines: LineRec[] = [
  // Vertical wall (South)
  createWall(100, 100, 50, NEW_TYPE.S, LINE_KIND.NORMAL, 0),
  
  // Horizontal wall (East)
  createWall(200, 100, 50, NEW_TYPE.E, LINE_KIND.NORMAL, 1),
  
  // Diagonal walls
  createWall(300, 100, 50, NEW_TYPE.SE, LINE_KIND.NORMAL, 2),
  createWall(400, 100, 50, NEW_TYPE.NE, LINE_KIND.NORMAL, 3),
  
  // Shallow angle walls
  createWall(100, 200, 50, NEW_TYPE.SSE, LINE_KIND.NORMAL, 4),
  createWall(200, 200, 50, NEW_TYPE.ENE, LINE_KIND.NORMAL, 5),
  createWall(300, 200, 50, NEW_TYPE.ESE, LINE_KIND.NORMAL, 6),
  createWall(400, 200, 50, NEW_TYPE.NNE, LINE_KIND.NORMAL, 7),
  
  // Bounce walls at different angles to test bounce strafes
  createWall(100, 350, 50, NEW_TYPE.S, LINE_KIND.BOUNCE, 8),
  createWall(200, 350, 50, NEW_TYPE.E, LINE_KIND.BOUNCE, 9),
  createWall(300, 350, 50, NEW_TYPE.SE, LINE_KIND.BOUNCE, 10),
  createWall(400, 350, 50, NEW_TYPE.NE, LINE_KIND.BOUNCE, 11),
]

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sampleLines }))

// Viewport state
const viewportState = {
  x: 0,
  y: 0
}

// Define strafe positions and rotations for each wall
// We'll place a strafe at approximately the midpoint of each wall
interface StrafeInfo {
  x: number
  y: number
  rot: number // 0-15 for the 16 directional sprites
}

// Calculate strafe positions based on wall types
const strafes: StrafeInfo[] = [
  // Vertical wall (S) - strafe from left (rot=4) or right (rot=12)
  { x: 100, y: 125, rot: 4 },
  
  // Horizontal wall (E) - strafe from above (rot=0) or below (rot=8)
  { x: 225, y: 100, rot: 8 },
  
  // SE diagonal - strafe perpendicular to wall
  { x: 318, y: 118, rot: 6 },
  
  // NE diagonal - strafe perpendicular to wall
  { x: 418, y: 82, rot: 10 },
  
  // SSE wall - angled strafe
  { x: 106, y: 225, rot: 5 },
  
  // ENE wall - angled strafe
  { x: 225, y: 194, rot: 9 },
  
  // ESE wall - angled strafe
  { x: 325, y: 206, rot: 7 },
  
  // NNE wall - angled strafe
  { x: 406, y: 175, rot: 11 },
  
  // Bounce walls - use bounce-specific rotations (12-15 range typically)
  { x: 100, y: 375, rot: 12 },
  { x: 225, y: 350, rot: 13 },
  { x: 318, y: 368, rot: 14 },
  { x: 418, y: 332, rot: 15 },
]

// Add some additional strafes at various rotations to show all 16 directions
const additionalStrafes: StrafeInfo[] = [
  // Grid of all 16 rotations for reference
  { x: 550, y: 100, rot: 0 },
  { x: 600, y: 100, rot: 1 },
  { x: 650, y: 100, rot: 2 },
  { x: 700, y: 100, rot: 3 },
  { x: 550, y: 150, rot: 4 },
  { x: 600, y: 150, rot: 5 },
  { x: 650, y: 150, rot: 6 },
  { x: 700, y: 150, rot: 7 },
  { x: 550, y: 200, rot: 8 },
  { x: 600, y: 200, rot: 9 },
  { x: 650, y: 200, rot: 10 },
  { x: 700, y: 200, rot: 11 },
  { x: 550, y: 250, rot: 12 },
  { x: 600, y: 250, rot: 13 },
  { x: 650, y: 250, rot: 14 },
  { x: 700, y: 250, rot: 15 },
]

const allStrafes = [...strafes, ...additionalStrafes]

/**
 * Renderer that displays walls with strafes at various orientations
 */
export const strafeTestBitmapRenderer: BitmapRenderer = (bitmap, frame, _env) => {
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
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const worldX = x + viewportState.x
      const worldY = y + viewportState.y
      if ((worldX + worldY) % 2 === 0) {
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
    x: viewportState.x,
    y: viewportState.y,
    b: viewportState.y + bitmap.height,
    r: viewportState.x + bitmap.width
  }

  // First render white terrain (undersides)
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
    thekind: LINE_KIND.NORMAL,
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(renderedBitmap)

  // Also render bounce lines
  renderedBitmap = blackTerrain({
    thekind: LINE_KIND.BOUNCE,
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(renderedBitmap)

  // Now draw all the strafes
  for (const strafe of allStrafes) {
    renderedBitmap = drawStrafe({
      x: strafe.x,
      y: strafe.y,
      rot: strafe.rot,
      scrnx: viewportState.x,
      scrny: viewportState.y,
      worldwidth: WORLD_WIDTH
    })(renderedBitmap)
  }

  // Copy rendered bitmap data back to original
  bitmap.data.set(renderedBitmap.data)

  // Draw labels for the reference grid (simple dots to mark positions)
  // This helps identify which rotation is which
  for (let i = 0; i < 16; i++) {
    const row = Math.floor(i / 4)
    const col = i % 4
    const labelX = 540 + col * 50 - viewportState.x
    const labelY = 100 + row * 50 - viewportState.y
    
    // Draw a small marker dot next to each strafe
    if (labelX >= 0 && labelX < bitmap.width && labelY >= 0 && labelY < bitmap.height) {
      const byteIndex = Math.floor(labelY * bitmap.rowBytes + labelX / 8)
      const bitIndex = 7 - (labelX % 8)
      bitmap.data[byteIndex]! |= 1 << bitIndex
    }
  }
}