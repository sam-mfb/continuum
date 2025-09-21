/**
 * @fileoverview Creates star background bitmaps with optional ship for transitions
 */

import type { MonochromeBitmap } from '@lib/bitmap'
import type { SpriteService } from '@core/sprites'
import { starBackground } from './starBackground'
import { fullFigure } from '@core/ship/render'
import { SCENTER } from '@core/figs/types'

/**
 * Creates a star background bitmap for level transitions
 *
 * @param deps Dependencies object containing:
 *   @param includeShip Whether to include the ship in the background
 *   @param shipState Ship position and rotation (if includeShip is true)
 *   @param spriteService Sprite service for getting ship sprites
 * @returns Pure function that transforms a bitmap
 */
export function starBackgroundWithShip(deps: {
  includeShip: boolean
  shipState?: { shiprot: number; shipx: number; shipy: number }
  spriteService: SpriteService
}): (bitmap: MonochromeBitmap) => MonochromeBitmap {
  const { includeShip, shipState, spriteService } = deps

  return bitmap => {
    if (includeShip && shipState) {
      const shipSprite = spriteService.getShipSprite(shipState.shiprot, {
        variant: 'def'
      })
      const shipMaskSprite = spriteService.getShipSprite(shipState.shiprot, {
        variant: 'mask'
      })

      return starBackground({
        starCount: 150,
        additionalRender: (screen: MonochromeBitmap): MonochromeBitmap =>
          fullFigure({
            x: shipState.shipx - SCENTER,
            y: shipState.shipy - SCENTER,
            def: shipSprite.bitmap,
            mask: shipMaskSprite.bitmap
          })(screen)
      })(bitmap)
    }

    return starBackground({ starCount: 150 })(bitmap)
  }
}
