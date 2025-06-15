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

    // Get random starting position in hiss_rands (& 31 limits to 0-31)
    const randOffset = Math.floor(Math.random() * 32)
    
    // Fill buffer with random noise pattern
    let bufferIndex = 0
    let randIndex = randOffset
    // Original starts with 0x20 in D0, then ror.w #8 puts it in high byte
    // So it starts at 0x2000 >> 8 = 0x20 (32)
    let currentValue = CRACK_AMPLITUDE

    while (bufferIndex < CHUNK_SIZE) {
      // Toggle between 32 and 223 (255-32) (like original eori.w #0xFF00)
      currentValue = currentValue === CRACK_AMPLITUDE ? 255 - CRACK_AMPLITUDE : CRACK_AMPLITUDE
      
      // Get random value for period length (divide by 4 for crack)
      const period = HISS_RANDS[randIndex & 0xff]! >> 2
      
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
    console.log('Crack generator reset - cycles:', crackcount)
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
