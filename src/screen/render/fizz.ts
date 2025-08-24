/**
 * @fileoverview Fizz effect - random dissolve transition between two screens
 * Corresponds to fizz() in orig/Sources/Draw.c:1587-1645
 *
 * Used for planet completion transition effect, creating a "fizzing" dissolve
 * from the completed planet view to a star pattern background.
 *
 * Uses a Linear Feedback Shift Register (LFSR) pseudo-random number generator
 * that visits every number in its range exactly once before repeating.
 * This ensures every pixel transitions exactly once for a complete dissolve.
 */

import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARSIZE } from '@/screen/constants'

/**
 * Creates a complete random dissolve effect from one screen to another.
 *
 * The effect works by randomly copying pixels from the source bitmap
 * to create a "fizzing" transition. Uses an LFSR algorithm to ensure
 * each pixel position is visited exactly once before the transition completes.
 *
 * Implementation notes:
 * - Uses a 13-bit LFSR with seed 4357 and XOR mask 4287
 * - These magic numbers create a maximal-length sequence
 * - Processes pixels in groups of 10 scanlines for efficiency
 * - Skips status bar area (starts at SBARSIZE)
 * - Always runs to completion (visits every pixel once)
 *
 * @param deps Dependencies object containing:
 *   @param from - Source bitmap to transition from
 * @returns Pure function that transforms a screen bitmap (the "to" screen)
 *
 * @see orig/Sources/Draw.c:1587-1645 fizz()
 * @see Knuth's "The Art of Computer Programming" for LFSR algorithm details
 */
export function fizz(deps: {
  from: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { from } = deps
    const to = cloneBitmap(screen)

    // Initialize LFSR with the same seed as original
    let seed = 4357
    const maxSeed = 8192 - 40 // Limit for valid pixel positions

    // Process pixels using LFSR sequence until we return to starting seed
    // This ensures every pixel position is visited exactly once
    while (true) {
      // Check if seed points to valid screen position
      if (seed < maxSeed) {
        // Calculate how many scanlines to process
        // Original processes 10 lines for most positions, 9 for edge cases
        const linesToProcess = seed < 8040 ? 10 : 9

        // Convert seed to byte offset and bit position
        // seed represents a bit position in the view area
        const byteOffset = (seed >> 3) << 1 // Divide by 8, multiply by 2 for word alignment
        const bitPosition = seed & 7

        // Create bit mask for the specific bit
        // 0x8080 has the same bit set in both bytes of a word
        const bitMask = 0x8080 >> bitPosition
        const notMask = ~bitMask & 0xffff

        // Process multiple scanlines for this bit position
        for (let line = 0; line < linesToProcess; line++) {
          const offset = SBARSIZE + byteOffset + line * 2038 // 2038 = 2048-10, from original

          if (offset + 1 < from.data.length && offset + 1 < to.data.length) {
            // Read word (2 bytes) from source
            const fromWord = (from.data[offset]! << 8) | from.data[offset + 1]!

            // Extract the specific bit from source
            const bitValue = fromWord & bitMask

            // Read current word from destination
            const toWord = (to.data[offset]! << 8) | to.data[offset + 1]!

            // Clear the bit in destination and set it from source
            const newWord = (toWord & notMask) | bitValue

            // Write back to destination
            to.data[offset] = (newWord >> 8) & 0xff
            to.data[offset + 1] = newWord & 0xff
          }
        }
      }

      // Advance LFSR to next pseudo-random value
      seed = seed << 1

      // Check bit 13 for feedback
      if (seed & (1 << 13)) {
        // Apply XOR mask - this is the "magic" that makes it maximal-length
        seed ^= 4287
      }

      // Keep within 13-bit range
      seed &= 0x1fff

      // Check if we've completed the full cycle
      if (seed === 4357) {
        break // Back to starting seed, we've visited every position
      }
    }

    return to
  }
}

/**
 * Progressive fizz transition object that maintains state across frames
 */
export type FizzTransition = {
  /** Generate the next frame of the transition */
  nextFrame(): MonochromeBitmap
  
  /** Current progress (0.0 = just started, 1.0 = complete) */
  readonly progress: number
  
  /** Whether all frames have been generated */
  readonly isComplete: boolean
  
  /** Reset to beginning (for reusability) */
  reset(): void
}

/**
 * Creates a progressive fizz transition that can be rendered over multiple frames.
 * 
 * This implementation maintains LFSR state between calls, allowing the fizz
 * effect to be spread over a specified number of frames for smooth animation.
 * 
 * @param deps Dependencies object containing:
 *   @param from - Source bitmap to transition from
 *   @param to - Target bitmap to transition to
 *   @param durationFrames - Number of intermediate frames (0 = instant, 1 = very fast)
 *   @param seed - Optional LFSR seed (default: 4357 from original)
 * @returns FizzTransition object with nextFrame() method
 * 
 * @example
 * ```typescript
 * const transition = createFizzTransition({
 *   from: grayScreen,
 *   to: starBackground,
 *   durationFrames: 40  // 2 seconds at 20 FPS
 * })
 * 
 * // In render loop:
 * const frame = transition.nextFrame()
 * bitmap.data.set(frame.data)
 * if (transition.isComplete) {
 *   // Transition finished
 * }
 * ```
 */
export function createFizzTransition(deps: {
  from: MonochromeBitmap
  to: MonochromeBitmap
  durationFrames: number
  seed?: number
}): FizzTransition {
  const { from, to, durationFrames, seed = 4357 } = deps
  
  // Handle instant transition
  if (durationFrames === 0) {
    return {
      nextFrame: (): MonochromeBitmap => cloneBitmap(to),
      progress: 1.0,
      isComplete: true,
      reset: (): void => {} // No-op for instant transition
    }
  }
  
  // Calculate how many LFSR iterations per frame
  // The LFSR has 8192 possible values, we want to spread them across durationFrames
  const seedsPerFrame = Math.floor(8192 / durationFrames)
  
  // Internal state
  let currentSeed = seed
  let workingBitmap = cloneBitmap(from) // Start with "from" and reveal "to"
  let framesGenerated = 0
  
  // Process multiple scanlines for a given LFSR seed position
  // This exactly mimics the original's byte-offset based approach
  const processSeedPosition = (s: number): number => {
    // Seeds >= 8152 (8192-40) are skipped in original
    if (s >= 8152) return 0
    
    // Process 10 scanlines for most positions, 9 for edge cases
    const linesToProcess = s < 8040 ? 10 : 9
    
    // Convert seed to byte offset and bit position - EXACTLY like original
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
      if (offset + 1 < to.data.length && offset + 1 < workingBitmap.data.length) {
        // Read word (2 bytes) from "to" bitmap
        const toWord = (to.data[offset]! << 8) | to.data[offset + 1]!
        
        // Extract the specific bit from source
        const bitValue = toWord & bitMask
        
        // Read current word from working bitmap
        const workingWord = (workingBitmap.data[offset]! << 8) | workingBitmap.data[offset + 1]!
        
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
  
  const nextFrame = (): MonochromeBitmap => {
    if (framesGenerated >= durationFrames) {
      // Already complete, return final state
      return cloneBitmap(to)
    }
    
    // Process seeds for this frame
    let seedsThisFrame = 0
    
    while (seedsThisFrame < seedsPerFrame) {
      // Process the position(s) for current seed
      processSeedPosition(currentSeed)
      seedsThisFrame++
      
      // Always advance LFSR
      advanceLFSR()
      
      // If we've cycled back to start, we're done
      if (currentSeed === seed) {
        framesGenerated = durationFrames // Force completion
        return cloneBitmap(to)
      }
    }
    
    framesGenerated++
    
    // Return a clone to maintain immutability
    return cloneBitmap(workingBitmap)
  }
  
  const reset = (): void => {
    currentSeed = seed
    workingBitmap = cloneBitmap(from)
    framesGenerated = 0
  }
  
  return {
    nextFrame,
    get progress(): number {
      return Math.min(1.0, framesGenerated / durationFrames)
    },
    get isComplete(): boolean {
      return framesGenerated >= durationFrames
    },
    reset
  }
}
