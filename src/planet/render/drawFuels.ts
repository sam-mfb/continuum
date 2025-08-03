import { type MonochromeBitmap } from '@/bitmap'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import { FUELHT, FUELFRAMES } from '@/figs/types'
import type { Fuel } from '../types'
import { FUELCENTER } from '../constants'
import { drawMedium } from './drawMedium'

/**
 * From draw_fuels() in orig/Sources/Terrain.c at 293-313
 *
 * Draws all visible fuel cells in the viewport using drawMedium.
 * Handles world wrapping for fuel cells near screen edges.
 */
export function drawFuels(deps: {
  readonly fuels: readonly Fuel[]
  scrnx: number
  scrny: number
  worldwidth: number
  on_right_side: boolean
  fuelSprites: {
    getFrame(frame: number): {
      images: {
        background1: Uint8Array
        background2: Uint8Array
      }
    }
    getDrainingFrame(frame: number): {
      images: {
        background1: Uint8Array
        background2: Uint8Array
      }
    }
    emptyCell: {
      images: {
        background1: Uint8Array
        background2: Uint8Array
      }
    }
  }
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { fuels, scrnx, scrny, worldwidth, on_right_side, fuelSprites } = deps

    let newScreen = screen

    // Calculate visible area bounds (Terrain.c:300-301)
    const left = scrnx - FUELCENTER
    const right = scrnx + (FUELCENTER + SCRWTH)

    // Process each fuel cell (Terrain.c:302-312)
    for (const fp of fuels) {
      // Check for end marker (Terrain.c:302)
      if (fp.x >= 10000) break

      // Check if fuel is within horizontal bounds
      if (fp.x > left && fp.x < right) {
        // Calculate fuel Y position relative to screen (Terrain.c:305)
        const fuely = fp.y - scrny - FUELCENTER

        // Check if fuel is within vertical bounds (Terrain.c:306)
        if (fuely > -FUELHT && fuely < VIEWHT) {
          // Determine which background pattern to use (Terrain.c:308)
          const rot = (fp.x + fp.y) & 1

          // Get the appropriate fuel sprite based on state
          let fuelSprite
          if (!fp.alive) {
            // Dead fuel cells show empty sprite
            fuelSprite = fuelSprites.emptyCell
          } else if (fp.currentfig < FUELFRAMES) {
            // Normal animation frames (0-5)
            fuelSprite = fuelSprites.getFrame(fp.currentfig)
          } else if (fp.currentfig < FUELFRAMES + 2) {
            // Draining frames (6-7)
            fuelSprite = fuelSprites.getDrainingFrame(
              fp.currentfig - FUELFRAMES
            )
          } else {
            // Empty frame (8) - though alive fuels shouldn't normally reach this
            fuelSprite = fuelSprites.emptyCell
          }

          // Convert Uint8Array to MonochromeBitmap
          const fuelImage: MonochromeBitmap = {
            width: 32,
            height: FUELHT,
            data:
              rot === 0
                ? fuelSprite.images.background1
                : fuelSprite.images.background2,
            rowBytes: 4 // 32 pixels / 8 bits per byte
          }

          // Draw the fuel cell (Terrain.c:309-310)
          newScreen = drawMedium({
            x: fp.x - scrnx - FUELCENTER,
            y: fuely,
            def: fuelImage,
            height: FUELHT
          })(newScreen)
        }
      }
    }

    // Handle world wrapping - draw fuels on right side if needed (Terrain.c:288-289)
    if (on_right_side) {
      const wrappedScrnx = scrnx - worldwidth
      const wrappedLeft = wrappedScrnx - FUELCENTER
      const wrappedRight = wrappedScrnx + (FUELCENTER + SCRWTH)

      for (const fp of fuels) {
        // Check for end marker
        if (fp.x >= 10000) break

        // Check if fuel is visible when world-wrapped
        if (fp.x > wrappedLeft && fp.x < wrappedRight) {
          const fuely = fp.y - scrny - FUELCENTER

          if (fuely > -FUELHT && fuely < VIEWHT) {
            const rot = (fp.x + fp.y) & 1

            // Get the appropriate fuel sprite based on state (same logic as above)
            let fuelSprite
            if (!fp.alive) {
              fuelSprite = fuelSprites.emptyCell
            } else if (fp.currentfig < FUELFRAMES) {
              fuelSprite = fuelSprites.getFrame(fp.currentfig)
            } else if (fp.currentfig < FUELFRAMES + 2) {
              fuelSprite = fuelSprites.getDrainingFrame(
                fp.currentfig - FUELFRAMES
              )
            } else {
              fuelSprite = fuelSprites.emptyCell
            }

            const fuelImage: MonochromeBitmap = {
              width: 32,
              height: FUELHT,
              data:
                rot === 0
                  ? fuelSprite.images.background1
                  : fuelSprite.images.background2,
              rowBytes: 4
            }

            // Draw with world-wrapped X coordinate
            newScreen = drawMedium({
              x: fp.x - scrnx + worldwidth - FUELCENTER,
              y: fuely,
              def: fuelImage,
              height: FUELHT
            })(newScreen)
          }
        }
      }
    }

    return newScreen
  }
}

/**
 * From do_fuels() in orig/Sources/Terrain.c at 267-290
 *
 * Updates fuel cell animations and draws them.
 * Includes random "flash" effect where one fuel cell per frame flashes bright.
 */
export function doFuels(deps: {
  fuels: Fuel[]
  rint: (max: number) => number
  drawFuels: (screen: MonochromeBitmap) => MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { fuels, rint, drawFuels } = deps

    // Random fuel to flash this frame (Terrain.c:272)
    const flash = rint(fuels.length)

    // Update animations for all fuel cells (Terrain.c:274-286)
    for (let f = 0; f < fuels.length; f++) {
      const fp = fuels[f]!

      // Check for end marker
      if (fp.x >= 10000) break

      // Only animate if fuel is alive
      if (fp.alive) {
        if (f === flash) {
          // Flash effect - set to one of last two frames (Terrain.c:277-280)
          fp.currentfig = FUELFRAMES - 2 + rint(2)
          fp.figcount = 1
        } else if (fp.figcount <= 0) {
          // Advance to next animation frame (Terrain.c:281-286)
          fp.currentfig++
          if (fp.currentfig >= FUELFRAMES - 2) {
            fp.currentfig = 0
          }
          fp.figcount = 1
        } else {
          // Decrement frame counter
          fp.figcount--
        }
      }
    }

    // Draw all fuels (Terrain.c:287)
    return drawFuels(screen)
  }
}
