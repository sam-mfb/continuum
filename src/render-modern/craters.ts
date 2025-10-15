import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { CRATERCENTER } from '@/core/planet'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { Crater } from '@/core/planet'

/**
 * From drawCraters() in orig/Sources/Terrain.c at 507-527
 *
 * Draws all visible craters in the viewport.
 * Converted to Frame-based rendering using sprite drawables.
 */
export function drawCraters(deps: {
  readonly craters: readonly Crater[]
  numcraters: number
  screenX: number
  screenY: number
  worldwidth: number
}): (frame: Frame) => Frame {
  const { craters, numcraters, screenX, screenY, worldwidth } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    // Calculate visible area bounds (Terrain.c:512-515)
    const top = screenY - CRATERCENTER
    const bot = screenY + VIEWHT + CRATERCENTER
    const left = screenX - CRATERCENTER
    const right = screenX + SCRWTH + CRATERCENTER

    // Check if we're on the right side for world wrapping
    const on_right_side = screenX > worldwidth - SCRWTH

    // Only process up to numcraters (Terrain.c:516)
    const end = Math.min(numcraters, craters.length)

    // Process each crater (Terrain.c:517-526)
    for (let i = 0; i < end; i++) {
      const crat = craters[i]

      // Skip undefined or null elements
      if (!crat) continue

      // Check if crater is within vertical bounds (Terrain.c:518)
      if (crat.y >= top && crat.y <= bot) {
        // Check if crater is within horizontal bounds (Terrain.c:519)
        if (crat.x >= left && crat.x < right) {
          newFrame.drawables.push({
            id: `crater-${i}`,
            type: 'sprite',
            spriteId: 'crater',
            z: Z.CRATER,
            alpha: 1,
            topLeft: {
              x: crat.x - screenX - CRATERCENTER,
              y: crat.y - screenY - CRATERCENTER + SBARHT
            },
            rotation: 0
          })
        }
        // Handle world wrapping (Terrain.c:523-526)
        else if (on_right_side && crat.x < right - worldwidth) {
          newFrame.drawables.push({
            id: `crater-${i}-wrap`,
            type: 'sprite',
            spriteId: 'crater',
            z: Z.CRATER,
            alpha: 1,
            topLeft: {
              x: crat.x - screenX + worldwidth - CRATERCENTER,
              y: crat.y - screenY - CRATERCENTER + SBARHT
            },
            rotation: 0
          })
        }
      }
    }

    return newFrame
  }
}
