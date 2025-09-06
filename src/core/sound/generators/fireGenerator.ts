/**
 * Fire Sound Generator
 *
 * Recreates the ship firing sound from the original Continuum game.
 * Based on do_fire_sound() in Sound.c:124-151
 *
 * The original implementation:
 * - Divides each 370-sample buffer into 6 chunks
 * - Decreases frequency by 1 for each chunk (creating steps)
 * - Each chunk has ~62 samples at a constant frequency
 * - Creates a stepped descending "pew" laser sound effect
 * - Uses sine wave lookup table for tone generation
 * - Stops when frequency drops below 5
 *
 * Technical details:
 * - Buffer is divided: 6 chunks × ~62 samples = 370 total
 * - Frequency decreases in steps, not continuously
 * - Phase accumulates across chunks for smooth waveform
 * - Original wrote to every other byte (stereo format)
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'
import { SINE_TABLE } from './sineTableData'

// Constants from original
const START_FREQ = 27 // Starting frequency parameter
const MIN_FREQ = 5 // Stop when frequency drops below this
const CHUNKS_PER_BUFFER = 6 // Divide buffer into 6 chunks (from asm: D3=5, loops 6 times)

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

    // Divide buffer into chunks like the original
    const samplesPerChunk = Math.floor(CHUNK_SIZE / CHUNKS_PER_BUFFER)
    let bufferIndex = 0

    // Process each chunk with decreasing frequency
    for (let chunk = 0; chunk < CHUNKS_PER_BUFFER; chunk++) {
      // Use current frequency for this chunk
      const chunkFreq = freq - chunk

      // Don't generate if frequency too low
      if (chunkFreq < MIN_FREQ) {
        // Fill rest with silence
        while (bufferIndex < CHUNK_SIZE) {
          buffer[bufferIndex++] = CENTER_VALUE
        }
        break
      }

      // Fill this chunk with constant frequency
      const chunkEnd = Math.min(bufferIndex + samplesPerChunk, CHUNK_SIZE)
      while (bufferIndex < chunkEnd) {
        // Use sine table lookup
        const tableIndex = phase & 0xff
        buffer[bufferIndex++] = SINE_TABLE[tableIndex]!

        // Advance phase by frequency
        phase = (phase + chunkFreq) & 0xff
      }
    }

    // After filling buffer, decrease base frequency and priority
    freq -= CHUNKS_PER_BUFFER - 1 // Net decrease of 5 per buffer
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
