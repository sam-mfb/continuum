/**
 * @fileoverview Frame-based fizz transition service - manages random dissolve transition for Frame renderer
 * Adapted from FizzTransitionService.ts for use with Frame-based rendering
 *
 * Used for planet completion transition effect, creating a "fizzing" dissolve
 * by progressively revealing starmap pixels in pseudo-random order.
 */

import type { DrawablePixel, Frame, Drawable } from '@lib/frame/types'
import { generateStarmapPixels } from '@render/transition/starmapPixels'
import { starmapPixelsToBitmap } from '@render/transition/starmapToBitmap'
import { advanceLFSR, shouldSkipSeed } from './lfsrUtils'
import { SCRWTH, VIEWHT, SBARHT, SBARSIZE } from '@/core/screen'
import type { MonochromeBitmap } from '@/lib/bitmap'

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
  let toBitmap: MonochromeBitmap | null = null // Starmap bitmap (black background + white stars)
  let accumulatedPixels: DrawablePixel[] = [] // Persistent accumulated pixels (like workingBitmap in original)
  let currentSeed = seed // Current LFSR seed position
  let seedsPerFrame = 0
  let durationFrames = 0
  let framesGenerated = 0
  let firstIteration = true
  let initialized = false

  /**
   * Process LFSR seed position and return DrawablePixels, matching original bitmap algorithm.
   * Each seed represents a bit position that spans multiple scanlines.
   *
   * @param s LFSR seed value (0-8191)
   * @returns Array of DrawablePixel for this seed position
   */
  const processSeedPosition = (s: number): DrawablePixel[] => {
    if (!toBitmap) return []

    // Skip seeds that are out of range
    if (shouldSkipSeed(s)) return []

    // Process 10 scanlines for most positions, 9 for edge cases
    const linesToProcess = s < 8040 ? 10 : 9

    // Convert seed to byte offset and bit position (same as original)
    const byteOffset = (s >> 3) << 1 // Divide by 8, multiply by 2 for word alignment
    const bitPosition = s & 7

    // Create bit mask for the specific bit (same as original)
    const bitMask = 0x8080 >> bitPosition

    const pixels: DrawablePixel[] = []

    // Process multiple scanlines for this bit position
    for (let line = 0; line < linesToProcess; line++) {
      // Calculate the actual byte offset in the bitmap (same as original)
      const offset = SBARSIZE + byteOffset + line * 2038 // 2038 = 2048-10, from original

      // Make sure we're within bounds
      if (offset + 1 < toBitmap.data.length) {
        // Extract high and low byte masks
        const highByteMask = (bitMask >> 8) & 0xff
        const lowByteMask = bitMask & 0xff

        // Extract bits from each byte
        const highByte = toBitmap.data[offset]!
        const lowByte = toBitmap.data[offset + 1]!
        const highBit = highByte & highByteMask
        const lowBit = lowByte & lowByteMask

        // Convert bitmap offset to base coordinates
        const viewportOffset = offset - SBARSIZE
        const row = Math.floor(viewportOffset / 64) // 64 bytes per row (512px / 8)
        const colByte = viewportOffset % 64

        // Create pixel from high byte
        const col1 = colByte * 8 + bitPosition
        if (row < VIEWHT && col1 < SCRWTH) {
          // Non-zero bit = black background, zero bit = white star
          const color1 = highBit !== 0 ? 'black' : 'white'
          pixels.push({
            id: `fizz-pixel-${col1}-${row}`,
            type: 'pixel',
            z: zIndex,
            alpha: 1,
            point: { x: col1, y: row + SBARHT },
            color: color1
          })
        }

        // Create pixel from low byte (8 pixels to the right)
        const col2 = colByte * 8 + bitPosition + 8
        if (row < VIEWHT && col2 < SCRWTH) {
          // Non-zero bit = black background, zero bit = white star
          const color2 = lowBit !== 0 ? 'black' : 'white'
          pixels.push({
            id: `fizz-pixel-${col2}-${row}`,
            type: 'pixel',
            z: zIndex,
            alpha: 1,
            point: { x: col2, y: row + SBARHT },
            color: color2
          })
        }
      }
    }

    return pixels
  }

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

      // Generate random star coordinates and create "to" bitmap (same as original)
      const starPixels = generateStarmapPixels(starCount)
      toBitmap = starmapPixelsToBitmap(starPixels)

      // Reset accumulated pixels (like cloning workingBitmap in original)
      accumulatedPixels = []

      durationFrames = duration
      currentSeed = seed
      framesGenerated = 0
      firstIteration = true

      // Calculate how many seeds to advance per frame (matching original logic)
      // Original uses 8192 LFSR seed positions
      if (duration > 0) {
        seedsPerFrame = Math.floor(8192 / duration)
      } else {
        seedsPerFrame = 8192
      }

      initialized = true
    },

    getNextFrameDrawables(): Drawable[] {
      if (!initialized || !toBitmap) {
        throw new Error('FizzTransitionServiceFrame not initialized')
      }

      // Handle instant transition - process all seeds at once
      if (durationFrames === 0) {
        // Clear and rebuild accumulated pixels with all seeds
        accumulatedPixels = []
        let s = seed
        let first = true

        while (first || s !== seed) {
          const pixels = processSeedPosition(s)
          accumulatedPixels.push(...pixels)
          s = advanceLFSR(s)
          first = false
        }

        framesGenerated = durationFrames
      }
      // Process seeds for this frame (matching original logic)
      else if (framesGenerated < durationFrames) {
        let seedsThisFrame = 0

        while (seedsThisFrame < seedsPerFrame) {
          // If we've cycled back to start (but not on first iteration), we're done
          if (!firstIteration && currentSeed === seed) {
            framesGenerated = durationFrames // Force completion
            break
          }

          // Process the position(s) for current seed and ADD to accumulated pixels
          const pixels = processSeedPosition(currentSeed)
          accumulatedPixels.push(...pixels)
          seedsThisFrame++

          // Always advance LFSR
          currentSeed = advanceLFSR(currentSeed)
          firstIteration = false
        }

        framesGenerated++
      }

      // Build final drawables: fromFrame + ALL accumulated pixels + ship
      const drawables: Drawable[] = [
        ...fromFrameDrawables,
        ...accumulatedPixels,
        ...shipDrawables
      ]

      return drawables
    },

    getAllStarmapPixels(): DrawablePixel[] {
      if (!initialized || !toBitmap) {
        throw new Error('FizzTransitionServiceFrame not initialized')
      }

      // Process all LFSR seeds to generate complete starmap
      const pixels: DrawablePixel[] = []
      let s = seed
      let first = true

      while (first || s !== seed) {
        const newPixels = processSeedPosition(s)
        pixels.push(...newPixels)
        s = advanceLFSR(s)
        first = false
      }

      return pixels
    },

    reset(): void {
      fromFrameDrawables = []
      shipDrawables = []
      toBitmap = null
      accumulatedPixels = []
      currentSeed = seed
      seedsPerFrame = 0
      durationFrames = 0
      framesGenerated = 0
      firstIteration = true
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
