/**
 * Shield Demo Game
 *
 * A simple visualization of the shield effect when holding space bar.
 * Shows the ship with shield overlay using eraseFigure to create the white outline effect.
 */

import type { BitmapRenderer } from '@lib/bitmap'
import { fullFigure } from '@core/ship/render/fullFigure'
import { eraseFigure } from '@core/ship/render/eraseFigure'
import { grayFigure } from '@core/ship/render/grayFigure'
import { shiftFigure } from '@core/ship/render/shiftFigure'
import type { SpriteServiceV2 } from '@core/sprites/service'
import { SCENTER } from '@core/figs/types'
import { SCRWTH, VIEWHT } from '@core/screen/constants'
import { viewClear } from '@core/screen/render'
import { getAlignment } from '@core/shared/alignment'
import { getBackgroundPattern } from '@core/shared/backgroundPattern'

// Ship position (center of screen)
const SHIP_X = SCRWTH / 2
const SHIP_Y = VIEWHT / 2

// Shadow offsets
const SHADOW_OFFSET_X = 8
const SHADOW_OFFSET_Y = 5

// Ship rotation state
let shipRotation = 0

/**
 * Shield demo renderer
 */
export const createShieldDemoRenderer =
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Check if space bar is held for shield
    const shielding = frame.keysDown.has('Space')

    // Allow manual rotation with Z/X keys
    if (frame.keysDown.has('KeyZ')) {
      shipRotation = (shipRotation - 1) & 31
    }
    if (frame.keysDown.has('KeyX')) {
      shipRotation = (shipRotation + 1) & 31
    }

    // Get ship sprites
    const shipSprite = spriteService.getShipSprite(shipRotation, {
      variant: 'def'
    })
    const shipMaskSprite = spriteService.getShipSprite(shipRotation, {
      variant: 'mask'
    })

    // Use pre-computed bitmap format
    const shipDefBitmap = shipSprite.bitmap
    const shipMaskBitmap = shipMaskSprite.bitmap

    // Clear screen with crosshatch pattern
    const clearedBitmap = viewClear({
      screenX: 0,
      screenY: 0
    })(bitmap)
    bitmap.data.set(clearedBitmap.data)

    // Compute background patterns for gray figure
    const align0 = getAlignment({
      screenX: 0,
      screenY: 0,
      objectX: 0,
      objectY: 0
    })
    const align1 = getAlignment({
      screenX: 0,
      screenY: 0,
      objectX: 0,
      objectY: 1
    })
    const background: readonly [number, number] = [
      getBackgroundPattern(align0),
      getBackgroundPattern(align1)
    ]

    // 1. Draw ship shadow background using grayFigure
    let renderedBitmap = grayFigure({
      x: SHIP_X - (SCENTER - SHADOW_OFFSET_X),
      y: SHIP_Y - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap,
      background
    })(bitmap)

    // 2. Draw ship shadow using shiftFigure
    renderedBitmap = shiftFigure({
      x: SHIP_X - (SCENTER - SHADOW_OFFSET_X),
      y: SHIP_Y - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap
    })(renderedBitmap)

    // 3. Draw the ship itself using fullFigure
    renderedBitmap = fullFigure({
      x: SHIP_X - SCENTER,
      y: SHIP_Y - SCENTER,
      def: shipDefBitmap,
      mask: shipMaskBitmap
    })(renderedBitmap)

    // 4. If shielding, draw the shield effect
    if (shielding) {
      // Get shield sprite
      const shieldSprite = spriteService.getShieldSprite()
      const shieldBitmap = shieldSprite.bitmap

      // Use eraseFigure to create the white outline effect
      // This mimics Play.c:254 - erase_figure(shipx-SCENTER, shipy-SCENTER, shield_def, SHIPHT)
      renderedBitmap = eraseFigure({
        x: SHIP_X - SCENTER,
        y: SHIP_Y - SCENTER,
        def: shieldBitmap
      })(renderedBitmap)
    }

    // Copy rendered bitmap back to original
    bitmap.data.set(renderedBitmap.data)

    // Simple text indicator (draw a pattern to show shield state)
    if (shielding) {
      // Draw a simple indicator pattern in the top-left corner
      // This is just a visual cue that shield is active
      for (let y = 2; y < 6; y++) {
        for (let x = 2; x < 50; x++) {
          if ((x + y) % 4 === 0) {
            const byteIndex = y * 64 + Math.floor(x / 8)
            const bitIndex = 7 - (x % 8)
            if (bitmap.data[byteIndex] !== undefined) {
              bitmap.data[byteIndex] |= 1 << bitIndex
            }
          }
        }
      }
    }
  }
