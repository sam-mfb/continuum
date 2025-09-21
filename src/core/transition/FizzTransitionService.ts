/**
 * @fileoverview Fizz transition service - manages random dissolve transition between screens
 * Moved from screen/render/fizz.ts and refactored as a service
 *
 * Used for planet completion transition effect, creating a "fizzing" dissolve
 * from the completed planet view to a star pattern background.
 */

import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARSIZE } from '@core/screen'

/**
 * Service type for managing fizz transitions
 */
export type FizzTransitionService = {
  /** Initialize a new transition with bitmaps and duration */
  initialize(
    from: MonochromeBitmap,
    to: MonochromeBitmap,
    durationFrames: number
  ): void

  /** Generate the next frame of the transition */
  nextFrame(): MonochromeBitmap

  /** Get the source and target bitmaps */
  getImages(): { from: MonochromeBitmap | null; to: MonochromeBitmap | null }

  /** Reset to uninitialized state */
  reset(): void

  /** Whether the service has been initialized */
  readonly isInitialized: boolean

  /** Whether all frames have been generated */
  readonly isComplete: boolean

  /** Current progress (0.0 = just started, 1.0 = complete) */
  readonly progress: number
}

/**
 * Creates a fizz transition service that can be initialized and reused.
 *
 * The service uses a Linear Feedback Shift Register (LFSR) pseudo-random
 * number generator that visits every number in its range exactly once
 * before repeating. This ensures every pixel transitions exactly once
 * for a complete dissolve.
 *
 * @param seed Optional LFSR seed (default: 4357 from original)
 * @returns FizzTransitionService instance
 */
export function createFizzTransitionService(
  seed = 4357
): FizzTransitionService {
  // Service state
  let from: MonochromeBitmap | null = null
  let to: MonochromeBitmap | null = null
  let durationFrames = 0
  let currentSeed = seed
  let workingBitmap: MonochromeBitmap | null = null
  let framesGenerated = 0
  let firstIteration = true
  let seedsPerFrame = 0
  let initialized = false

  // Process multiple scanlines for a given LFSR seed position
  const processSeedPosition = (s: number): number => {
    if (!workingBitmap || !to) return 0

    // Seeds >= 8152 (8192-40) are skipped in original
    if (s >= 8152) return 0

    // Process 10 scanlines for most positions, 9 for edge cases
    const linesToProcess = s < 8040 ? 10 : 9

    // Convert seed to byte offset and bit position
    const byteOffset = (s >> 3) << 1 // Divide by 8, multiply by 2 for word alignment
    const bitPosition = s & 7

    // Create bit mask for the specific bit
    const bitMask = 0x8080 >> bitPosition

    let pixelsProcessed = 0

    // Process multiple scanlines for this bit position
    for (let line = 0; line < linesToProcess; line++) {
      // Calculate the actual byte offset in the bitmap
      const offset = SBARSIZE + byteOffset + line * 2038 // 2038 = 2048-10, from original

      // Make sure we're within bounds
      if (
        offset + 1 < to.data.length &&
        offset + 1 < workingBitmap.data.length
      ) {
        // Read word (2 bytes) from "to" bitmap
        const toWord = (to.data[offset]! << 8) | to.data[offset + 1]!

        // Extract the specific bit from source
        const bitValue = toWord & bitMask

        // Read current word from working bitmap
        const workingWord =
          (workingBitmap.data[offset]! << 8) | workingBitmap.data[offset + 1]!

        // Clear the bit in working bitmap and set it from "to"
        const notMask = ~bitMask & 0xffff
        const newWord = (workingWord & notMask) | bitValue

        // Write back to working bitmap
        workingBitmap.data[offset] = (newWord >> 8) & 0xff
        workingBitmap.data[offset + 1] = newWord & 0xff

        pixelsProcessed++
      }
    }

    return pixelsProcessed
  }

  // Advance LFSR to next value
  const advanceLFSR = (): void => {
    currentSeed = currentSeed << 1

    // Check bit 13 for feedback
    if (currentSeed & (1 << 13)) {
      // Apply XOR mask
      currentSeed ^= 4287
    }

    // Keep within 13-bit range
    currentSeed &= 0x1fff
  }

  return {
    initialize(
      fromBitmap: MonochromeBitmap,
      toBitmap: MonochromeBitmap,
      duration: number
    ): void {
      from = fromBitmap
      to = toBitmap
      durationFrames = duration
      currentSeed = seed
      workingBitmap = cloneBitmap(from)
      framesGenerated = 0
      firstIteration = true
      seedsPerFrame = Math.floor(8192 / durationFrames)
      initialized = true
    },

    getImages(): {
      from: MonochromeBitmap | null
      to: MonochromeBitmap | null
    } {
      return { from, to }
    },

    nextFrame(): MonochromeBitmap {
      if (!initialized || !from || !to || !workingBitmap) {
        throw new Error('FizzTransitionService not initialized')
      }

      // Handle instant transition
      if (durationFrames === 0) {
        return cloneBitmap(to)
      }

      if (framesGenerated >= durationFrames) {
        // Already complete, return final state
        return cloneBitmap(to)
      }

      // Process seeds for this frame
      let seedsThisFrame = 0

      while (seedsThisFrame < seedsPerFrame) {
        // If we've cycled back to start (but not on first iteration), we're done
        if (!firstIteration && currentSeed === seed) {
          framesGenerated = durationFrames // Force completion
          return cloneBitmap(to)
        }

        // Process the position(s) for current seed
        processSeedPosition(currentSeed)
        seedsThisFrame++

        // Always advance LFSR
        advanceLFSR()
        firstIteration = false
      }

      framesGenerated++

      // Return a clone to maintain immutability
      return cloneBitmap(workingBitmap)
    },

    reset(): void {
      from = null
      to = null
      durationFrames = 0
      currentSeed = seed
      workingBitmap = null
      framesGenerated = 0
      firstIteration = true
      seedsPerFrame = 0
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
