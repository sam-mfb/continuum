/**
 * Fizz Sound Generator
 *
 * Recreates the planet fizz-out sound from the original Continuum game.
 * Based on do_fizz_sound() in Sound.c:299-326
 *
 * The original implementation:
 * - Uses random hiss patterns from hiss_rands array
 * - Plays for 80 cycles (fizzcount initialized to 80)
 * - Uses decreasing amplitude starting at fizzcount + 40 (120 down to 40)
 * - Creates a fizzing/dissolving sound effect
 * - Used when planet "fizzes out" at level completion
 *
 * Technical details:
 * - Similar to crack sound but longer duration and decreasing amplitude
 * - Amplitude starts at 120 and decreases to 40 over 80 cycles
 * - Creates effect of something dissolving or dissipating
 * - Followed by echo sound in the game's crackle() sequence
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { HISS_RANDS } from './hissRandsData'

// Constants from original
const FIZZ_CYCLES = 80 // Number of cycles to play
const FIZZ_AMP_OFFSET = 40 // Added to fizzcount for amplitude

export const createFizzGenerator = (): SampleGenerator => {
  // State variables
  let fizzcount = 0 // Countdown counter (also affects amplitude)
  let isActive = false
  let randIndex = 0 // Current position in hiss_rands
  let currentSign = 1 // Current amplitude sign (+1 or -1)
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

    if (!isActive || fizzcount === 0) {
      // Fill with silence
      buffer.fill(CENTER_VALUE)
      return buffer
    }

    // Calculate current amplitude (decreases as fizzcount decreases)
    const amplitude = fizzcount + FIZZ_AMP_OFFSET

    let bufferIndex = 0

    // Fill buffer with hiss pattern
    while (bufferIndex < CHUNK_SIZE) {
      // Need new random value?
      if (samplesRemaining === 0) {
        // Get next random value for sample count
        samplesRemaining = HISS_RANDS[randIndex]!
        randIndex = (randIndex + 1) & 0xff // Wrap at 256

        // Toggle sign
        currentSign = -currentSign
      }

      // Fill samples with current amplitude
      const samplesToWrite = Math.min(
        samplesRemaining,
        CHUNK_SIZE - bufferIndex
      )
      const signedAmplitude = amplitude * currentSign

      for (let i = 0; i < samplesToWrite; i++) {
        // Clamp to valid range (0-255)
        const sample = CENTER_VALUE + signedAmplitude
        buffer[bufferIndex++] = Math.max(0, Math.min(255, sample))
      }
      samplesRemaining -= samplesToWrite
    }

    // Decrement cycle counter once per chunk
    fizzcount--

    // Debug log periodically
    if (fizzcount % 20 === 0 || fizzcount < 5) {
      console.log(`Fizz sound: count=${fizzcount}, amplitude=${amplitude}`)
    }

    if (fizzcount === 0) {
      console.log('Fizz sound complete')
      isActive = false
    }

    return buffer
  }

  const reset = (): void => {
    // Initialize like in original start_sound()
    fizzcount = FIZZ_CYCLES
    isActive = true
    autoStart = false
    // Random starting position (original uses Random() & 31)
    randIndex = Math.floor(Math.random() * 32)
    currentSign = 1
    samplesRemaining = 0
    console.log(
      'Fizz generator reset - cycles:',
      fizzcount,
      'start index:',
      randIndex
    )
  }

  // Start the fizz sound
  const start = (): void => {
    console.log('Fizz sound starting - cycles:', FIZZ_CYCLES)
    reset()
  }

  // Stop the fizz sound
  const stop = (): void => {
    isActive = false
    fizzcount = 0
  }

  return {
    generateChunk,
    reset,
    // Extended interface for game integration
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
