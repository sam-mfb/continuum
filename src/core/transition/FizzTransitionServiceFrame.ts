/**
 * @fileoverview Frame-based fizz transition service - manages random dissolve transition for Frame renderer
 * Adapted from FizzTransitionService.ts for use with Frame-based rendering
 *
 * Used for planet completion transition effect, creating a "fizzing" dissolve
 * by progressively revealing starmap pixels in pseudo-random order.
 */

import type { DrawablePixel, Frame, Drawable } from '@lib/frame/types'
import { generateStarmapPixels } from '@render/transition/starmapPixels'
import { generatePixelSequence } from './lfsrUtils'

/**
 * Service type for managing Frame-based fizz transitions
 */
export type FizzTransitionServiceFrame = {
  /** Initialize with from frame, ship info, star count and duration */
  initialize(
    fromFrame: Frame,
    shipInfo: { x: number; y: number; rotation: number } | null,
    starCount: number,
    durationFrames: number
  ): void

  /** Get drawables for next frame of progressive reveal (returns complete frame) */
  getNextFrameDrawables(): Drawable[]

  /** Get all starmap pixels (for 'starmap' phase) */
  getAllStarmapPixels(): DrawablePixel[]

  /** Reset to uninitialized state */
  reset(): void

  /** Whether initialized */
  readonly isInitialized: boolean

  /** Whether all pixels revealed */
  readonly isComplete: boolean

  /** Current progress (0.0 to 1.0) */
  readonly progress: number
}

/**
 * Creates a Frame-based fizz transition service that can be initialized and reused.
 *
 * Uses the same LFSR pseudo-random sequence as the bitmap version,
 * but returns DrawablePixel objects instead of manipulating bitmaps.
 *
 * @param seed Optional LFSR seed (default: 4357 from original)
 * @param zIndex Z-order for pixels (default: 170 for FIZZ_PIXEL)
 * @returns FizzTransitionServiceFrame instance
 */
export function createFizzTransitionServiceFrame(
  seed = 4357,
  zIndex = 170,
  shipZIndex = 180
): FizzTransitionServiceFrame {
  // Service state
  let fromFrameDrawables: Drawable[] = []
  let shipDrawables: Drawable[] = []
  let starmapPixels: Array<{ x: number; y: number }> = []
  let pixelRevealSequence: number[] = []
  let currentSeedIndex = 0
  let seedsPerFrame = 0
  let durationFrames = 0
  let framesGenerated = 0
  let initialized = false

  return {
    initialize(
      fromFrame: Frame,
      ship: { x: number; y: number; rotation: number } | null,
      starCount: number,
      duration: number
    ): void {
      // Find all ship-related drawables in the fromFrame
      shipDrawables = []
      fromFrameDrawables = []

      if (ship) {
        // Extract ship (but not shadow) from the fromFrame and change its z-order
        for (const drawable of fromFrame.drawables) {
          if (drawable.type === 'sprite') {
            // Check if this is a ship sprite (not shadow)
            if (
              drawable.id.startsWith('ship-') &&
              !drawable.id.startsWith('shadow-ship-')
            ) {
              // Re-add with SHIP_FIZZ z-order
              shipDrawables.push({
                ...drawable,
                z: shipZIndex
              })
            } else {
              // Not the ship - keep in fromFrame (including shadow)
              fromFrameDrawables.push(drawable)
            }
          } else {
            // Not a sprite - keep in fromFrame
            fromFrameDrawables.push(drawable)
          }
        }
      } else {
        // No ship - just clone all drawables
        fromFrameDrawables = [...fromFrame.drawables]
      }

      // Generate random star coordinates
      starmapPixels = generateStarmapPixels(starCount)

      // Generate LFSR-based reveal sequence
      // We need enough seeds to cover all our pixels
      pixelRevealSequence = generatePixelSequence(starmapPixels.length, seed)

      durationFrames = duration
      currentSeedIndex = 0
      framesGenerated = 0

      // Calculate how many seeds to advance per frame (matching original logic)
      if (duration > 0) {
        seedsPerFrame = Math.floor(starmapPixels.length / duration)
      } else {
        seedsPerFrame = starmapPixels.length
      }

      initialized = true
    },

    getNextFrameDrawables(): Drawable[] {
      if (!initialized) {
        throw new Error('FizzTransitionServiceFrame not initialized')
      }

      // Handle instant transition
      if (durationFrames === 0) {
        const result: Drawable[] = [...fromFrameDrawables]
        result.push(...this.getAllStarmapPixels())
        // Add ship drawables (already at SHIP_FIZZ z-order)
        result.push(...shipDrawables)
        return result
      }

      // If not complete, advance the seed index for this frame
      if (framesGenerated < durationFrames) {
        currentSeedIndex = Math.min(
          currentSeedIndex + seedsPerFrame,
          starmapPixels.length
        )
        framesGenerated++
      }

      // Start with cloned from frame drawables
      const drawables: Drawable[] = [...fromFrameDrawables]

      // Add ALL fizz pixels revealed so far (up to currentSeedIndex)
      for (let i = 0; i < currentSeedIndex; i++) {
        const pixelIndex = pixelRevealSequence[i]
        if (pixelIndex !== undefined && pixelIndex < starmapPixels.length) {
          const pixel = starmapPixels[pixelIndex]
          if (pixel) {
            drawables.push({
              id: `fizz-pixel-${pixelIndex}`,
              type: 'pixel',
              z: zIndex,
              alpha: 1,
              point: { x: pixel.x, y: pixel.y },
              color: 'white'
            })
          }
        }
      }

      // Add ship drawables (already at SHIP_FIZZ z-order)
      drawables.push(...shipDrawables)

      return drawables
    },

    getAllStarmapPixels(): DrawablePixel[] {
      if (!initialized) {
        throw new Error('FizzTransitionServiceFrame not initialized')
      }

      // Return all pixels as DrawablePixels
      return starmapPixels.map((pixel, index) => ({
        id: `starmap-pixel-${index}`,
        type: 'pixel' as const,
        z: zIndex,
        alpha: 1,
        point: { x: pixel.x, y: pixel.y },
        color: 'white'
      }))
    },

    reset(): void {
      fromFrameDrawables = []
      shipDrawables = []
      starmapPixels = []
      pixelRevealSequence = []
      currentSeedIndex = 0
      seedsPerFrame = 0
      durationFrames = 0
      framesGenerated = 0
      initialized = false
    },

    get isInitialized(): boolean {
      return initialized
    },

    get isComplete(): boolean {
      if (!initialized) return false
      return framesGenerated >= durationFrames
    },

    get progress(): number {
      if (!initialized || durationFrames === 0) return 0
      return Math.min(1.0, framesGenerated / durationFrames)
    }
  }
}
