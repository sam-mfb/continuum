/**
 * Frame-based rendering for shots and strafes
 * Port of draw_strafe() from orig/Sources/Draw.c:483-499
 */

import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { StrafeRec } from '@/core/shots/types'

// Constants from orig/Sources/GW.h:122-123
const STRAFEHT = 8 // height of a strafe
const STCENTER = 3 // center of a strafe from upleft

/**
 * Draw strafes using frame-based rendering
 * Based on draw_strafe() in orig/Sources/Draw.c:483-499
 */
export function drawStrafes(deps: {
  readonly strafes: readonly StrafeRec[]
  screenX: number
  screenY: number
  worldwidth: number
  worldwrap: boolean
}): (frame: Frame) => Frame {
  const { strafes, screenX, screenY, worldwidth, worldwrap } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    // Calculate screen bounds with margins for partial rendering
    const rightStrafe = screenX + SCRWTH + STRAFEHT
    const botStrafe = screenY + VIEWHT + STRAFEHT
    const leftStrafe = screenX - STRAFEHT
    const topStrafe = screenY - STRAFEHT

    for (let i = 0; i < strafes.length; i++) {
      const strafe = strafes[i]!
      if (strafe.lifecount <= 0) continue

      // Adjusted position (accounting for center offset)
      const adjustedX = strafe.x - STCENTER
      const adjustedY = strafe.y - STCENTER

      // Check vertical bounds - allow partial rendering
      if (adjustedY <= topStrafe || adjustedY >= botStrafe) continue

      if (adjustedX > leftStrafe && adjustedX < rightStrafe) {
        // Strafes have 4 base sprites (0-3) that cover 0-67.5 degrees
        // For rotations 4-15, we use canvas rotation on these base sprites
        const baseRotation = strafe.rot % 4
        const rotationQuadrants = Math.floor(strafe.rot / 4)
        const spriteRotation = rotationQuadrants * (Math.PI / 2)

        const rotStr =
          baseRotation < 10 ? `0${baseRotation}` : `${baseRotation}`
        const spriteId = `strafe-${rotStr}`

        newFrame.drawables.push({
          id: `strafe-${i}`,
          type: 'sprite',
          spriteId: spriteId,
          z: Z.STRAFE,
          alpha: 1,
          rotation: spriteRotation,
          topLeft: {
            x: adjustedX - screenX,
            y: adjustedY - screenY + SBARHT
          }
        })
      }

      // Draw wrapped strafe if needed
      if (
        worldwrap &&
        adjustedX > leftStrafe - worldwidth &&
        adjustedX < rightStrafe - worldwidth
      ) {
        const baseRotation = strafe.rot % 4
        const rotationQuadrants = Math.floor(strafe.rot / 4)
        const spriteRotation = rotationQuadrants * (Math.PI / 2)

        const rotStr =
          baseRotation < 10 ? `0${baseRotation}` : `${baseRotation}`
        const spriteId = `strafe-${rotStr}`

        newFrame.drawables.push({
          id: `strafe-${i}-wrap`,
          type: 'sprite',
          spriteId: spriteId,
          z: Z.STRAFE,
          alpha: 1,
          rotation: spriteRotation,
          topLeft: {
            x: adjustedX - screenX + worldwidth,
            y: adjustedY - screenY + SBARHT
          }
        })
      }
    }

    return newFrame
  }
}
