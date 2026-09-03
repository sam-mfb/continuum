/**
 * @fileoverview Frame-based fizz transition service - manages random dissolve transition for Frame renderer
 * Adapted from FizzTransitionService.ts for use with Frame-based rendering
 *
 * Used for planet completion transition effect, creating a "fizzing" dissolve
 * by progressively revealing starmap pixels in pseudo-random order.
 */

import type { DrawableBitmap, Frame, Drawable } from '@lib/frame/types'
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

  /** Get the fully revealed starmap layer (for 'starmap' phase) */
  getStarmapDrawable(): DrawableBitmap

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
 * Turn one pixel of a layer opaque, black or white per the starmap bitmap.
 * Untouched pixels stay transparent so the layer beneath shows through.
 */
function revealPixel(
  layer: ImageData,
  x: number,
  y: number,
  black: boolean
): void {
  const i = (y * SCRWTH + x) * 4
  const value = black ? 0 : 255
  layer.data[i] = value
  layer.data[i + 1] = value
  layer.data[i + 2] = value
  layer.data[i + 3] = 255
}

/**
 * Creates a Frame-based fizz transition service that can be initialized and reused.
 *
 * Uses the same LFSR pseudo-random sequence as the bitmap version, revealing
 * into an ImageData layer that the renderer blits in one operation. A drawable
 * per pixel would mean ~163,000 objects built, sorted and painted every frame
 * by the end of the dissolve.
 *
 * Each frame gets its own layer: the previous one is copied, this frame's
 * pixels are revealed into the copy, and the copy is what goes into the frame.
 * A layer handed to a frame is never written to again, so a Frame stays an
 * immutable description of a picture. Measured in Chromium, the copy costs
 * 0.8ms per frame against 0.15ms for revealing into one shared layer; copying
 * per revealed pixel instead would be 4GB and 1.5s per frame.
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
  let revealedLayer: ImageData | null = null // Latest layer handed out; treated as read-only once built
  let currentSeed = seed // Current LFSR seed position
  let seedsPerFrame = 0
  let durationFrames = 0
  let framesGenerated = 0
  let firstIteration = true
  let initialized = false

  /** A transparent layer covering the viewport; lower layers show through */
  const createLayer = (): ImageData => new ImageData(SCRWTH, VIEWHT)

  /** A copy to reveal into, leaving the layer already handed out untouched */
  const copyLayer = (layer: ImageData): ImageData => {
    const copy = createLayer()
    copy.data.set(layer.data)
    return copy
  }

  const layerDrawable = (id: string, layer: ImageData): DrawableBitmap => ({
    id,
    type: 'bitmap',
    z: zIndex,
    alpha: 1,
    topLeft: { x: 0, y: SBARHT },
    imageData: layer
  })

  /**
   * Reveal the pixels for one LFSR seed position into a layer, matching the
   * original bitmap algorithm. Each seed covers a bit position across several
   * scanlines.
   *
   * @param s LFSR seed value (0-8191)
   * @param target Layer to reveal into
   */
  const revealSeedPosition = (s: number, target: ImageData): void => {
    if (!toBitmap) return

    // Skip seeds that are out of range
    if (shouldSkipSeed(s)) return

    // Process 10 scanlines for most positions, 9 for edge cases
    const linesToProcess = s < 8040 ? 10 : 9

    // Convert seed to byte offset and bit position (same as original)
    const byteOffset = (s >> 3) << 1 // Divide by 8, multiply by 2 for word alignment
    const bitPosition = s & 7

    // Create bit mask for the specific bit (same as original)
    const bitMask = 0x8080 >> bitPosition

    // Process multiple scanlines for this bit position
    for (let line = 0; line < linesToProcess; line++) {
      // Calculate the actual byte offset in the bitmap (same as original)
      const offset = SBARSIZE + byteOffset + line * 2038 // 2038 = 2048-10, from original

      // Make sure we're within bounds
      if (offset + 1 >= toBitmap.data.length) continue

      // Extract high and low byte masks
      const highByteMask = (bitMask >> 8) & 0xff
      const lowByteMask = bitMask & 0xff

      // Extract bits from each byte
      const highBit = toBitmap.data[offset]! & highByteMask
      const lowBit = toBitmap.data[offset + 1]! & lowByteMask

      // Convert bitmap offset to base coordinates
      const viewportOffset = offset - SBARSIZE
      const row = Math.floor(viewportOffset / 64) // 64 bytes per row (512px / 8)
      const colByte = viewportOffset % 64
      if (row >= VIEWHT) continue

      // Non-zero bit = black background, zero bit = white star
      const col1 = colByte * 8 + bitPosition
      if (col1 < SCRWTH) revealPixel(target, col1, row, highBit !== 0)

      // The low byte covers the 8 pixels to the right
      const col2 = col1 + 8
      if (col2 < SCRWTH) revealPixel(target, col2, row, lowBit !== 0)
    }
  }

  /** Reveal every seed position - the dissolve's finished state */
  const revealAll = (target: ImageData): void => {
    let s = seed
    let first = true
    while (first || s !== seed) {
      revealSeedPosition(s, target)
      s = advanceLFSR(s)
      first = false
    }
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

      // Start with nothing revealed (like cloning workingBitmap in original)
      revealedLayer = createLayer()

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
      if (!initialized || !toBitmap || !revealedLayer) {
        throw new Error('FizzTransitionServiceFrame not initialized')
      }

      // Handle instant transition - reveal everything on the first call
      if (durationFrames === 0) {
        if (framesGenerated === 0) {
          const finished = createLayer()
          revealAll(finished)
          revealedLayer = finished
          framesGenerated = 1
        }
      }
      // Reveal this frame's share of the seeds (matching original logic)
      else if (framesGenerated < durationFrames) {
        // Reveal into a copy so the layer the last frame received is untouched
        const nextLayer = copyLayer(revealedLayer)
        let seedsThisFrame = 0

        while (seedsThisFrame < seedsPerFrame) {
          // If we've cycled back to start (but not on first iteration), we're done
          if (!firstIteration && currentSeed === seed) {
            framesGenerated = durationFrames // Force completion
            break
          }

          revealSeedPosition(currentSeed, nextLayer)
          seedsThisFrame++

          // Always advance LFSR
          currentSeed = advanceLFSR(currentSeed)
          firstIteration = false
        }

        revealedLayer = nextLayer
        framesGenerated++
      }
      // Complete: nothing new to reveal, so the last layer still stands

      // Build final drawables: fromFrame + revealed layer + ship
      return [
        ...fromFrameDrawables,
        layerDrawable('fizz-layer', revealedLayer),
        ...shipDrawables
      ]
    },

    getStarmapDrawable(): DrawableBitmap {
      if (!initialized || !revealedLayer) {
        throw new Error('FizzTransitionServiceFrame not initialized')
      }

      // The dissolve reveals every seed position, so the layer it finishes
      // with is the starmap. Only finish the walk here if the starmap is
      // somehow asked for before the dissolve got there.
      if (framesGenerated < durationFrames) {
        const finished = copyLayer(revealedLayer)
        revealAll(finished)
        revealedLayer = finished
        framesGenerated = durationFrames
      }

      return layerDrawable('starmap-layer', revealedLayer)
    },

    reset(): void {
      fromFrameDrawables = []
      shipDrawables = []
      toBitmap = null
      revealedLayer = null
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
