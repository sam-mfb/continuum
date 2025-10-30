import { bitmapToCollisionItem } from '@/core/collision'
import type { CollisionMap } from '@/core/collision/types'
import { Collision } from '@/core/collision/constants'
import { SBARHT } from '@/core/screen'
import { SCENTER } from '@/core/figs'
import type { SpriteService } from '@/core/sprites'
import type { ShipState } from '@/core/ship/types'

/**
 * Applies collision map visualization overlay to ImageData pixels
 * - Red overlay: LETHAL collision areas
 * - Green overlay: BOUNCE collision areas
 * - Blue overlay: Ship collision mask
 */
export function applyCollisionMapOverlay(
  pixels: Uint8ClampedArray,
  collisionMap: CollisionMap,
  ship: ShipState,
  spriteService: SpriteService,
  width: number,
  height: number
): void {
  // Get ship collision item
  const shipBitmap = spriteService.getShipSprite(ship.shiprot, {
    variant: 'mask'
  }).bitmap
  const shipItem = bitmapToCollisionItem(
    shipBitmap,
    Collision.NONE,
    ship.shipx - SCENTER,
    ship.shipy - SCENTER
  )

  // Overlay collision map colors
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4

      // Check if there's a collision at this point
      // NB: collision map doesn't include status bar
      const collision = collisionMap[x]?.[y - SBARHT] ?? 0

      if (collision === Collision.LETHAL) {
        // Blend red transparently on top
        const alpha = 0.5 // 50% transparency
        pixels[pixelIndex] = Math.round(
          pixels[pixelIndex]! * (1 - alpha) + 255 * alpha
        ) // R
        pixels[pixelIndex + 1] = Math.round(
          pixels[pixelIndex + 1]! * (1 - alpha) + 0 * alpha
        ) // G
        pixels[pixelIndex + 2] = Math.round(
          pixels[pixelIndex + 2]! * (1 - alpha) + 0 * alpha
        ) // B
      } else if (collision === Collision.BOUNCE) {
        // Blend green transparently on top
        const alpha = 0.5 // 50% transparency
        pixels[pixelIndex] = Math.round(
          pixels[pixelIndex]! * (1 - alpha) + 0 * alpha
        ) // R
        pixels[pixelIndex + 1] = Math.round(
          pixels[pixelIndex + 1]! * (1 - alpha) + 255 * alpha
        ) // G
        pixels[pixelIndex + 2] = Math.round(
          pixels[pixelIndex + 2]! * (1 - alpha) + 0 * alpha
        ) // B
      }

      // Check if this pixel is part of the ship collision mask
      const isShipPixel = shipItem.some(
        point => point.x === x && point.y === y - SBARHT
      )
      if (isShipPixel) {
        // Blend blue transparently on top
        const alpha = 0.5 // 50% transparency
        pixels[pixelIndex] = Math.round(
          pixels[pixelIndex]! * (1 - alpha) + 0 * alpha
        ) // R
        pixels[pixelIndex + 1] = Math.round(
          pixels[pixelIndex + 1]! * (1 - alpha) + 0 * alpha
        ) // G
        pixels[pixelIndex + 2] = Math.round(
          pixels[pixelIndex + 2]! * (1 - alpha) + 255 * alpha
        ) // B
      }
    }
  }
}
