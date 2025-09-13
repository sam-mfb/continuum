/**
 * Fire Sound Generator
 *
 * Recreates the ship firing sound from the original Continuum game.
 * Based on do_fire_sound() in Sound.c:124-151
 *
 * The original implementation:
 * - Divides each 370-sample buffer into 5 chunks of 74 samples each
 * - Loops 6 times, decreasing frequency by 1 after each chunk
 * - Only fills 370 samples (5 full chunks), 6th iteration starts but buffer is full
 * - Creates a stepped descending "pew" laser sound effect
 * - Uses sine wave lookup table for tone generation
 * - Stops when frequency drops below 5
 *
 * Technical details:
 * - Buffer division: SNDBUFLEN/5 = 370/5 = 74 samples per chunk
 * - Frequency decreases after each chunk is generated
 * - Net frequency decrease: -5 per buffer (6 decrements, then +1)
 * - Phase accumulates across chunks for smooth waveform
 * - Original wrote to stereo buffer (every other byte), we use mono
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { SINE_TABLE } from './sineTableData'

// Constants from original
const START_FREQ = 27 // Starting frequency parameter
const MIN_FREQ = 5 // Stop when frequency drops below this
const CHUNKS_PER_BUFFER = 5 // Original divides into 5 chunks (SNDBUFLEN/5 = 74 samples each)

export const createFireGenerator = (): SampleGenerator => {
  // State variables (matching original)
  let freq = 0 // Current frequency (phase increment)
  let phase = 0 // Current position in sine table
  let isActive = false
  let priority = 70 // Track priority for debugging

  // Auto-start on creation for testing
  let autoStart = true

  const generateChunk = (): Uint8Array => {
    const buffer = new Uint8Array(CHUNK_SIZE)

    // Auto-start on first generation if enabled
    if (autoStart && !isActive) {
      start()
      autoStart = false
    }

    if (!isActive || freq < MIN_FREQ) {
      // Fill with silence
      buffer.fill(CENTER_VALUE)
      return buffer
    }

    // Divide buffer into 5 chunks like the original (SNDBUFLEN/5 = 74 samples)
    const samplesPerChunk = Math.floor(CHUNK_SIZE / CHUNKS_PER_BUFFER)
    let bufferIndex = 0
    let currentFreq = freq

    // Process 5 chunks that actually fit in the buffer
    for (let chunk = 0; chunk < CHUNKS_PER_BUFFER; chunk++) {
      // Don't generate if frequency too low
      if (currentFreq < MIN_FREQ) {
        // Fill rest with silence
        while (bufferIndex < CHUNK_SIZE) {
          buffer[bufferIndex++] = CENTER_VALUE
        }
        break
      }

      // Fill this chunk with current frequency
      const chunkEnd = Math.min(bufferIndex + samplesPerChunk, CHUNK_SIZE)
      while (bufferIndex < chunkEnd) {
        // Use sine table lookup
        const tableIndex = phase & 0xff
        buffer[bufferIndex++] = SINE_TABLE[tableIndex]!

        // Advance phase by frequency
        phase = (phase + currentFreq) & 0xff
      }

      // Decrement frequency after each chunk (like original: subq.w #1, freq(A5))
      currentFreq--
    }

    // Update the stored frequency
    // Original loops 6 times with decrement, then adds 1 back
    // But we only loop 5 times, so decrement once more to match
    currentFreq-- // 6th decrement that happens in original
    freq = currentFreq + 1 // Add 1 back like original
    priority -= 5

    // Debug log
    console.log(`Fire sound: freq=${freq}, priority=${priority}`)

    // Check if sound should end
    if (freq < MIN_FREQ) {
      console.log('Fire sound complete - frequency dropped below', MIN_FREQ)
      isActive = false
    }

    return buffer
  }

  const reset = (): void => {
    // Initialize like in original start_sound()
    freq = START_FREQ
    phase = 0
    priority = 70
    isActive = true
    autoStart = false
    console.log('Fire generator reset - starting frequency:', freq)
  }

  // Start the fire sound
  const start = (): void => {
    console.log('Fire sound starting - frequency:', START_FREQ)
    reset()
  }

  // Stop the fire sound
  const stop = (): void => {
    isActive = false
    freq = 0
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
