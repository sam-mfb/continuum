import { type MonochromeBitmap } from '@lib/bitmap'
import { blackSmall } from './blackSmall'
import { strafeDefs } from '@core/figs/hardcodedSprites'
import { VIEWHT, SCRWTH } from '@core/screen/constants'

// Constants from orig/Sources/GW.h:122-123
const STRAFEHT = 8 // height of a strafe
const STCENTER = 3 // center of a strafe from upleft

/**
 * Draw strafe pattern on the bitmap
 *
 * See draw_strafe() in orig/Sources/Draw.c:483-499
 */
export function drawStrafe(deps: {
  x: number
  y: number
  rot: number
  scrnx: number
  scrny: number
  worldwidth: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, rot, scrnx, scrny, worldwidth } = deps

    // x -= STCENTER + scrnx
    // y -= STCENTER + scrny
    let adjustedX = x - STCENTER - scrnx
    let adjustedY = y - STCENTER - scrny

    // Check if within vertical bounds
    // if (y >= 0 && y < VIEWHT-STRAFEHT)
    if (adjustedY >= 0 && adjustedY < VIEWHT - STRAFEHT) {
      // Check horizontal bounds
      // if (x >= 0 && x < SCRWTH-STRAFEHT)
      if (adjustedX >= 0 && adjustedX < SCRWTH - STRAFEHT) {
        // black_small(x, y, strafe_defs[rot], STRAFEHT)
        const strafeDef = strafeDefs[rot]
        if (strafeDef) {
          // Convert Uint8Array to number array for blackSmall
          const defArray = Array.from(strafeDef)
          return blackSmall({
            x: adjustedX,
            y: adjustedY,
            def: defArray,
            height: STRAFEHT
          })(screen)
        }
      } else {
        // Try wrapping around world
        // x += worldwidth
        adjustedX += worldwidth
        // if (x >= 0 && x < SCRWTH-STRAFEHT)
        if (adjustedX >= 0 && adjustedX < SCRWTH - STRAFEHT) {
          // black_small(x, y, strafe_defs[rot], STRAFEHT)
          const strafeDef = strafeDefs[rot]
          if (strafeDef) {
            // Convert Uint8Array to number array for blackSmall
            const defArray = Array.from(strafeDef)
            return blackSmall({
              x: adjustedX,
              y: adjustedY,
              def: defArray,
              height: STRAFEHT
            })(screen)
          }
        }
      }
    }

    // If not drawn, return unchanged screen
    return screen
  }
}
