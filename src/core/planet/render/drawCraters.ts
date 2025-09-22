import { type MonochromeBitmap } from '@lib/bitmap'
import { SCRWTH, VIEWHT } from '@core/screen'
import { CRATERHT } from '@core/figs'
import type { Crater } from '../types'
import { CRATERCENTER } from '../constants'
import { drawMedium } from './drawMedium'
import { getAlignment } from '@core/shared'

/**
 * From draw_craters() in orig/Sources/Terrain.c at 507-527
 *
 * Draws all visible craters in the viewport using drawMedium.
 * Handles world wrapping internally when on_right_side is true.
 */
export function drawCraters(deps: {
  readonly craters: readonly Crater[]
  numcraters: number
  scrnx: number
  scrny: number
  worldwidth: number
  on_right_side: boolean
  craterImages: {
    background1: Uint8Array
    background2: Uint8Array
  }
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const {
      craters,
      numcraters,
      scrnx,
      scrny,
      worldwidth,
      on_right_side,
      craterImages
    } = deps

    let newScreen = screen

    // Calculate visible area bounds (Terrain.c:512-515)
    const top = scrny - CRATERCENTER
    const bot = scrny + VIEWHT + CRATERCENTER // screenb = screeny + VIEWHT
    const left = scrnx - CRATERCENTER
    const right = scrnx + SCRWTH + CRATERCENTER // screenr = screenx + SCRWTH

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
          // Determine which background pattern to use (Terrain.c:522)
          const align = getAlignment({
            x: crat.x,
            y: crat.y,
            screenX: scrnx,
            screenY: scrny
          })

          // Convert to MonochromeBitmap with appropriate background
          const craterImage: MonochromeBitmap = {
            width: 32,
            height: CRATERHT,
            data:
              align === 0 ? craterImages.background1 : craterImages.background2,
            rowBytes: 4 // 32 pixels / 8 bits per byte
          }

          // Draw the crater (Terrain.c:520-522)
          newScreen = drawMedium({
            x: crat.x - scrnx - CRATERCENTER,
            y: crat.y - scrny - CRATERCENTER,
            def: craterImage,
            height: CRATERHT
          })(newScreen)
        }
        // Handle world wrapping (Terrain.c:523-526)
        else if (on_right_side && crat.x < right - worldwidth) {
          // Determine which background pattern to use
          const align = getAlignment({
            x: crat.x,
            y: crat.y,
            screenX: scrnx,
            screenY: scrny
          })

          // Convert to MonochromeBitmap with appropriate background
          const craterImage: MonochromeBitmap = {
            width: 32,
            height: CRATERHT,
            data:
              align === 0 ? craterImages.background1 : craterImages.background2,
            rowBytes: 4 // 32 pixels / 8 bits per byte
          }

          // Draw with world-wrapped X coordinate
          newScreen = drawMedium({
            x: crat.x - scrnx + worldwidth - CRATERCENTER,
            y: crat.y - scrny - CRATERCENTER,
            def: craterImage,
            height: CRATERHT
          })(newScreen)
        }
      }
    }

    return newScreen
  }
}
