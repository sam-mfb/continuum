/**
 * Buffer Manager for Sound System
 * Manages ring buffer of generated samples and handles misaligned requests
 * Based on Phase 4 of MIGRATION_PLAN.md
 */

import type { SampleGenerator } from './sampleGenerator'

export type BufferManager = {
  /**
   * Request samples from the buffer
   * Handles misaligned sizes (e.g., 512 samples from 370-byte chunks)
   */
  requestSamples(sampleCount: number): Uint8Array
  
  /**
   * Get the number of available samples in the buffer
   */
  getAvailableSamples(): number
  
  /**
   * Switch to a different sample generator
   */
  setGenerator(generator: SampleGenerator): void
  
  /**
   * Get current buffer state for debugging/testing
   */
  getBufferState(): { writePosition: number; readPosition: number; available: number }
  
  /**
   * Reset buffer to initial state
   */
  reset(): void
}

/**
 * Creates a new buffer manager instance
 */
export const createBufferManager = (generator: SampleGenerator): BufferManager => {
  const CHUNK_SIZE = 370
  const BUFFER_SIZE = 8192 // Must be power of 2 for efficient wrapping
  
  const buffer = new Uint8Array(BUFFER_SIZE)
  let writePosition = 0
  let readPosition = 0
  let currentGenerator = generator

  /**
   * Get the number of available samples in the buffer
   */
  const getAvailableSamples = (): number => {
    const available = writePosition - readPosition
    return available >= 0 ? available : available + BUFFER_SIZE
  }

  /**
   * Generate a new chunk and add it to the buffer
   */
  const generateChunk = (): void => {
    const chunk = currentGenerator.generateChunk()

    if (chunk.length !== CHUNK_SIZE) {
      throw new Error(
        `Generator returned ${chunk.length} bytes, expected ${CHUNK_SIZE}`
      )
    }

    // Copy chunk to ring buffer
    for (let i = 0; i < chunk.length; i++) {
      buffer[writePosition] = chunk[i]!
      writePosition = (writePosition + 1) & (BUFFER_SIZE - 1)

      // Check for buffer overflow
      if (writePosition === readPosition) {
        throw new Error(
          'Buffer overflow: write position caught up to read position'
        )
      }
    }
  }

  /**
   * Ensure at least the requested number of samples are available
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
  const setGenerator = (generator: SampleGenerator): void => {
    currentGenerator = generator
  }

  /**
   * Get current buffer state for debugging/testing
   */
  const getBufferState = (): { writePosition: number; readPosition: number; available: number } => {
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

  // Return the public interface
  return {
    requestSamples,
    getAvailableSamples,
    setGenerator,
    getBufferState,
    reset
  }
}