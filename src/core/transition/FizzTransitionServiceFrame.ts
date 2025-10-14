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
import { SCRWTH, VIEWHT, SBARHT } from '@/core/screen'

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
  let starPositions: Set<number> = new Set() // Set of linear indices that are stars
  let totalPixels = 0 // Total pixels in viewport (SCRWTH × VIEWHT)
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
      const starPixels = generateStarmapPixels(starCount)

      // Calculate total pixels in viewport
      totalPixels = SCRWTH * VIEWHT

      // Convert star coordinates to linear indices and store in Set for fast lookup
      starPositions = new Set()
      for (const star of starPixels) {
        const linearIndex = star.y * SCRWTH + star.x
        starPositions.add(linearIndex)
      }

      // Generate LFSR-based reveal sequence for ALL screen pixels
      pixelRevealSequence = generatePixelSequence(totalPixels, seed)

      durationFrames = duration
      currentSeedIndex = 0
      framesGenerated = 0

      // Calculate how many seeds to advance per frame (matching original logic)
      if (duration > 0) {
        seedsPerFrame = Math.floor(totalPixels / duration)
      } else {
        seedsPerFrame = totalPixels
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
        // Add all pixels immediately (black background + white stars)
        for (let linearIndex = 0; linearIndex < totalPixels; linearIndex++) {
          const x = linearIndex % SCRWTH
          const y = Math.floor(linearIndex / SCRWTH) + SBARHT
          const isStarPosition = starPositions.has(linearIndex)

          result.push({
            id: `fizz-pixel-${linearIndex}`,
            type: 'pixel',
            z: zIndex,
            alpha: 1,
            point: { x, y },
            color: isStarPosition ? 'white' : 'black'
          })
        }
        // Add ship drawables (already at SHIP_FIZZ z-order)
        result.push(...shipDrawables)
        return result
      }

      // If not complete, advance the seed index for this frame
      if (framesGenerated < durationFrames) {
        currentSeedIndex = Math.min(
          currentSeedIndex + seedsPerFrame,
          totalPixels
        )
        framesGenerated++
      }

      // Start with cloned from frame drawables
      const drawables: Drawable[] = [...fromFrameDrawables]

      // Add ALL fizz pixels revealed so far (up to currentSeedIndex)
      for (let i = 0; i < currentSeedIndex; i++) {
        const linearIndex = pixelRevealSequence[i]
        if (linearIndex !== undefined && linearIndex < totalPixels) {
          // Convert linear index to x, y coordinates
          const x = linearIndex % SCRWTH
          const y = Math.floor(linearIndex / SCRWTH) + SBARHT

          // Check if this position is a star (white) or background (black)
          const isStarPosition = starPositions.has(linearIndex)

          drawables.push({
            id: `fizz-pixel-${linearIndex}`,
            type: 'pixel',
            z: zIndex,
            alpha: 1,
            point: { x, y },
            color: isStarPosition ? 'white' : 'black'
          })
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

      // Return all pixels (black background + white stars)
      const pixels: DrawablePixel[] = []
      for (let linearIndex = 0; linearIndex < totalPixels; linearIndex++) {
        const x = linearIndex % SCRWTH
        const y = Math.floor(linearIndex / SCRWTH) + SBARHT
        const isStarPosition = starPositions.has(linearIndex)

        pixels.push({
          id: `starmap-pixel-${linearIndex}`,
          type: 'pixel' as const,
          z: zIndex,
          alpha: 1,
          point: { x, y },
          color: isStarPosition ? 'white' : 'black'
        })
      }
      return pixels
    },

    reset(): void {
      fromFrameDrawables = []
      shipDrawables = []
      starPositions = new Set()
      totalPixels = 0
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
