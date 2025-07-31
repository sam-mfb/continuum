/**
 * Bunker Drawing
 *
 * Test game that displays all bunker sprites in the game.
 * Shows all 5 bunker types with their various rotations/animations.
 * Use arrow keys to move the viewport.
 *
 * This simulates the game's rendering approach where:
 * - The screen has a 24-pixel status bar at the top
 * - Bunkers are positioned in world coordinates
 * - World coordinates are transformed to viewport coordinates for rendering
 */

import type { BitmapRenderer } from '../../bitmap'
import { cloneBitmap } from '../../bitmap'
import { drawBunker, fullBunker } from '../../planet/render/bunker'
import {
  BUNKROTKINDS,
  BUNKER_ROTATIONS,
  type BunkerSprite,
  type BunkerKind
} from '../../figs'
import { buildGameStore } from './store'
import { loadSprites } from '../../store/spritesSlice'
import { SBARHT, VIEWHT } from '../../screen/constants'

// Constants from GW.h
const BUNKER_FRAMES = 8

// Create store instance and load sprites
const store = buildGameStore()
let spritesLoaded = false

// Load sprites on first use
const ensureSpritesLoaded = async (): Promise<void> => {
  if (!spritesLoaded) {
    await store.dispatch(loadSprites())
    spritesLoaded = true
  }
}

// Viewport state (world coordinates)
const viewportState = {
  x: 0,
  y: 0
}

// World dimensions
const WORLD_WIDTH = 1024
const WORLD_HEIGHT = 768

// Grid parameters for bunker layout (world coordinates)
const GRID_START_X = 50
const GRID_START_Y = 50
const GRID_SPACING_X = 100
const GRID_SPACING_Y = 80

// Helper to create a bitmap from sprite data
function spriteToBitmap(
  sprite: BunkerSprite,
  useBackground: boolean = false
): { data: Uint8Array; width: number; height: number; rowBytes: number } {
  const data = useBackground
    ? sprite.images.background1 || sprite.def
    : sprite.def
  return {
    data: new Uint8Array(data),
    width: 48,
    height: 48,
    rowBytes: 6
  }
}

// Animation state
let frameCounter = 0

/**
 * Renderer that displays all bunker sprites
 */
export const bunkerDrawRenderer: BitmapRenderer = (bitmap, frame, _env) => {
  // Ensure sprites are loaded
  const state = store.getState()
  if (!state.sprites.allSprites) {
    // Show loading message or return early
    void ensureSpritesLoaded()
    return
  }

  const bunkerSprites = state.sprites.allSprites.bunkers

  // Update animation counter
  frameCounter++

  // Handle keyboard input for viewport movement
  const moveSpeed = 10
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

  // First, fill the entire bitmap with white (0s)
  bitmap.data.fill(0)
  
  // Then set the status bar area to black (1s)
  for (let y = 0; y < SBARHT; y++) {
    for (let byteIdx = 0; byteIdx < bitmap.rowBytes; byteIdx++) {
      bitmap.data[y * bitmap.rowBytes + byteIdx] = 0xff
    }
  }
  
  // Draw the gray background pattern in the viewport area
  // Note: In the game, only the viewport area (below status bar) shows the game world
  for (let y = SBARHT; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Calculate world position for viewport area
      const worldX = x + viewportState.x
      const worldY = y - SBARHT + viewportState.y
      // Set pixel if worldX + worldY is even (creates fixed checkerboard)
      if ((worldX + worldY) % 2 === 0) {
        const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
        const bitIndex = 7 - (x % 8)
        bitmap.data[byteIndex]! |= 1 << bitIndex
      }
    }
  }

  let workingBitmap = cloneBitmap(bitmap)

  // Draw static wall/ground bunkers (kinds 0-1)
  for (let kind = 0; kind < BUNKROTKINDS; kind++) {
    const kindSprites = bunkerSprites.kinds[kind as BunkerKind] as Record<
      number,
      BunkerSprite
    >
    if (!kindSprites) continue

    // Display all 16 rotations
    for (let rot = 0; rot < BUNKER_ROTATIONS; rot++) {
      const sprite = kindSprites[rot]
      if (!sprite) continue

      // Calculate grid position in world coordinates
      const col = rot % 8
      const row = Math.floor(rot / 8) + kind * 2
      const worldX = GRID_START_X + col * GRID_SPACING_X
      const worldY = GRID_START_Y + row * GRID_SPACING_Y

      // Transform to viewport coordinates (relative to viewport top-left)
      const viewX = worldX - viewportState.x
      const viewY = worldY - viewportState.y

      // Skip if off screen (viewport is VIEWHT pixels tall)
      if (
        viewX < -48 ||
        viewX >= bitmap.width ||
        viewY < -48 ||
        viewY >= VIEWHT
      ) {
        continue
      }

      // Choose rendering function based on rotation
      // Note: The rendering functions expect viewport Y coordinates (0 = top of viewport)
      if (kind >= BUNKROTKINDS || rot <= 1 || rot >= 9) {
        // Use XOR-based rendering
        // Calculate alignment for background pattern (from Bunkers.c:145)
        const align = (worldX + worldY + viewportState.x + viewportState.y) & 1
        const defBitmap = spriteToBitmap(sprite, align === 1)
        workingBitmap = drawBunker({ x: viewX, y: viewY, def: defBitmap })(
          workingBitmap
        )
      } else {
        // Use mask-based rendering for side views
        const defBitmap = spriteToBitmap(sprite)
        const maskBitmap = {
          data: new Uint8Array(sprite.mask),
          width: 48,
          height: 48,
          rowBytes: 6
        }
        workingBitmap = fullBunker({
          x: viewX,
          y: viewY,
          def: defBitmap,
          mask: maskBitmap
        })(workingBitmap)
      }
    }
  }

  // Draw animated bunkers (kinds 2-4)
  for (let kind = BUNKROTKINDS; kind < 5; kind++) {
    const kindSprites = bunkerSprites.kinds[
      kind as BunkerKind
    ] as BunkerSprite[]
    if (!kindSprites || !Array.isArray(kindSprites)) continue

    // Calculate which frame to show (animate at 1/4 speed for visibility)
    const animFrame = Math.floor(frameCounter / 4) % BUNKER_FRAMES

    // Display current animation frame
    const sprite = kindSprites[animFrame]
    if (!sprite) continue

    // Calculate position in world coordinates - put animated bunkers below static ones
    const col = kind - BUNKROTKINDS
    const row = 4 + (kind - BUNKROTKINDS)
    const worldX = GRID_START_X + col * GRID_SPACING_X * 2
    const worldY = GRID_START_Y + row * GRID_SPACING_Y

    // Transform to viewport coordinates
    const viewX = worldX - viewportState.x
    const viewY = worldY - viewportState.y

    // Skip if off screen
    if (
      viewX < -48 ||
      viewX >= bitmap.width ||
      viewY < -48 ||
      viewY >= VIEWHT
    ) {
      continue
    }

    // Animated bunkers always use XOR rendering
    const align = (worldX + worldY + viewportState.x + viewportState.y) & 1
    const defBitmap = spriteToBitmap(sprite, align === 1)
    workingBitmap = drawBunker({ x: viewX, y: viewY, def: defBitmap })(
      workingBitmap
    )

    // Also show all 8 frames in a row for reference
    for (let frame = 0; frame < BUNKER_FRAMES; frame++) {
      const frameSprite = kindSprites[frame]
      if (!frameSprite) continue

      const frameWorldX = worldX + 150 + frame * 60
      const frameViewX = frameWorldX - viewportState.x
      const frameViewY = viewY

      if (
        frameViewX < -48 ||
        frameViewX >= bitmap.width ||
        frameViewY < -48 ||
        frameViewY >= VIEWHT
      ) {
        continue
      }

      const frameAlign =
        (frameWorldX + worldY + viewportState.x + viewportState.y) & 1
      const frameBitmap = spriteToBitmap(frameSprite, frameAlign === 1)
      workingBitmap = drawBunker({
        x: frameViewX,
        y: frameViewY,
        def: frameBitmap
      })(workingBitmap)
    }
  }

  // Copy rendered bitmap back
  bitmap.data.set(workingBitmap.data)

  // Add labels if viewport is at starting position
  if (viewportState.x === 0 && viewportState.y === 0) {
    // Draw text labels would go here - for now just show the layout
    // Row 0-1: WALLBUNK (16 rotations)
    // Row 2-3: DIFFBUNK (16 rotations)
    // Row 4: GROUNDBUNK (animated)
    // Row 5: FOLLOWBUNK (animated)
    // Row 6: GENERATORBUNK (animated)
  }
}
