import type { MonochromeBitmap, BitmapRenderer } from '@/bitmap'
import { createMonochromeBitmap as createBitmap } from '@/bitmap'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import type { ShardSpriteSet } from '@/figs/types'
import { drawShard } from '@/explosions/render/drawShard'
import { SHARDHT } from '@/figs/types'
import { store } from '@/store/store'
import { loadSprites } from '@/store/spritesSlice'
import type { RootState } from '@/store/store'

// State
let initializationComplete = false
let initializationError: Error | null = null

// Initialize sprites on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting shardTestBitmap initialization...')

    // Load sprites
    console.log('Loading sprites...')
    await store.dispatch(loadSprites()).unwrap()
    console.log('Sprites loaded successfully')

    initializationComplete = true
    console.log('shardTestBitmap initialization complete')
  } catch (error) {
    console.error('Error initializing shardTestBitmap:', error)
    initializationError = error as Error
  }
}

// Start initialization
void initializeGame()

/**
 * Test game for debugging shard rendering
 * Displays shards at different rotations and positions on a gray background
 */
export function shardTestBitmap(deps: {
  shardImages: ShardSpriteSet | null
}): MonochromeBitmap {
  const { shardImages } = deps

  // Create screen with gray dithered background
  let screen = createBitmap(SCRWTH, VIEWHT)

  // Fill with dithered gray pattern (alternating scanlines)
  for (let y = 0; y < VIEWHT; y++) {
    const pattern = y % 2 === 0 ? 0xaa : 0x55
    for (let x = 0; x < SCRWTH; x += 8) {
      const byteOffset = y * screen.rowBytes + Math.floor(x / 8)
      screen.data[byteOffset] = pattern
    }
  }

  if (!shardImages) {
    return screen
  }

  // Display shards in a grid pattern
  // Show all 16 rotations for kind 0 (first bunker type)
  const kind = 0
  const spacing = 40
  const startX = 20
  const startY = 20

  // Draw 4x4 grid of rotations (16 total)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const rotation = row * 4 + col
      const x = startX + col * spacing
      const y = startY + row * spacing

      // Get the sprite for this rotation
      const sprite = shardImages.getSprite(kind, rotation)

      // Calculate alignment based on world position
      const align = (x + y) & 1

      // Use pre-rendered image based on alignment
      const imageData =
        align === 0 ? sprite.images.background1 : sprite.images.background2

      // Convert Uint8Array to Uint16Array (big-endian)
      const uint16Def = new Uint16Array(imageData.length / 2)
      for (let i = 0; i < uint16Def.length; i++) {
        uint16Def[i] = (imageData[i * 2]! << 8) | imageData[i * 2 + 1]!
      }

      screen = drawShard({
        x,
        y,
        def: uint16Def,
        height: SHARDHT
      })(screen)

      // Draw rotation number below each shard
      // This is just for reference - we'll draw a simple marker
      const markerY = y + SHARDHT + 4
      if (markerY < VIEWHT) {
        const markerByteX = Math.floor(x / 8)
        const markerBit = 7 - (x % 8)
        const byteOffset = markerY * screen.rowBytes + markerByteX
        if (byteOffset < screen.data.length) {
          // Draw a small dot to mark the position
          screen.data[byteOffset]! |= 1 << markerBit
        }
      }
    }
  }

  // Also test different positions with same rotation
  // Draw a row of shards with rotation 0 at different x positions
  const testRotation = 0
  const testY = 200
  for (let i = 0; i < 8; i++) {
    const x = 10 + i * 20 // Vary x position to test different alignments

    const sprite = shardImages.getSprite(kind, testRotation)
    const align = (x + testY) & 1
    const imageData =
      align === 0 ? sprite.images.background1 : sprite.images.background2

    const uint16Def = new Uint16Array(imageData.length / 2)
    for (let j = 0; j < uint16Def.length; j++) {
      uint16Def[j] = (imageData[j * 2]! << 8) | imageData[j * 2 + 1]!
    }

    screen = drawShard({
      x,
      y: testY,
      def: uint16Def,
      height: SHARDHT
    })(screen)
  }

  // Test raw def data (no pre-rendering) for comparison
  // Draw another row using raw def data
  const rawTestY = 240
  for (let i = 0; i < 8; i++) {
    const x = 10 + i * 20

    const sprite = shardImages.getSprite(kind, testRotation)

    // Use raw def data instead of pre-rendered
    const defData = sprite.def
    const uint16Def = new Uint16Array(defData.length / 2)
    for (let j = 0; j < uint16Def.length; j++) {
      uint16Def[j] = (defData[j * 2]! << 8) | defData[j * 2 + 1]!
    }

    screen = drawShard({
      x,
      y: rawTestY,
      def: uint16Def,
      height: SHARDHT
    })(screen)
  }

  return screen
}

/**
 * Bitmap renderer for shard test
 */
export const shardTestBitmapRenderer: BitmapRenderer = bitmap => {
  // Check initialization status
  if (initializationError) {
    console.error('Initialization failed:', initializationError)
    bitmap.data.fill(0)
    return
  }

  if (!initializationComplete) {
    // Show loading screen
    bitmap.data.fill(0)
    return
  }

  // Get shard images from store
  const state = store.getState() as RootState
  const shardImages = state.sprites.allSprites?.shards || null

  // Render the static test
  const rendered = shardTestBitmap({ shardImages })

  // Copy rendered bitmap to output
  bitmap.data.set(rendered.data)
}
