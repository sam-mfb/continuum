/**
 * @fileoverview Modern renderer view clear - fills viewport with crosshatch pattern
 * Corresponds to viewClear() in src/render/screen/viewClear.ts
 *
 * Creates the dithered gray background pattern before drawing game objects.
 */

import type { Frame } from '@/lib/frame/types'
import { VIEWHT, SCRWTH, SBARHT } from '@/core/screen'
import { getAlignment } from '@/core/shared'

type ViewClearDeps = {
  screenX: number
  screenY: number
}

/**
 * Fills the main view area with alternating gray pattern.
 * Creates the dithered checkerboard background that is characteristic of the game.
 *
 * The pattern alternates based on viewport position to create a stable diagonal
 * checkerboard pattern as the viewport moves through the world.
 *
 * @param deps Dependencies object containing:
 *   @param screenX - X position of viewport in world coordinates
 *   @param screenY - Y position of viewport in world coordinates
 * @returns Pure function that adds background pattern to frame
 *
 * @see src/render/screen/viewClear.ts viewClear()
 */
export function viewClear(deps: ViewClearDeps): (frame: Frame) => Frame {
  return frame => {
    const { screenX, screenY } = deps

    // Calculate pattern alignment based on screen position
    // This creates the diagonal checkerboard effect
    const screenAlignment = getAlignment({
      x: screenX,
      y: screenY,
      screenX,
      screenY
    })

    // Create a full-viewport rectangle with crosshatch pattern
    const backgroundRect = {
      id: 'view-clear-background',
      z: -1000, // Render behind everything
      type: 'rect' as const,
      alpha: 1,
      topLeft: { x: 0, y: SBARHT },
      width: SCRWTH,
      height: VIEWHT,
      fillColor: 'black',
      fillPattern: 'crosshatch' as const,
      patternAlignment: screenAlignment
    }

    return {
      ...frame,
      drawables: [backgroundRect, ...frame.drawables]
    }
  }
}
