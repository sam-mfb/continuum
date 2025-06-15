/**
 * Fuel Sound Generator
 *
 * Recreates the fuel pickup sound from the original Continuum game.
 * Based on do_fuel_sound() in Sound.c:248-256
 *
 * The original implementation:
 * - Creates 3 beeps by toggling between tone and silence
 * - Uses a counter (fuelcount) initialized to FUELBEEPS*2 << 2 (24)
 * - Decrements counter each frame and checks bit pattern: (--fuelcount >> 2) & 1
 * - When bit is 1: plays tone at frequency 26 (FUELBEEPFREQ)
 * - When bit is 0: plays silence
 * - Stops when counter reaches 0
 *
 * This creates a pattern over 24 frames:
 * Frames 0-3:   fuelcount=24-23, (23-20 >> 2) & 1 = 5-5 & 1 = 1 (tone)
 * Frames 4-7:   fuelcount=20-17, (19-16 >> 2) & 1 = 4-4 & 1 = 0 (silence)
 * Frames 8-11:  fuelcount=16-13, (15-12 >> 2) & 1 = 3-3 & 1 = 1 (tone)
 * Frames 12-15: fuelcount=12-9,  (11-8 >> 2) & 1 = 2-2 & 1 = 0 (silence)
 * Frames 16-19: fuelcount=8-5,   (7-4 >> 2) & 1 = 1-1 & 1 = 1 (tone)
 * Frames 20-23: fuelcount=4-1,   (3-0 >> 2) & 1 = 0-0 & 1 = 0 (silence)
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { SINE_TABLE } from './sineTableData'

// Constants from original
const FUELBEEPS = 3 // Number of beeps (from GW.h)
const FUELBEEPFREQ = 26 // Frequency parameter (from Sound.c)

export const createFuelGenerator = (): SampleGenerator => {
  // State variables
  let fuelcount = 0
  let phase = 0
  let isActive = false

  // Auto-start on creation for testing
  let autoStart = true

  // The frequency parameter is used directly as phase increment
  // In the original, phase is an 8-bit value that wraps at 256
  // Each sample, phase += freq (with 8-bit wraparound)
  const phaseIncrement = FUELBEEPFREQ

  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)

    // Auto-start on first generation if enabled
    if (autoStart && !isActive) {
      start()
      autoStart = false
    }

    if (!isActive || fuelcount === 0) {
      // Fill with silence
      buffer.fill(CENTER_VALUE)
      return buffer
    }

    // Generate samples based on the current state
    for (let i = 0; i < CHUNK_SIZE; i++) {
      // Check if we should play tone or silence
      // Using the same bit pattern check as original
      const playTone = ((fuelcount - 1) >> 2) & 1

      if (playTone) {
        // Use sine table lookup like original clear_tone()
        const tableIndex = Math.floor(phase) & 0xff // Ensure 0-255 range
        buffer[i] = SINE_TABLE[tableIndex]!
        // 8-bit phase increment with wraparound
        phase = (phase + phaseIncrement) & 0xff
      } else {
        // Silence
        buffer[i] = CENTER_VALUE
      }

      // In the original, fuelcount decrements once per frame
      // We need to simulate this at the sample level
      // Assuming ~60fps, that's about 370 samples per frame at 22.2kHz
      // So we decrement after each full chunk
    }

    // Decrement counter once per chunk (simulating once per frame)
    const prevCount = fuelcount
    fuelcount--

    // Debug: log beep pattern changes
    const prevTone = ((prevCount - 1) >> 2) & 1
    const nextTone = fuelcount > 0 ? ((fuelcount - 1) >> 2) & 1 : 0
    if (prevTone !== nextTone) {
      console.log(
        `Fuel sound: count=${fuelcount}, tone=${nextTone ? 'ON' : 'OFF'}`
      )
    }

    // Clear sound when done
    if (fuelcount === 0) {
      console.log('Fuel sound complete')
      isActive = false
    }

    return buffer
  }

  const reset = (): void => {
    // Initialize like in original start_sound()
    fuelcount = (FUELBEEPS * 2) << 2 // 3 * 2 * 4 = 24
    phase = 0
    isActive = true
    autoStart = false // Disable auto-start once manually started
    console.log('Fuel generator reset - fuelcount:', fuelcount)
  }

  // Start the fuel sound
  const start = (): void => {
    console.log(
      'Fuel sound starting - frequency:',
      FUELBEEPFREQ,
      'beeps:',
      FUELBEEPS
    )
    console.log(
      'Sine table sample values:',
      SINE_TABLE[0],
      SINE_TABLE[64],
      SINE_TABLE[128],
      SINE_TABLE[192]
    )
    console.log('Expected center value:', CENTER_VALUE)
    reset()
  }

  // Stop the fuel sound
  const stop = (): void => {
    isActive = false
    fuelcount = 0
    phase = 0
  }

  return {
    generateChunk,
    reset,
    // Extended interface for game integration
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
