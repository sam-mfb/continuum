/**
 * Echo Sound Generator
 *
 * Recreates the echo sound effect from the original Continuum game.
 * Based on do_echo_sound() in Sound.c:330-365
 *
 * The original implementation:
 * - Creates an echoing/fading noise effect that lasts 119 cycles
 * - Uses hiss_rands for noise generation
 * - Divides the sound into 6 "echoes" of 20 cycles each
 * - Within each echo, the first 15 cycles play noise, last 5 are silent
 * - Amplitude starts closer to center and moves outward with each echo
 * - Uses echostrs[] = {1, 2, 5, 9, 19, 37} to control fade rate
 * - Creates a decaying echo effect as the planet disappears
 *
 * Technical details:
 * - Total duration: 119 cycles (20*6 - 1)
 * - Each echo: 20 cycles (15 noise + 5 silence)
 * - Amplitude calculation: amp = 128 - (((15 - c1) * echostrs[c2]) >> 4)
 * - Uses same noise pattern as crack/fizz sounds
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { HISS_RANDS } from './hissRandsData'

// Constants from original
const ECHO_DURATION = 20 * 6 - 1 // Total cycles (119)
const CYCLES_PER_ECHO = 20 // Cycles in each echo
const NOISE_CYCLES = 15 // Cycles of noise per echo (rest is silence)
const ECHO_STRENGTHS = [1, 2, 5, 9, 19, 37] // Amplitude multipliers for each echo

export const createEchoGenerator = (): SampleGenerator => {
  // State variables
  let echocount = 0
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

    if (!isActive || echocount === 0) {
      // Fill with silence
      buffer.fill(CENTER_VALUE)
      if (isActive && echocount === 0) {
        console.log('Echo sound complete')
        isActive = false
      }
      return buffer
    }

    // Decrement counter
    echocount--

    // Calculate which echo we're in and position within it
    const c1 = echocount % CYCLES_PER_ECHO // Position within current echo (0-19)
    const c2 = Math.floor(echocount / CYCLES_PER_ECHO) // Which echo (0-5)

    // If in the silent part of the echo (last 5 cycles)
    if (c1 >= NOISE_CYCLES) {
      buffer.fill(CENTER_VALUE)
      return buffer
    }

    // Calculate amplitude for this cycle
    // Original: amp = 128 - (((15 - c1) * echostrs[c2]) >> 4)
    const amp =
      CENTER_VALUE - (((NOISE_CYCLES - c1) * ECHO_STRENGTHS[c2]!) >> 4)

    // Get random starting position in hiss_rands
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

    // Debug logging
    if (echocount % 20 === 19 || echocount < 5) {
      console.log(
        `Echo sound: count=${echocount}, echo=${c2}, pos=${c1}, amp=${amp}`
      )
    }

    return buffer
  }

  const reset = (): void => {
    echocount = ECHO_DURATION
    isActive = true
    autoStart = false
    console.log(`Echo generator reset - duration=${ECHO_DURATION} cycles`)
  }

  // Start the echo sound
  const start = (): void => {
    console.log('Echo sound starting')
    reset()
  }

  // Stop the echo sound
  const stop = (): void => {
    isActive = false
    echocount = 0
  }

  return {
    generateChunk,
    reset,
    // Extended interface for game integration
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
