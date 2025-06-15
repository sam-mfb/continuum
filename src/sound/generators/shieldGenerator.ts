/**
 * Shield Sound Generator
 *
 * Recreates the shield sound from the original Continuum game.
 * Based on do_shld_sound() in Sound.c:236-246
 *
 * The original implementation:
 * - Uses unclear_tone() to generate a square wave
 * - Alternates between frequency 50 and 52 (SHLD_FREQ and SHLD_FREQ + 2)
 * - Uses fixed amplitude of 96
 * - Creates a buzzing/warbling effect by alternating frequencies
 */

import type { SampleGenerator } from '../sampleGenerator'

// Constants from original
const SHLD_FREQ = 50 // Base frequency parameter
const AMPLITUDE = 96 // Fixed amplitude from original
const CHUNK_SIZE = 370 // Samples per chunk

export const createShieldGenerator = (): SampleGenerator => {
  // Track which frequency we're using (alternates each chunk)
  let useHighFreq = false

  // Whether shield is active (would be controlled by game state)
  let isShielding = true

  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)

    if (!isShielding) {
      // Fill with silence (0x80 center value)
      buffer.fill(0x80)
      return buffer
    }

    // Toggle frequency for this chunk
    useHighFreq = !useHighFreq
    const freq = useHighFreq ? SHLD_FREQ + 2 : SHLD_FREQ

    // Generate square wave using the "unclear_tone" algorithm
    // The original writes every other sample (addq.w #2, A0)
    let bufferIndex = 0
    let currentAmplitude = AMPLITUDE

    while (bufferIndex < CHUNK_SIZE) {
      // Negate amplitude (square wave alternation)
      currentAmplitude = -currentAmplitude

      // Write 'freq' samples with the current amplitude
      // In the original, the inner loop writes the same value 'freq' times
      // but skips every other byte, so effectively freq/2 samples
      const samplesToWrite = Math.min(freq, CHUNK_SIZE - bufferIndex)

      for (let i = 0; i < samplesToWrite && bufferIndex < CHUNK_SIZE; i++) {
        // Convert signed amplitude to unsigned 8-bit
        // Original uses signed bytes, we need unsigned
        buffer[bufferIndex] = 128 + currentAmplitude
        bufferIndex++
      }
    }

    return buffer
  }

  const reset = (): void => {
    useHighFreq = false
    isShielding = true
  }

  // Additional methods for game control
  const setShielding = (shielding: boolean): void => {
    isShielding = shielding
  }

  return {
    generateChunk,
    reset,
    // Extended interface for game integration
    setShielding
  } as SampleGenerator & { setShielding: (shielding: boolean) => void }
}
