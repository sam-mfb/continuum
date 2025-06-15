/**
 * Crack Sound Generator
 *
 * Recreates the crack sound from the original Continuum game.
 * Based on do_crack_sound() in Sound.c:271-296
 *
 * The original implementation:
 * - Uses random hiss patterns from hiss_rands array
 * - Plays for 6 cycles (crackcount initialized to 6)
 * - Uses fixed amplitude of 0x20 (32)
 * - Creates a crackling/static sound effect
 * - Was defined but never actually used in the game
 *
 * Technical details:
 * - Reads random values from hiss_rands to control pattern timing
 * - Alternates between positive and negative amplitude
 * - Each random value determines how many samples at that amplitude
 * - Creates a pseudo-random noise pattern
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { HISS_RANDS } from './hissRandsData'

// Constants from original
const CRACK_CYCLES = 6 // Number of cycles to play
const CRACK_AMPLITUDE = 0x20 // Fixed amplitude (32)

export const createCrackGenerator = (): SampleGenerator => {
  // State variables
  let crackcount = 0 // Countdown counter
  let isActive = false
  let randIndex = 0 // Current position in hiss_rands
  let currentAmplitude = CRACK_AMPLITUDE
  let samplesRemaining = 0 // Samples left at current amplitude

  // Auto-start on creation for testing
  let autoStart = true

  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)

    // Auto-start on first generation if enabled
    if (autoStart && !isActive) {
      start()
      autoStart = false
    }

    if (!isActive || crackcount === 0) {
      // Fill with silence
      buffer.fill(CENTER_VALUE)
      return buffer
    }

    let bufferIndex = 0

    // Fill buffer with hiss pattern
    while (bufferIndex < CHUNK_SIZE) {
      // Need new random value?
      if (samplesRemaining === 0) {
        // Get next random value for sample count
        samplesRemaining = HISS_RANDS[randIndex]!
        randIndex = (randIndex + 1) & 0xff // Wrap at 256

        // Toggle amplitude
        currentAmplitude = -currentAmplitude
      }

      // Fill samples with current amplitude
      const samplesToWrite = Math.min(
        samplesRemaining,
        CHUNK_SIZE - bufferIndex
      )
      for (let i = 0; i < samplesToWrite; i++) {
        buffer[bufferIndex++] = CENTER_VALUE + currentAmplitude
      }
      samplesRemaining -= samplesToWrite
    }

    // Decrement cycle counter once per chunk
    crackcount--

    // Debug log
    if (crackcount === 0) {
      console.log('Crack sound complete')
      isActive = false
    }

    return buffer
  }

  const reset = (): void => {
    // Initialize like in original start_sound()
    crackcount = CRACK_CYCLES
    isActive = true
    autoStart = false
    // Random starting position (original uses Random() & 31)
    randIndex = Math.floor(Math.random() * 32)
    currentAmplitude = CRACK_AMPLITUDE
    samplesRemaining = 0
    console.log(
      'Crack generator reset - cycles:',
      crackcount,
      'start index:',
      randIndex
    )
  }

  // Start the crack sound
  const start = (): void => {
    console.log('Crack sound starting - cycles:', CRACK_CYCLES)
    reset()
  }

  // Stop the crack sound
  const stop = (): void => {
    isActive = false
    crackcount = 0
  }

  return {
    generateChunk,
    reset,
    // Extended interface for game integration
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
