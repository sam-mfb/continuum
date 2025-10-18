/**
 * Frame-based rendering for shots and strafes
 * Port of draw_strafe() from orig/Sources/Draw.c:483-499
 * Port of draw_shipshot() from orig/Sources/Draw.c:617-669
 * Port of draw_dot_safe() from orig/Sources/Draw.c:579-593
 */

import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { StrafeRec, ShotRec } from '@/core/shots/types'

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

/**
 * Draw ship shots using frame-based rendering
 * Based on draw_shipshot() in orig/Sources/Draw.c:617-669
 */
export function drawShipShots(deps: {
  readonly shots: readonly ShotRec[]
  screenX: number
  screenY: number
  worldwidth: number
  worldwrap: boolean
}): (frame: Frame) => Frame {
  const { shots, screenX, screenY, worldwidth, worldwrap } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]!

      // Only render if shot is alive or just died (without strafe)
      const shouldRender =
        shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

      if (!shouldRender) continue

      // Calculate screen position
      const shotx = shot.x - screenX - 1
      const shoty = shot.y - screenY - 1

      // Check bounds (4x4 sprite, so need -3 margin)
      if (
        shotx >= 0 &&
        shotx < SCRWTH - 3 &&
        shoty >= 0 &&
        shoty < VIEWHT - 3
      ) {
        newFrame.drawables.push({
          id: `shipshot-${i}`,
          type: 'sprite',
          spriteId: 'shipshot-00',
          z: Z.SHIP_SHOT,
          alpha: 1,
          rotation: 0,
          topLeft: {
            x: shotx,
            y: shoty + SBARHT
          }
        })
      }

      // Handle world wrapping
      if (worldwrap && screenX > worldwidth - SCRWTH) {
        const wrappedShotx = shot.x + worldwidth - screenX - 1
        if (wrappedShotx >= 0 && wrappedShotx < SCRWTH - 3) {
          newFrame.drawables.push({
            id: `shipshot-${i}-wrap`,
            type: 'sprite',
            spriteId: 'shipshot-00',
            z: Z.SHIP_SHOT,
            alpha: 1,
            rotation: 0,
            topLeft: {
              x: wrappedShotx,
              y: shoty + SBARHT
            }
          })
        }
      }
    }

    return newFrame
  }
}

/**
 * Draw bunker shots (2x2 black dots) using frame-based rendering
 * Based on draw_dot_safe() in orig/Sources/Draw.c:579-593
 */
export function drawBunkerShots(deps: {
  readonly shots: readonly ShotRec[]
  screenX: number
  screenY: number
  worldwidth: number
  worldwrap: boolean
}): (frame: Frame) => Frame {
  const { shots, screenX, screenY, worldwidth, worldwrap } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i]!

      // Only render if shot is alive or just died (without strafe)
      const shouldRender =
        shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

      if (!shouldRender) continue

      // Calculate screen position
      const shotx = shot.x - screenX
      const shoty = shot.y - screenY

      // Check bounds (2x2 dot, so need -1 margin)
      if (
        shotx >= 0 &&
        shotx < SCRWTH - 1 &&
        shoty >= 0 &&
        shoty < VIEWHT - 1
      ) {
        newFrame.drawables.push({
          id: `bunkershot-${i}`,
          type: 'rect',
          z: Z.BUNKER_SHOT,
          alpha: 1,
          topLeft: {
            x: shotx,
            y: shoty + SBARHT
          },
          width: 2,
          height: 2,
          fillColor: 'black'
        })
      }

      // Handle world wrapping
      if (worldwrap && screenX > worldwidth - SCRWTH) {
        const wrappedShotx = shot.x + worldwidth - screenX
        if (
          wrappedShotx >= 0 &&
          wrappedShotx < SCRWTH - 1 &&
          shoty >= 0 &&
          shoty < VIEWHT - 1
        ) {
          newFrame.drawables.push({
            id: `bunkershot-${i}-wrap`,
            type: 'rect',
            z: Z.BUNKER_SHOT,
            alpha: 1,
            topLeft: {
              x: wrappedShotx,
              y: shoty + SBARHT
            },
            width: 2,
            height: 2,
            fillColor: 'black'
          })
        }
      }
    }

    return newFrame
  }
}
