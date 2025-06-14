/**
 * Buffer Manager for Sound System
 * Manages ring buffer of generated samples and handles misaligned requests
 * Based on Phase 4 of MIGRATION_PLAN.md
 */

export type SampleGenerator = {
  generate(): Uint8Array
}

export class BufferManager {
  private static readonly CHUNK_SIZE = 370
  private static readonly BUFFER_SIZE = 8192 // Must be power of 2 for efficient wrapping

  private buffer: Uint8Array
  private writePosition: number = 0
  private readPosition: number = 0
  private generator: SampleGenerator

  constructor(generator: SampleGenerator) {
    this.generator = generator
    this.buffer = new Uint8Array(BufferManager.BUFFER_SIZE)
  }

  /**
   * Request samples from the buffer
   * Handles misaligned sizes (e.g., 512 samples from 370-byte chunks)
   */
  requestSamples(sampleCount: number): Uint8Array {
    const result = new Uint8Array(sampleCount)

    // Ensure we have enough samples available
    this.ensureAvailable(sampleCount)

    // Copy samples from ring buffer
    for (let i = 0; i < sampleCount; i++) {
      result[i] = this.buffer[this.readPosition]!
      this.readPosition =
        (this.readPosition + 1) & (BufferManager.BUFFER_SIZE - 1)
    }

    return result
  }

  /**
   * Get the number of available samples in the buffer
   */
  getAvailableSamples(): number {
    const available = this.writePosition - this.readPosition
    return available >= 0 ? available : available + BufferManager.BUFFER_SIZE
  }

  /**
   * Switch to a different sample generator
   */
  setGenerator(generator: SampleGenerator): void {
    this.generator = generator
  }

  /**
   * Get current buffer state for debugging/testing
   */
  getBufferState(): {
    writePosition: number
    readPosition: number
    available: number
  } {
    return {
      writePosition: this.writePosition,
      readPosition: this.readPosition,
      available: this.getAvailableSamples()
    }
  }

  /**
   * Reset buffer to initial state
   */
  reset(): void {
    this.writePosition = 0
    this.readPosition = 0
  }

  /**
   * Ensure at least the requested number of samples are available
   */
  private ensureAvailable(sampleCount: number): void {
    while (this.getAvailableSamples() < sampleCount) {
      this.generateChunk()
    }
  }

  /**
   * Generate a new chunk and add it to the buffer
   */
  private generateChunk(): void {
    const chunk = this.generator.generate()

    if (chunk.length !== BufferManager.CHUNK_SIZE) {
      throw new Error(
        `Generator returned ${chunk.length} bytes, expected ${BufferManager.CHUNK_SIZE}`
      )
    }

    // Copy chunk to ring buffer
    for (let i = 0; i < chunk.length; i++) {
      this.buffer[this.writePosition] = chunk[i]!
      this.writePosition =
        (this.writePosition + 1) & (BufferManager.BUFFER_SIZE - 1)

      // Check for buffer overflow
      if (this.writePosition === this.readPosition) {
        throw new Error(
          'Buffer overflow: write position caught up to read position'
        )
      }
    }
  }
}
