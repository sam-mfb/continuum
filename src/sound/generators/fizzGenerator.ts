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
    // This is the actual sample value, not distance from center
    const amp = fizzcount + FIZZ_AMP_OFFSET

    // Get random starting position in hiss_rands (& 31 limits to 0-31)
    const randOffset = Math.floor(Math.random() * 32)

    // Fill buffer with random noise pattern
    let bufferIndex = 0
    let randIndex = randOffset
    let currentValue = amp // Start with amp value

    while (bufferIndex < CHUNK_SIZE) {
      // Toggle between amp and 255-amp (like original eori.w #0xFF00)
      currentValue = currentValue === amp ? 255 - amp : amp

      // Get random value for period length (divide by 2 like original)
      const period = HISS_RANDS[randIndex & 0xff]! >> 1

      // Each iteration in original writes 4 bytes (2 move.w instructions)
      // But we write 1 byte at a time, so multiply by 2 for same effect
      const samplesPerPeriod = (period + 1) * 2

      // Fill with current value for this period
      const count = Math.min(samplesPerPeriod, CHUNK_SIZE - bufferIndex)
      for (let i = 0; i < count; i++) {
        buffer[bufferIndex++] = currentValue
      }

      randIndex++
    }

    // Decrement cycle counter once per chunk
    fizzcount--

    // Debug log periodically
    if (fizzcount % 20 === 0 || fizzcount < 5) {
      console.log(`Fizz sound: count=${fizzcount}, amp=${amp}`)
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
    console.log('Fizz generator reset - cycles:', fizzcount)
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
