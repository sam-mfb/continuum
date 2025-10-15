/**
 * Strafe Test Bitmap Game
 *
 * Test game for demonstrating all 16 strafe orientations on a white background.
 * Shows a grid of strafes at all possible rotations (0-15).
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer, FrameInfo, KeyInfo } from '@lib/bitmap'
import { createGameBitmap } from '@lib/bitmap'
import { drawStrafe } from '@render/shots'
import type { Frame } from '@lib/frame'
import { drawStrafes } from '@render-modern/shots'
import type { StrafeRec } from '@core/shots/types'

// Define a simple world
const WORLD_WIDTH = 512
const WORLD_HEIGHT = 342

// Viewport state
const viewportState = {
  x: 0,
  y: 0
}

// Define strafe positions - 4x4 grid showing all 16 rotations
type StrafeInfo = {
  x: number
  y: number
  rot: number // 0-15 for the 16 directional sprites
}

// Create a grid of all 16 strafe orientations
const strafes: StrafeInfo[] = []
for (let i = 0; i < 16; i++) {
  const row = Math.floor(i / 4)
  const col = i % 4
  strafes.push({
    x: 100 + col * 80, // 80 pixels apart horizontally
    y: 50 + row * 80, // 80 pixels apart vertically
    rot: i
  })
}

/**
 * Renderer that displays all 16 strafe orientations on a white background
 */
export const strafeTestBitmapRenderer: BitmapRenderer = (
  _frame: FrameInfo,
  keys: KeyInfo
) => {
  const bitmap = createGameBitmap()
  // Handle keyboard input for viewport movement
  const moveSpeed = 5
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

  // Clear to white background (all zeros in our inverted bitmap)
  let resultBitmap = { ...bitmap }
  resultBitmap.data.fill(0)

  // Draw all the strafes
  for (const strafe of strafes) {
    resultBitmap = drawStrafe({
      x: strafe.x,
      y: strafe.y,
      rot: strafe.rot,
      scrnx: viewportState.x,
      scrny: viewportState.y,
      worldwidth: WORLD_WIDTH
    })(resultBitmap)
  }

  return resultBitmap
}

// Test strafe data for frame renderer
const testStrafes: StrafeRec[] = []

function initializeTestStrafes(): void {
  if (testStrafes.length > 0) return // Already initialized

  // Create a 4x4 grid showing all 16 strafe rotations
  for (let i = 0; i < 16; i++) {
    testStrafes.push({
      x: strafes[i]!.x,
      y: strafes[i]!.y,
      rot: i,
      lifecount: 100 // Keep alive
    })
  }
}

/**
 * Frame renderer that displays all 16 strafe orientations
 */
export const createStrafeTestFrameRenderer =
  (): ((frameInfo: FrameInfo, keyInfo: KeyInfo) => Frame) =>
  (_frameInfo: FrameInfo, _keys: KeyInfo) => {
    initializeTestStrafes()

    let frame: Frame = { width: 512, height: 342, drawables: [] }

    frame = drawStrafes({
      strafes: testStrafes,
      screenX: viewportState.x,
      screenY: viewportState.y,
      worldwidth: WORLD_WIDTH,
      worldwrap: true
    })(frame)

    return frame
  }
