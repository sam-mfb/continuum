/**
 * Strafe Test Bitmap Game
 *
 * Test game for demonstrating all 16 strafe orientations on a white background.
 * Shows a grid of strafes at all possible rotations (0-15).
 * Use arrow keys to move the viewport.
 */

import type { BitmapRenderer } from '@lib/bitmap'
import { drawStrafe } from '@core/shots/render'

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
  bitmap,
  frame,
  _env
) => {
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
