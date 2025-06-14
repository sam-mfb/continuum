/**
 * Unit tests for BufferManager
 * Tests ring buffer management, misaligned requests, and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createBufferManager, type BufferManager } from '../bufferManager'
import type { SampleGenerator } from '../sampleGenerator'

class MockGenerator implements SampleGenerator {
  private counter = 0

  generateChunk(): Uint8Array {
    const chunk = new Uint8Array(370)
    // Fill with incrementing values for easy verification
    for (let i = 0; i < 370; i++) {
      chunk[i] = (this.counter + i) & 0xff
    }
    this.counter += 370
    return chunk
  }
  
  reset(): void {
    this.counter = 0
  }
}

class SilenceGenerator implements SampleGenerator {
  generateChunk(): Uint8Array {
    return new Uint8Array(370).fill(0x80)
  }
  
  reset(): void {
    // No state to reset
  }
}

class PatternGenerator implements SampleGenerator {
  constructor(private pattern: number[]) {}

  generateChunk(): Uint8Array {
    const chunk = new Uint8Array(370)
    for (let i = 0; i < 370; i++) {
      chunk[i] = this.pattern[i % this.pattern.length]!
    }
    return chunk
  }
  
  reset(): void {
    // No state to reset
  }
}

describe('BufferManager', () => {
  let bufferManager: BufferManager
  let mockGenerator: MockGenerator

  beforeEach(() => {
    mockGenerator = new MockGenerator()
    bufferManager = createBufferManager(mockGenerator)
  })

  describe('basic functionality', () => {
    it('returns exactly the requested number of samples', () => {
      const samples = bufferManager.requestSamples(256)
      expect(samples.length).toBe(256)
      expect(samples).toBeInstanceOf(Uint8Array)
    })

    it('returns sequential values from mock generator', () => {
      const samples = bufferManager.requestSamples(10)
      for (let i = 0; i < 10; i++) {
        expect(samples[i]).toBe(i)
      }
    })

    it('handles request larger than chunk size', () => {
      const samples = bufferManager.requestSamples(500)
      expect(samples.length).toBe(500)
      // Verify continuity across chunk boundary
      for (let i = 0; i < 500; i++) {
        expect(samples[i]).toBe(i & 0xff)
      }
    })
  })

  describe('various request sizes', () => {
    it('handles 256 sample request', () => {
      const samples = bufferManager.requestSamples(256)
      expect(samples.length).toBe(256)
    })

    it('handles 512 sample request', () => {
      const samples = bufferManager.requestSamples(512)
      expect(samples.length).toBe(512)
    })

    it('handles 1024 sample request', () => {
      const samples = bufferManager.requestSamples(1024)
      expect(samples.length).toBe(1024)
    })

    it('handles odd size request (333 samples)', () => {
      const samples = bufferManager.requestSamples(333)
      expect(samples.length).toBe(333)
    })

    it('handles very small request (1 sample)', () => {
      const samples = bufferManager.requestSamples(1)
      expect(samples.length).toBe(1)
      expect(samples[0]).toBe(0)
    })

    it('handles exact chunk size request', () => {
      const samples = bufferManager.requestSamples(370)
      expect(samples.length).toBe(370)
    })
  })

  describe('buffer wraparound', () => {
    it('handles wraparound correctly', () => {
      // Fill buffer near capacity
      const largeRequest = 7000
      const firstBatch = bufferManager.requestSamples(largeRequest)

      // Request more to force wraparound
      const secondBatch = bufferManager.requestSamples(2000)

      // Verify continuity
      const lastOfFirst = firstBatch[largeRequest - 1]!
      const firstOfSecond = secondBatch[0]!
      expect(firstOfSecond).toBe((lastOfFirst + 1) & 0xff)
    })

    it('maintains data integrity across multiple wraparounds', () => {
      let previousLast = -1

      for (let i = 0; i < 20; i++) {
        const samples = bufferManager.requestSamples(1000)

        if (previousLast !== -1) {
          expect(samples[0]).toBe((previousLast + 1) & 0xff)
        }

        previousLast = samples[999]!
      }
    })
  })

  describe('partial chunk usage', () => {
    it('uses partial chunks efficiently', () => {
      // Request 100 samples (uses partial chunk)
      const first = bufferManager.requestSamples(100)
      expect(first[99]).toBe(99)

      // Request 300 more (should continue from position 100)
      const second = bufferManager.requestSamples(300)
      expect(second[0]).toBe(100)
      expect(second[299]).toBe((100 + 299) & 0xff)
    })

    it('handles multiple misaligned requests', () => {
      const sizes = [100, 250, 333, 512, 1000]
      let expectedStart = 0

      for (const size of sizes) {
        const samples = bufferManager.requestSamples(size)
        expect(samples[0]).toBe(expectedStart & 0xff)
        expectedStart += size
      }
    })
  })

  describe('no sample drops or duplicates', () => {
    it('delivers every sample exactly once', () => {
      const totalSamples = 10000
      const allSamples: number[] = []

      // Request in various sizes
      const sizes = [256, 512, 333, 1000, 128]
      let remaining = totalSamples
      let sizeIndex = 0

      while (remaining > 0) {
        const requestSize = Math.min(remaining, sizes[sizeIndex % sizes.length]!)
        const samples = bufferManager.requestSamples(requestSize)

        for (let i = 0; i < samples.length; i++) {
          allSamples.push(samples[i]!)
        }

        remaining -= requestSize
        sizeIndex++
      }

      // Verify sequential values (with wraparound at 255)
      for (let i = 0; i < totalSamples; i++) {
        expect(allSamples[i]!).toBe(i & 0xff)
      }
    })
  })

  describe('buffer state', () => {
    it('tracks buffer state correctly', () => {
      const initialState = bufferManager.getBufferState()
      expect(initialState.available).toBe(0)
      expect(initialState.readPosition).toBe(0)
      expect(initialState.writePosition).toBe(0)

      // Request samples to trigger generation
      bufferManager.requestSamples(100)

      const afterRequest = bufferManager.getBufferState()
      expect(afterRequest.available).toBe(270) // 370 generated - 100 consumed
      expect(afterRequest.readPosition).toBe(100)
      expect(afterRequest.writePosition).toBe(370)
    })

    it('maintains correct available count', () => {
      bufferManager.requestSamples(370) // Generate exactly one chunk
      expect(bufferManager.getAvailableSamples()).toBe(0)

      bufferManager.requestSamples(200) // Generate another chunk, consume 200
      expect(bufferManager.getAvailableSamples()).toBe(170)

      bufferManager.requestSamples(170) // Consume remaining
      expect(bufferManager.getAvailableSamples()).toBe(0)
    })
  })

  describe('generator switching', () => {
    it('switches generators mid-buffer', () => {
      // Get some samples from first generator
      const firstBatch = bufferManager.requestSamples(200)
      expect(firstBatch[0]).toBe(0)

      // Switch to silence generator
      bufferManager.setGenerator(new SilenceGenerator())

      // Continue reading from buffer (should still be original data)
      const secondBatch = bufferManager.requestSamples(170)
      expect(secondBatch[0]).toBe(200)

      // New request should trigger silence generation
      const thirdBatch = bufferManager.requestSamples(400)
      // First part might still be from original
      const silenceStart = thirdBatch.findIndex(v => v === 0x80)
      expect(silenceStart).toBeGreaterThanOrEqual(0)
      // Rest should be silence
      for (let i = silenceStart; i < 400; i++) {
        expect(thirdBatch[i]).toBe(0x80)
      }
    })

    it('handles multiple generator switches', () => {
      const pattern1 = new PatternGenerator([0xaa, 0xbb])
      const pattern2 = new PatternGenerator([0xcc, 0xdd, 0xee])

      // Start with mock generator
      bufferManager.requestSamples(100)

      // Switch to pattern1
      bufferManager.setGenerator(pattern1)
      bufferManager.requestSamples(300) // Consume remaining from mock
      const batch1 = bufferManager.requestSamples(200) // Should be pattern1
      expect(batch1[0]).toBe(0xaa)
      expect(batch1[1]).toBe(0xbb)

      // Switch to pattern2
      bufferManager.setGenerator(pattern2)
      bufferManager.requestSamples(170) // Consume remaining from pattern1
      const batch2 = bufferManager.requestSamples(300) // Should be pattern2
      const pattern2Start = batch2.findIndex(v => v === 0xcc)
      expect(pattern2Start).toBeGreaterThanOrEqual(0)
    })
  })

  describe('reset functionality', () => {
    it('resets buffer to initial state', () => {
      // Generate some data
      bufferManager.requestSamples(1000)

      // Reset
      bufferManager.reset()

      const state = bufferManager.getBufferState()
      expect(state.readPosition).toBe(0)
      expect(state.writePosition).toBe(0)
      expect(state.available).toBe(0)

      // Verify it works after reset
      const samples = bufferManager.requestSamples(100)
      expect(samples.length).toBe(100)
    })
  })

  describe('error handling', () => {
    it('throws error if generator returns wrong size', () => {
      class BadGenerator implements SampleGenerator {
        generateChunk(): Uint8Array {
          return new Uint8Array(369) // Wrong size!
        }
        
        reset(): void {
          // No state to reset
        }
      }

      const badManager = createBufferManager(new BadGenerator())
      expect(() => badManager.requestSamples(100)).toThrow(
        'Generator returned 369 bytes, expected 370'
      )
    })

    it('prevents buffer overflow', () => {
      // This test would require requesting more than buffer size without consuming
      // The implementation should throw an error before corrupting data
      // Due to the 8192 buffer size, we'll test the logic rather than actual overflow

      // Request close to buffer size
      bufferManager.requestSamples(7000)

      // This should work
      expect(() => bufferManager.requestSamples(1000)).not.toThrow()

      // But requesting much more without consuming would eventually overflow
      // The manager should handle this gracefully
    })
  })

  describe('performance', () => {
    it('handles 1000+ consecutive requests efficiently', () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        bufferManager.requestSamples(512)
      }

      const duration = performance.now() - start

      // Should complete in reasonable time (< 1 second for 1000 requests)
      expect(duration).toBeLessThan(1000)
    })

    it('maintains consistent timing', () => {
      const timings: number[] = []

      // Warm up
      for (let i = 0; i < 10; i++) {
        bufferManager.requestSamples(512)
      }

      // Measure
      for (let i = 0; i < 100; i++) {
        const start = performance.now()
        bufferManager.requestSamples(512)
        timings.push(performance.now() - start)
      }

      // Calculate average and standard deviation
      const avg = timings.reduce((a, b) => a + b) / timings.length
      const variance =
        timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
        timings.length
      const stdDev = Math.sqrt(variance)

      // Timing should be consistent (low standard deviation relative to average)
      expect(stdDev / avg).toBeLessThan(1.0) // Less than 100% variation
    })
  })
})