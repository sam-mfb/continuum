/**
 * Ring Buffer Module
 *
 * Provides a circular buffer for audio sample management.
 * Used by the AudioWorklet processor to buffer 8-bit unsigned samples
 * and convert them to Float32 format for Web Audio API.
 *
 * Design:
 * - Power-of-2 size for efficient wraparound using bitwise AND
 * - Stores samples in 8-bit unsigned format (0-255, center=128)
 * - Converts to Float32 (-1.0 to 1.0) on read
 * - No dynamic allocation during audio processing
 */

import { convertSample } from './formatConverter'

// Center value for silence in 8-bit unsigned format
const CENTER_VALUE = 128

/**
 * Ring buffer interface for audio sample management
 */
export type RingBuffer = {
  /**
   * Write a single sample to the buffer
   * @param sample - 8-bit unsigned sample (0-255)
   * @returns true if written, false if buffer full
   */
  writeSample(sample: number): boolean

  /**
   * Write multiple samples to the buffer
   * @param samples - Array of 8-bit unsigned samples
   * @returns Number of samples actually written
   */
  writeSamples(samples: Uint8Array): number

  /**
   * Fill buffer with silence (center value)
   * @param count - Number of samples to fill
   */
  fillWithSilence(count: number): void

  /**
   * Read samples from buffer and convert to Float32
   * @param output - Float32Array to write converted samples
   * @param count - Number of samples to read
   * @returns Number of samples actually read
   */
  readSamples(output: Float32Array, count: number): number

  /**
   * Get number of samples available to read
   * @returns Available sample count
   */
  getAvailableSamples(): number

  /**
   * Check if buffer is full
   * @returns true if buffer is full
   */
  isFull(): boolean

  /**
   * Check if buffer is empty
   * @returns true if buffer is empty
   */
  isEmpty(): boolean

  /**
   * Reset buffer to initial state (filled with silence)
   */
  reset(): void
}

/**
 * Create a ring buffer for audio sample management
 *
 * @param size - Buffer size in samples (must be power of 2)
 * @returns RingBuffer instance
 * @throws Error if size is not a power of 2
 */
export function createRingBuffer(size: number): RingBuffer {
  // Validate size is power of 2
  if (size <= 0 || (size & (size - 1)) !== 0) {
    throw new Error(`Ring buffer size must be a power of 2, got ${size}`)
  }

  // Internal state
  const buffer = new Uint8Array(size)
  let writePosition = 0
  let readPosition = 0
  let count = 0 // Track number of samples in buffer

  // Mask for efficient wraparound (size - 1)
  const mask = size - 1

  /**
   * Fill buffer with silence starting at writePosition
   */
  function fillWithSilence(fillCount: number): void {
    const toFill = Math.min(fillCount, size - count)

    for (let i = 0; i < toFill; i++) {
      buffer[writePosition] = CENTER_VALUE
      writePosition = (writePosition + 1) & mask
      count++
    }
  }

  /**
   * Get number of samples available to read
   */
  function getAvailableSamples(): number {
    return count
  }

  /**
   * Write a single sample
   */
  function writeSample(sample: number): boolean {
    // Check if buffer is full
    if (count >= size) {
      return false
    }

    buffer[writePosition] = sample
    writePosition = (writePosition + 1) & mask
    count++
    return true
  }

  /**
   * Write multiple samples
   */
  function writeSamples(samples: Uint8Array): number {
    const toWrite = Math.min(samples.length, size - count)

    for (let i = 0; i < toWrite; i++) {
      buffer[writePosition] = samples[i]!
      writePosition = (writePosition + 1) & mask
      count++
    }

    return toWrite
  }

  /**
   * Read samples and convert to Float32
   */
  function readSamples(output: Float32Array, readCount: number): number {
    const toRead = Math.min(readCount, count)

    for (let i = 0; i < toRead; i++) {
      const sample = buffer[readPosition]!
      output[i] = convertSample(sample)
      readPosition = (readPosition + 1) & mask
      count--
    }

    return toRead
  }

  /**
   * Check if buffer is full
   */
  function isFull(): boolean {
    return count >= size
  }

  /**
   * Check if buffer is empty
   */
  function isEmpty(): boolean {
    return count === 0
  }

  /**
   * Reset buffer to initial state
   */
  function reset(): void {
    writePosition = 0
    readPosition = 0
    count = 0
    fillWithSilence(size)
  }

  // Fill buffer array with silence values (but don't advance positions/count)
  // This ensures the buffer contains silence for any uninitialized reads
  for (let i = 0; i < size; i++) {
    buffer[i] = CENTER_VALUE
  }

  // Return the ring buffer interface
  return {
    writeSample,
    writeSamples,
    fillWithSilence,
    readSamples,
    getAvailableSamples,
    isFull,
    isEmpty,
    reset
  }
}
