/**
 * Buffer Manager for Sound System
 * Manages ring buffer of generated samples and handles misaligned requests
 * Based on Phase 4 of MIGRATION_PLAN.md
 *
 * ## Ring Buffer Design
 *
 * Uses a circular buffer to efficiently manage audio data without memory copies.
 * The buffer has a fixed size (8192 bytes) with read and write pointers that
 * wrap around when they reach the end.
 *
 * ## Overflow and Underflow Handling
 *
 * **Buffer Overflow** (write catches read):
 * - Occurs when generating data faster than consuming it
 * - Results in an error to prevent data corruption
 * - Prevention: Call getAvailableSamples() before generating to check space
 *
 * **Buffer Underflow** (read catches write):
 * - Automatically handled by generating more chunks as needed
 * - requestSamples() will block until enough data is available
 * - Never returns partial data
 *
 * ## Usage Guidelines
 *
 * 1. For real-time audio, check getAvailableSamples() regularly
 * 2. Consume data frequently enough to prevent overflow
 * 3. Buffer size (8192) provides ~46ms at 22.2kHz for timing variation
 * 4. Use getBufferState() to monitor buffer health
 */

import type { SampleGenerator } from './sampleGenerator'

export type BufferManager = {
  /**
   * Request samples from the buffer
   * Handles misaligned sizes (e.g., 512 samples from 370-byte chunks)
   *
   * @param sampleCount Number of samples to read
   * @returns Exactly sampleCount bytes of audio data
   * @throws Error if buffer overflow occurs during generation
   *
   * Note: This method blocks until enough data is available.
   * It will never return partial data.
   */
  requestSamples(sampleCount: number): Uint8Array

  /**
   * Get the number of available samples in the buffer
   *
   * @returns Number of samples that can be read without triggering generation
   *
   * Use this to:
   * - Check buffer health (low values indicate risk of blocking)
   * - Avoid overflow (ensure space before external generation)
   * - Monitor performance (track fill level over time)
   */
  getAvailableSamples(): number

  /**
   * Switch to a different sample generator
   *
   * @param generator The new generator to use
   * @param onSoundEnded Optional callback to fire when the sound ends
   * 
   * Note: Existing buffered data remains unchanged. Only affects
   * future generation when more samples are needed.
   */
  setGenerator(generator: SampleGenerator, onSoundEnded?: () => void): void

  /**
   * Get current buffer state for debugging/testing
   *
   * @returns Object with read/write positions and available samples
   *
   * Use this to debug issues:
   * - available near 0: Risk of blocking on next read
   * - available near 8192: Risk of overflow
   * - Positions help visualize wraparound behavior
   */
  getBufferState(): {
    writePosition: number
    readPosition: number
    available: number
  }

  /**
   * Reset buffer to initial state
   *
   * Warning: Discards all buffered data. Use with caution in real-time contexts.
   */
  reset(): void
}

/**
 * Creates a new buffer manager instance
 */
export const createBufferManager = (
  generator: SampleGenerator
): BufferManager & { setVolume: (volume: number) => void } => {
  const CHUNK_SIZE = 370
  const BUFFER_SIZE = 8192 // Must be power of 2 for efficient wrapping

  const buffer = new Uint8Array(BUFFER_SIZE)
  let writePosition = 0
  let readPosition = 0
  let currentGenerator = generator
  let currentVolume = 1.0 // Master volume (0.0 to 1.0)
  let onSoundEnded: (() => void) | undefined = undefined
  let hasReportedEnded = false

  /**
   * Get the number of available samples in the buffer
   *
   * Handles wraparound case where write position has wrapped but read hasn't.
   * For example:
   * - Normal case: write=5000, read=3000, available=2000
   * - Wrapped case: write=1000, read=7000, available=-6000+8192=2192
   */
  const getAvailableSamples = (): number => {
    const available = writePosition - readPosition
    return available >= 0 ? available : available + BUFFER_SIZE
  }

  /**
   * Generate a new chunk and add it to the buffer
   *
   * @throws Error if buffer overflow occurs (write position catches read position)
   *
   * Buffer overflow means we're trying to overwrite unread data. This is a fatal
   * error because it would corrupt audio data. To prevent overflow:
   * - Consume data more frequently (smaller, more frequent reads)
   * - Check getAvailableSamples() before calling methods that trigger generation
   * - Use a larger buffer size if needed (currently 8192 bytes)
   */
  const generateChunk = (): void => {
    const chunk = currentGenerator.generateChunk()
    
    // Check if the sound has ended (for discrete sounds)
    if (!hasReportedEnded && currentGenerator.hasEnded?.()) {
      hasReportedEnded = true
      if (onSoundEnded) {
        onSoundEnded()
      }
    }

    if (chunk.length !== CHUNK_SIZE) {
      throw new Error(
        `Generator returned ${chunk.length} bytes, expected ${CHUNK_SIZE}`
      )
    }

    // Copy chunk to ring buffer with wraparound and apply volume
    for (let i = 0; i < chunk.length; i++) {
      // Apply volume by scaling the sample value around center (128)
      const sample = chunk[i]!
      const centered = sample - 128
      const scaled = Math.round(centered * currentVolume)
      buffer[writePosition] = Math.max(0, Math.min(255, scaled + 128))

      // Advance write position with wraparound at buffer size
      // Using bitwise AND with (BUFFER_SIZE - 1) is equivalent to modulo
      // but faster. Works because BUFFER_SIZE is a power of 2.
      writePosition = (writePosition + 1) & (BUFFER_SIZE - 1)

      // Check for buffer overflow: write position catching up to read position
      // This means we're about to overwrite unread data
      if (writePosition === readPosition) {
        throw new Error(
          'Buffer overflow: write position caught up to read position. ' +
            'Buffer is full with unread data. Consumer needs to read more frequently.'
        )
      }
    }
  }

  /**
   * Ensure at least the requested number of samples are available
   *
   * This prevents buffer underflow by generating chunks until we have enough data.
   * Buffer underflow would mean trying to read data that hasn't been generated yet.
   *
   * Unlike overflow (which is an error), underflow is handled automatically by
   * generating more data. This means requestSamples() may block while generating,
   * which is acceptable for initialization but could cause audio glitches in
   * real-time contexts if the buffer runs too low.
   */
  const ensureAvailable = (sampleCount: number): void => {
    while (getAvailableSamples() < sampleCount) {
      generateChunk()
    }
  }

  /**
   * Request samples from the buffer
   */
  const requestSamples = (sampleCount: number): Uint8Array => {
    const result = new Uint8Array(sampleCount)

    // Ensure we have enough samples available
    ensureAvailable(sampleCount)

    // Copy samples from ring buffer
    for (let i = 0; i < sampleCount; i++) {
      result[i] = buffer[readPosition]!
      readPosition = (readPosition + 1) & (BUFFER_SIZE - 1)
    }

    return result
  }

  /**
   * Switch to a different sample generator
   */
  const setGenerator = (generator: SampleGenerator, onEnded?: () => void): void => {
    currentGenerator = generator
    onSoundEnded = onEnded
    hasReportedEnded = false
  }

  /**
   * Get current buffer state for debugging/testing
   */
  const getBufferState = (): {
    writePosition: number
    readPosition: number
    available: number
  } => {
    return {
      writePosition,
      readPosition,
      available: getAvailableSamples()
    }
  }

  /**
   * Reset buffer to initial state
   */
  const reset = (): void => {
    writePosition = 0
    readPosition = 0
  }

  /**
   * Set the master volume
   * @param volume - Volume level from 0 to 1
   */
  const setVolume = (volume: number): void => {
    currentVolume = Math.max(0, Math.min(1, volume))
  }

  // Return the public interface
  return {
    requestSamples,
    getAvailableSamples,
    setGenerator,
    getBufferState,
    reset,
    setVolume
  }
}
