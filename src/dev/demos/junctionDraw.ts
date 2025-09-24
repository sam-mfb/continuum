/**
 * Junction Drawing
 *
 * Test game that displays all 64 possible line intersection combinations
 * in a 1000x1000 world. Lines are 35 pixels long and cross in the middle.
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer, FrameInfo, KeyInfo } from '@lib/bitmap'
import { createGameBitmap } from '@lib/bitmap'
import type { LineRec } from '@core/walls'
import { whiteTerrain, blackTerrain } from '@core/walls/render'
import { wallsActions } from '@core/walls'
import { buildGameStore } from '@dev/store'
import { LINE_KIND, NEW_TYPE } from '@core/walls'
import { createWall } from '@core/walls'
import { viewClear } from '@core/screen/render'

// Create store instance
const store = buildGameStore()

// Define a 1024x1024 world (power of 2 for proper rendering)
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 1024

// Line parameters
const LINE_LENGTH = 35
const GRID_SPACING = 100 // Space between junction centers
const GRID_START_X = 100 // Increased to ensure no negative coords
const GRID_START_Y = 100 // Increased to ensure no negative coords

// Generate all 64 line intersection pairs (8x8 grid)
const generateAllJunctions = (): LineRec[] => {
  const lines: LineRec[] = []
  let lineId = 0

  // All 8 line types
  const lineTypes = [
    NEW_TYPE.S, // 1 - South (vertical down)
    NEW_TYPE.SSE, // 2 - South-Southeast
    NEW_TYPE.SE, // 3 - Southeast (diagonal down-right)
    NEW_TYPE.ESE, // 4 - East-Southeast
    NEW_TYPE.E, // 5 - East (horizontal right)
    NEW_TYPE.ENE, // 6 - East-Northeast
    NEW_TYPE.NE, // 7 - Northeast (diagonal up-right)
    NEW_TYPE.NNE // 8 - North-Northeast
  ]

  // Create 8x8 grid of junctions
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const centerX = GRID_START_X + col * GRID_SPACING
      const centerY = GRID_START_Y + row * GRID_SPACING

      const type1 = lineTypes[row]!
      const type2 = lineTypes[col]!

      // Calculate offset for first line to ensure intersection at center
      // We'll place the first line's start point such that its midpoint is at the center
      const offset1 = Math.floor(LINE_LENGTH / 2)

      // Create first line - position it so its midpoint is at the center
      let startX1 = centerX
      let startY1 = centerY

      // Adjust starting position based on line type to center the line
      switch (type1) {
        case NEW_TYPE.S: // Vertical down
          startY1 = centerY - offset1
          break
        case NEW_TYPE.SSE: // Down and slightly right
          startX1 = centerX - Math.floor(offset1 / 2)
          startY1 = centerY - offset1
          break
        case NEW_TYPE.SE: // Diagonal down-right
          startX1 = centerX - offset1
          startY1 = centerY - offset1
          break
        case NEW_TYPE.ESE: // Right and slightly down
          startX1 = centerX - offset1
          startY1 = centerY - Math.floor(offset1 / 2)
          break
        case NEW_TYPE.E: // Horizontal right
          startX1 = centerX - offset1
          break
        case NEW_TYPE.ENE: // Right and slightly up
          startX1 = centerX - offset1
          startY1 = centerY + Math.floor(offset1 / 2)
          break
        case NEW_TYPE.NE: // Diagonal up-right
          startX1 = centerX - offset1
          startY1 = centerY + offset1
          break
        case NEW_TYPE.NNE: // Up and slightly right
          startX1 = centerX - Math.floor(offset1 / 2)
          startY1 = centerY + offset1
          break
      }

      lines.push(
        createWall(
          startX1,
          startY1,
          LINE_LENGTH,
          type1,
          LINE_KIND.NORMAL,
          lineId++
        )
      )

      // Create second line - position it so its midpoint is at the center
      let startX2 = centerX
      let startY2 = centerY

      // Adjust starting position based on line type to center the line
      switch (type2) {
        case NEW_TYPE.S: // Vertical down
          startY2 = centerY - offset1
          break
        case NEW_TYPE.SSE: // Down and slightly right
          startX2 = centerX - Math.floor(offset1 / 2)
          startY2 = centerY - offset1
          break
        case NEW_TYPE.SE: // Diagonal down-right
          startX2 = centerX - offset1
          startY2 = centerY - offset1
          break
        case NEW_TYPE.ESE: // Right and slightly down
          startX2 = centerX - offset1
          startY2 = centerY - Math.floor(offset1 / 2)
          break
        case NEW_TYPE.E: // Horizontal right
          startX2 = centerX - offset1
          break
        case NEW_TYPE.ENE: // Right and slightly up
          startX2 = centerX - offset1
          startY2 = centerY + Math.floor(offset1 / 2)
          break
        case NEW_TYPE.NE: // Diagonal up-right
          startX2 = centerX - offset1
          startY2 = centerY + offset1
          break
        case NEW_TYPE.NNE: // Up and slightly right
          startX2 = centerX - Math.floor(offset1 / 2)
          startY2 = centerY + offset1
          break
      }

      lines.push(
        createWall(
          startX2,
          startY2,
          LINE_LENGTH,
          type2,
          LINE_KIND.NORMAL,
          lineId++
        )
      )
    }
  }

  return lines
}

// Initialize walls on module load
const allLines = generateAllJunctions()
// Sort lines by startx to ensure the first line in the linked list isn't offscreen
// This works around a bug in blackTerrain that skips rendering if the first line is offscreen
const sortedLines = [...allLines].sort((a, b) => a.startx - b.startx)
console.log('Generated lines:', sortedLines.length)
console.log('First few lines (sorted by x):', sortedLines.slice(0, 4))
console.log('Last few lines (sorted by x):', sortedLines.slice(-4))
store.dispatch(wallsActions.initWalls({ walls: sortedLines }))
console.log('Walls initialized in store')

// Viewport state
const viewportState = {
  x: 0,
  y: 0
}

/**
 * Renderer that displays all junction combinations
 */
export const junctionDrawRenderer: BitmapRenderer = (
  frame: FrameInfo,
  keys: KeyInfo
) => {
  const bitmap = createGameBitmap()
  // Handle keyboard input for viewport movement
  const moveSpeed = 10
  if (keys.keysDown.has('ArrowUp')) {
    viewportState.y = Math.max(0, viewportState.y - moveSpeed)
  }
  if (keys.keysDown.has('ArrowDown')) {
    viewportState.y = Math.min(
      WORLD_HEIGHT - bitmap.height,
      viewportState.y + moveSpeed
    )
  }
  if (keys.keysDown.has('ArrowLeft')) {
    viewportState.x = Math.max(0, viewportState.x - moveSpeed)
  }
  if (keys.keysDown.has('ArrowRight')) {
    viewportState.x = Math.min(
      WORLD_WIDTH - bitmap.width,
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

  // Debug viewport and wall state
  if (frame.frameCount === 0) {
    console.log('Viewport:', viewport)
    console.log('World dimensions:', WORLD_WIDTH, 'x', WORLD_HEIGHT)
    console.log('Wall state kindPointers:', wallState.kindPointers)
    console.log(
      'Total walls in organizedWalls:',
      Object.keys(wallState.organizedWalls).length
    )
  }

  // First render white terrain (undersides, patches, junctions) on top
  resultBitmap = whiteTerrain({
    whites: wallState.whites,
    junctions: wallState.junctions,
    firstWhite: wallState.firstWhite,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(resultBitmap)

  // Then render black terrain (top surfaces) for normal lines
  resultBitmap = blackTerrain({
    thekind: LINE_KIND.NORMAL, // Draw only normal lines
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(resultBitmap)

  return resultBitmap

  // This will show all 64 junction combinations with:
  // - Black tops of all walls (from blackTerrain)
  // - White undersides/shadows (from whiteTerrain)
  // - Junction hashes where the two lines intersect
}
