import type { MonochromeBitmap, BitmapRenderer } from '@lib/bitmap'
import type { ShardSpriteSet, ShardSprite } from '@core/figs/types'
import { drawShard } from '@core/explosions/render'
import { SHARDHT } from '@core/figs/types'
import type { SpriteService } from '@core/sprites'
import { viewClear } from '@core/screen/render'

// Viewport state - for scrolling around
const viewportState = {
  x: 0,
  y: 0
}

// Define a larger world to scroll through
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 768

/**
 * Test game for debugging shard rendering
 * Displays shards at different rotations and positions on a gray background
 */
export function shardTestBitmap(deps: {
  bitmap: MonochromeBitmap
  shardImages: ShardSpriteSet | null
  screenX: number
  screenY: number
}): MonochromeBitmap {
  const { bitmap, shardImages, screenX, screenY } = deps

  // We'll accumulate changes to this bitmap
  let result = bitmap

  // Fill with dithered gray pattern using viewClear
  result = viewClear({
    screenX: screenX,
    screenY: screenY
  })(result)

  if (!shardImages) {
    return result
  }

  // Display shards in a grid pattern at WORLD positions
  // Show all 16 rotations for kind 0 (first bunker type)
  const kind = 0
  const spacing = 40
  // Place shards starting near the right edge so the cluster is partly off-screen
  const worldStartX = bitmap.width - 8
  const worldStartY = 200

  // Draw 4x4 grid of rotations (16 total)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const rotation = row * 4 + col
      const worldX = worldStartX + col * spacing
      const worldY = worldStartY + row * spacing

      // Calculate screen position
      const screenPosX = worldX - screenX
      const screenPosY = worldY - screenY

      // Skip if not visible
      if (
        screenPosX < -SHARDHT ||
        screenPosX >= result.width ||
        screenPosY < -SHARDHT ||
        screenPosY >= result.height
      ) {
        continue
      }

      // Get the sprite for this rotation
      const sprite = shardImages.getSprite(kind, rotation)

      // Calculate alignment - matches original: (sp->x + sp->y) & 1
      const align = (worldX + worldY) & 1

      // Use pre-rendered image based on alignment
      const imageData =
        align === 0 ? sprite.images.background1 : sprite.images.background2

      // Convert Uint8Array to Uint16Array (big-endian)
      const uint16Def = new Uint16Array(imageData.length / 2)
      for (let i = 0; i < uint16Def.length; i++) {
        uint16Def[i] = (imageData[i * 2]! << 8) | imageData[i * 2 + 1]!
      }

      result = drawShard({
        x: screenPosX,
        y: screenPosY,
        def: uint16Def,
        height: SHARDHT
      })(result)
    }
  }

  // Also test different positions with same rotation
  // Draw a row of shards with rotation 0 at different x positions
  const testRotation = 0
  const testWorldY = 400
  for (let i = 0; i < 8; i++) {
    const worldX = worldStartX + i * 30 // Vary x position near right edge
    const worldY = testWorldY

    // Calculate screen position
    const screenPosX = worldX - screenX
    const screenPosY = worldY - screenY

    // Skip if not visible
    if (
      screenPosX < -SHARDHT ||
      screenPosX >= result.width ||
      screenPosY < -SHARDHT ||
      screenPosY >= result.height
    ) {
      continue
    }

    const sprite = shardImages.getSprite(kind, testRotation)

    // Calculate alignment - matches original: (sp->x + sp->y) & 1
    const align = (worldX + worldY) & 1

    const imageData =
      align === 0 ? sprite.images.background1 : sprite.images.background2

    const uint16Def = new Uint16Array(imageData.length / 2)
    for (let j = 0; j < uint16Def.length; j++) {
      uint16Def[j] = (imageData[j * 2]! << 8) | imageData[j * 2 + 1]!
    }

    result = drawShard({
      x: screenPosX,
      y: screenPosY,
      def: uint16Def,
      height: SHARDHT
    })(result)
  }

  // (Removed raw non-precomputed examples)

  // Phase sweep row: exercise all x bit offsets (x & 15) across 32 positions
  // This helps expose any phase mismatches between precomputed background and 32-bit write position
  const phaseSweepY = 600
  for (let i = 0; i < 32; i++) {
    const worldX = worldStartX + i // 1px steps near right edge
    const worldY = phaseSweepY

    // Calculate screen position
    const screenPosX = worldX - screenX
    const screenPosY = worldY - screenY

    // Skip if not visible
    if (
      screenPosX < -SHARDHT ||
      screenPosX >= result.width ||
      screenPosY < -SHARDHT ||
      screenPosY >= result.height
    ) {
      continue
    }

    const sprite = shardImages.getSprite(kind, testRotation)

    // Calculate alignment - matches original: (sp->x + sp->y) & 1
    const align = (worldX + worldY) & 1

    const imageData =
      align === 0 ? sprite.images.background1 : sprite.images.background2

    const uint16Def = new Uint16Array(imageData.length / 2)
    for (let j = 0; j < uint16Def.length; j++) {
      uint16Def[j] = (imageData[j * 2]! << 8) | imageData[j * 2 + 1]!
    }

    result = drawShard({
      x: screenPosX,
      y: screenPosY,
      def: uint16Def,
      height: SHARDHT
    })(result)
  }

  // Wrap behavior test: draw near the world right edge and also draw wrapped copies
  const wrapTestY = 650
  for (let i = 0; i < 32; i++) {
    const baseX = WORLD_WIDTH - 20 // near right edge
    const worldX = baseX + i
    const worldY = wrapTestY

    const drawAt = (wx: number): void => {
      const screenPosX = wx - screenX
      const screenPosY = worldY - screenY
      if (
        screenPosX < -SHARDHT ||
        screenPosX >= result.width ||
        screenPosY < -SHARDHT ||
        screenPosY >= result.height
      ) {
        return
      }

      const sprite = shardImages.getSprite(kind, testRotation)
      // Calculate alignment - matches original: (sp->x + sp->y) & 1
      const align = (wx + worldY) & 1
      const imageData =
        align === 0 ? sprite.images.background1 : sprite.images.background2

      const uint16Def = new Uint16Array(imageData.length / 2)
      for (let j = 0; j < uint16Def.length; j++) {
        uint16Def[j] = (imageData[j * 2]! << 8) | imageData[j * 2 + 1]!
      }

      result = drawShard({
        x: screenPosX,
        y: screenPosY,
        def: uint16Def,
        height: SHARDHT
      })(result)
    }

    // Primary and wrapped positions
    drawAt(worldX)
    drawAt(worldX - WORLD_WIDTH)
    drawAt(worldX + WORLD_WIDTH)
  }

  return result
}

/**
 * Factory function to create bitmap renderer for shard test
 */
export const createShardTestBitmapRenderer =
  (spriteService: SpriteService): BitmapRenderer =>
  (bitmap, frame) => {
    // Handle keyboard input for viewport movement
    const moveSpeed = 1

    if (frame.keysDown.has('ArrowUp')) {
      viewportState.y = Math.max(0, viewportState.y - moveSpeed)
    }
    if (frame.keysDown.has('ArrowDown')) {
      viewportState.y = Math.min(
        WORLD_HEIGHT - bitmap.height,
        viewportState.y + moveSpeed
      )
    }
    if (frame.keysDown.has('ArrowLeft')) {
      viewportState.x = Math.max(0, viewportState.x - moveSpeed)
    }
    if (frame.keysDown.has('ArrowRight')) {
      viewportState.x = Math.min(
        WORLD_WIDTH - bitmap.width,
        viewportState.x + moveSpeed
      )
    }

    // Create shard images adapter
    const shardImages: ShardSpriteSet = {
      kinds: {} as Record<number, Record<number, ShardSprite>>,
      getSprite: (kind: number, rotation: number) => {
        const def = spriteService.getShardSprite(kind, rotation, {
          variant: 'def'
        })
        const mask = spriteService.getShardSprite(kind, rotation, {
          variant: 'mask'
        })
        const bg1 = spriteService.getShardSprite(kind, rotation, {
          variant: 'background1'
        })
        const bg2 = spriteService.getShardSprite(kind, rotation, {
          variant: 'background2'
        })
        return {
          def: def.uint8,
          mask: mask.uint8,
          images: {
            background1: bg1.uint8,
            background2: bg2.uint8
          }
        }
      }
    }

    // Render the test and get the updated bitmap
    let resultBitmap = shardTestBitmap({
      bitmap,
      shardImages,
      screenX: viewportState.x,
      screenY: viewportState.y
    })

    // Draw viewport position indicator in top-left corner for debugging
    // Just draw a small indicator box in the corner to show we're scrolling
    const finalBitmap = {
      ...resultBitmap,
      data: new Uint8Array(resultBitmap.data)
    }

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = 4 + i
        const y = 4 + j
        const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
        const bitIndex = 7 - (x % 8)
        finalBitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }

    return finalBitmap
  }
