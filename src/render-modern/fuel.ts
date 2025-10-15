import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { FUELHT, FUELFRAMES } from '@/core/figs'
import { FUELCENTER } from '@/core/planet'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { Fuel } from '@/core/planet'

/**
 * From drawFuels() in orig/Sources/Terrain.c at 293-313
 *
 * Draws all visible fuel cells in the viewport.
 * Converted to Frame-based rendering using sprite drawables.
 * World wrapping is handled by the caller (call function twice with adjusted screenX).
 */
export function drawFuels(deps: {
  readonly fuels: readonly Fuel[]
  screenX: number
  screenY: number
}): (frame: Frame) => Frame {
  const { fuels, screenX, screenY } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    // Calculate visible area bounds (Terrain.c:300-301)
    const left = screenX - FUELCENTER
    const right = screenX + (FUELCENTER + SCRWTH)

    // Process each fuel cell (Terrain.c:302-312)
    for (const fp of fuels) {
      // Skip undefined or null elements
      if (!fp) continue

      // Check for end marker (Terrain.c:302)
      if (fp.x >= 10000) break

      // Check if fuel is within horizontal bounds
      if (fp.x > left && fp.x < right) {
        // Calculate fuel Y position relative to screen (Terrain.c:305)
        const fuely = fp.y - screenY - FUELCENTER

        // Check if fuel is within vertical bounds (Terrain.c:306)
        if (fuely > -FUELHT && fuely < VIEWHT) {
          // Determine sprite ID based on currentfig
          // Frames 0-7 are animation, frame 8+ is empty cell
          let spriteId: string
          if (fp.currentfig >= FUELFRAMES) {
            // Empty cell (frame 8+)
            spriteId = 'fuel-08'
          } else {
            // Animation frames (0-7)
            const frameNum =
              fp.currentfig < 10 ? `0${fp.currentfig}` : `${fp.currentfig}`
            spriteId = `fuel-${frameNum}`
          }

          newFrame.drawables.push({
            id: `fuel-${fp.x}-${fp.y}`,
            type: 'sprite',
            spriteId: spriteId,
            z: Z.FUEL,
            alpha: 1,
            topLeft: {
              x: fp.x - screenX - FUELCENTER,
              y: fuely + SBARHT
            },
            rotation: 0
          })
        }
      }
    }

    return newFrame
  }
}
