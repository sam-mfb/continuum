/**
 * @fileoverview Linear Feedback Shift Register (LFSR) utilities
 * Extracted from FizzTransitionService for reuse by both bitmap and frame renderers
 *
 * The LFSR is a pseudo-random number generator that visits every number
 * in its range exactly once before repeating. This ensures every pixel
 * transitions exactly once for a complete dissolve effect.
 *
 * Technical details:
 * - 13-bit LFSR (generates values 0-8191)
 * - Feedback on bit 13
 * - XOR mask: 4287
 * - Seeds >= 8152 (8192-40) are skipped in original implementation
 */

/**
 * Advance Linear Feedback Shift Register one step.
 *
 * Uses a 13-bit LFSR with feedback on bit 13 and XOR mask 4287.
 * The LFSR visits every number 0-8191 exactly once before cycling.
 *
 * @param currentSeed Current LFSR state
 * @returns Next LFSR state
 */
export function advanceLFSR(currentSeed: number): number {
  let seed = currentSeed << 1

  // Check bit 13 for feedback
  if (seed & (1 << 13)) {
    // Apply XOR mask
    seed ^= 4287
  }

  // Keep within 13-bit range
  seed &= 0x1fff

  return seed
}

/**
 * Check if a seed position should be skipped.
 *
 * Seeds >= 8152 (8192-40) are skipped in the original implementation.
 * This handles edge cases near the boundary of the 13-bit range.
 *
 * @param seed LFSR seed value to check
 * @returns true if seed should be skipped
 */
export function shouldSkipSeed(seed: number): boolean {
  return seed >= 8152
}

/**
 * Generate a sequence of pixel indices in LFSR visit order.
 *
 * Pre-generates the complete sequence that the LFSR will visit,
 * which can be used to progressively reveal pixels in a deterministic
 * pseudo-random order.
 *
 * @param totalPixels Total number of pixels to generate sequence for
 * @param initialSeed Starting seed for LFSR (default: 4357)
 * @returns Array of indices in visit order
 */
export function generatePixelSequence(
  totalPixels: number,
  initialSeed = 4357
): number[] {
  const sequence: number[] = []
  let seed = initialSeed
  let firstIteration = true

  // Generate sequence until we have enough pixels or cycle back to start
  while (sequence.length < totalPixels) {
    // Stop if we've cycled back to start (but not on first iteration)
    if (!firstIteration && seed === initialSeed) {
      break
    }

    // Only add non-skipped seeds
    if (!shouldSkipSeed(seed)) {
      sequence.push(seed)
    }

    seed = advanceLFSR(seed)
    firstIteration = false
  }

  return sequence
}
