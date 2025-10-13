/**
 * Wall Drawing Modern
 *
 * Modern rendering demo showing ALL 256 possible wall junctions:
 * - 8 first wall types (S, SSE, SE, ESE, E, ENE, NE, NNE)
 * - 8 second wall types (same 8)
 * - 4 endpoint configurations (start-start, start-end, end-start, end-end)
 *
 * Arranged in a 16×16 grid with 50px walls and 120px cell spacing.
 * Uses only the modern Frame-based renderer (drawWalls from render-modern)
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer, FrameInfo, KeyInfo } from '@lib/bitmap'
import { createGameBitmap } from '@lib/bitmap'
import type { LineRec } from '@core/walls'
import { drawWalls } from '@render-modern/walls'
import { wallsActions } from '@core/walls'
import { buildGameStore } from '@dev/store'
import { LINE_KIND, NEW_TYPE } from '@core/walls'
import { createWall } from '@core/walls'
import { viewClear } from '@render/screen'
import { createCollisionService, Collision } from '@core/collision'
import type { Frame } from '@/lib/frame'
import { SCRWTH, VIEWHT } from '@/core/screen'

// Create store instance
const store = buildGameStore()

// Create collision service instance (exported for console inspection)
export const collisionService = createCollisionService()

// Define a world larger than the viewport - 16x16 grid of junctions
const CELL_SIZE = 120 // 50px wall + 70px padding for better spacing
const GRID_COLS = 16
const GRID_ROWS = 16
const WORLD_WIDTH = CELL_SIZE * GRID_COLS + 100 // Extra padding
const WORLD_HEIGHT = CELL_SIZE * GRID_ROWS + 100

// All 8 wall direction types
const ALL_TYPES = [
  NEW_TYPE.S,
  NEW_TYPE.SSE,
  NEW_TYPE.SE,
  NEW_TYPE.ESE,
  NEW_TYPE.E,
  NEW_TYPE.ENE,
  NEW_TYPE.NE,
  NEW_TYPE.NNE
]

/**
 * Generates all 256 possible wall junctions (8 types × 8 types × 4 configs)
 * Each junction shows two walls meeting at different endpoints
 */
function generateAllJunctions(): LineRec[] {
  const walls: LineRec[] = []
  let wallIndex = 0
  let junctionIndex = 0

  // For each first wall type (8 types)
  for (let type1Idx = 0; type1Idx < 8; type1Idx++) {
    const type1 = ALL_TYPES[type1Idx]!

    // For each second wall type (8 types)
    for (let type2Idx = 0; type2Idx < 8; type2Idx++) {
      const type2 = ALL_TYPES[type2Idx]!

      // For each configuration (4 configs - which endpoints meet)
      for (let config = 0; config < 4; config++) {
        // Calculate grid position (16 columns × 16 rows)
        const col = junctionIndex % GRID_COLS
        const row = Math.floor(junctionIndex / GRID_COLS)
        const baseX = 50 + col * CELL_SIZE
        const baseY = 50 + row * CELL_SIZE

        // Create first wall - always starts at baseX, baseY
        const wall1 = createWall(
          baseX,
          baseY,
          50,
          type1,
          LINE_KIND.NORMAL,
          wallIndex++
        )

        // Determine where wall2 starts based on which endpoints should meet
        let wall2StartX = baseX
        let wall2StartY = baseY

        switch (config) {
          case 0: // Wall1 start meets Wall2 start
            wall2StartX = wall1.startx
            wall2StartY = wall1.starty
            break
          case 1: // Wall1 start meets Wall2 end (so Wall2 ends at Wall1 start)
            // Calculate where Wall2 should start so its end is at Wall1's start
            const tempWall1 = createWall(0, 0, 50, type2, LINE_KIND.NORMAL, 0)
            wall2StartX = wall1.startx - (tempWall1.endx - tempWall1.startx)
            wall2StartY = wall1.starty - (tempWall1.endy - tempWall1.starty)
            break
          case 2: // Wall1 end meets Wall2 start
            wall2StartX = wall1.endx
            wall2StartY = wall1.endy
            break
          case 3: // Wall1 end meets Wall2 end
            // Calculate where Wall2 should start so its end is at Wall1's end
            const tempWall2 = createWall(0, 0, 50, type2, LINE_KIND.NORMAL, 0)
            wall2StartX = wall1.endx - (tempWall2.endx - tempWall2.startx)
            wall2StartY = wall1.endy - (tempWall2.endy - tempWall2.starty)
            break
        }

        // Create second wall
        const wall2 = createWall(
          wall2StartX,
          wall2StartY,
          50,
          type2,
          LINE_KIND.NORMAL,
          wallIndex++
        )

        walls.push(wall1, wall2)
        junctionIndex++
      }
    }
  }

  return walls
}

const junctionWalls: LineRec[] = generateAllJunctions()

// IMPORTANT: Sort walls by startx coordinate before initializing
// The rendering system expects walls to be in left-to-right order
const sortedWalls = [...junctionWalls].sort((a, b) => a.startx - b.startx)

// Initialize walls on module load
store.dispatch(wallsActions.initWalls({ walls: sortedWalls }))

// Initialize collision service and build collision map
collisionService.initialize({ width: WORLD_WIDTH, height: WORLD_HEIGHT })

// Build collision map from walls
sortedWalls.forEach(line => {
  const startX = line.startx
  const startY = line.starty
  const endX = line.endx
  const endY = line.endy

  collisionService.addLine({
    startPoint: { x: startX, y: startY, collision: Collision.LETHAL },
    endPoint: { x: endX, y: endY, collision: Collision.LETHAL },
    collision: Collision.LETHAL,
    width: 2
  })
})

// Viewport state (exported for collision overlay)
export const viewportState = {
  x: 0,
  y: 0
}

/**
 * Blank bitmap renderer - just shows the crosshatch background
 * The actual walls are rendered by wallDrawingModernRenderer (Frame-based)
 */
export const wallDrawingModernBitmapRenderer: BitmapRenderer = (
  _frame: FrameInfo,
  _keys: KeyInfo
) => {
  const bitmap = createGameBitmap()
  // Create crosshatch gray background
  return viewClear({
    screenX: viewportState.x,
    screenY: viewportState.y
  })(bitmap)
}

/**
 * Modern Frame-based renderer using drawWalls from render-modern
 */
export const wallDrawingModernRenderer = (
  _frame: FrameInfo,
  keys: KeyInfo
): Frame => {
  // Handle keyboard input for viewport movement
  const moveSpeed = 15 // Faster scrolling for easier navigation
  if (keys.keysDown.has('ArrowUp')) {
    viewportState.y = Math.max(0, viewportState.y - moveSpeed)
  }
  if (keys.keysDown.has('ArrowDown')) {
    viewportState.y = Math.min(
      WORLD_HEIGHT - VIEWHT,
      viewportState.y + moveSpeed
    )
  }
  if (keys.keysDown.has('ArrowLeft')) {
    viewportState.x = Math.max(0, viewportState.x - moveSpeed)
  }
  if (keys.keysDown.has('ArrowRight')) {
    viewportState.x = Math.min(
      WORLD_WIDTH - SCRWTH,
      viewportState.x + moveSpeed
    )
  }

  // Create a fresh frame
  let resultFrame: Frame = {
    width: SCRWTH,
    height: VIEWHT,
    drawables: []
  }

  // Get wall data from Redux state
  const wallState = store.getState().walls

  // Set up viewport based on state
  const viewport = {
    x: viewportState.x,
    y: viewportState.y,
    b: viewportState.y + VIEWHT, // bottom
    r: viewportState.x + SCRWTH // right
  }

  // Render walls using modern renderer
  resultFrame = drawWalls({
    thekind: LINE_KIND.NORMAL,
    kindPointers: wallState.kindPointers,
    organizedWalls: wallState.organizedWalls,
    viewport: viewport,
    worldwidth: WORLD_WIDTH
  })(resultFrame)

  return resultFrame
}
