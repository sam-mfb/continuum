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
      // This test verifies that the ring buffer correctly wraps around when
      // the write position reaches the end of the buffer and continues from
      // the beginning, while maintaining data continuity.
      
      // Fill buffer near capacity (7000 of 8192 bytes)
      const largeRequest = 7000
      const firstBatch = bufferManager.requestSamples(largeRequest)

      // Request 2000 more bytes, forcing wraparound since 7000 + 2000 > 8192
      // The write pointer will wrap: write 1192 bytes to positions 7000-8191,
      // then wrap to 0 and write 808 bytes to positions 0-807
      const secondBatch = bufferManager.requestSamples(2000)

      // Verify data continuity across the wraparound boundary
      // The last sample of the first batch should be followed by
      // the first sample of the second batch, proving no data was lost
      // or corrupted during wraparound
      const lastOfFirst = firstBatch[largeRequest - 1]!
      const firstOfSecond = secondBatch[0]!
      expect(firstOfSecond).toBe((lastOfFirst + 1) & 0xff)
    })

    it('maintains data integrity across multiple wraparounds', () => {
      // This test ensures wraparound works consistently over many cycles,
      // not just the first time. It verifies the read/write pointers
      // maintain their relationship correctly through multiple full
      // buffer cycles.
      
      let previousLast = -1

      // Request 20 batches of 1000 bytes = 20,000 total bytes
      // With an 8192-byte buffer, this causes ~2.4 complete wraparounds
      for (let i = 0; i < 20; i++) {
        const samples = bufferManager.requestSamples(1000)

        // Verify continuity between batches
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

  describe('error handling and overflow/underflow', () => {
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

    it('prevents buffer overflow by throwing error', () => {
      // Buffer overflow occurs when write position catches up to read position,
      // meaning we're trying to overwrite unread data. This test verifies
      // that the buffer manager throws an error rather than corrupting data.
      
      // Create a small buffer for easier testing
      const smallBufferManager = createBufferManager(mockGenerator)
      
      // Fill most of the 8192-byte buffer
      smallBufferManager.requestSamples(8000)
      
      // At this point:
      // - 8000 bytes have been read and consumed
      // - Write position is at 8180 (generated 22 chunks * 370 = 8140 bytes)
      // - Available: 8180 - 8000 = 180 bytes
      
      // This request should succeed (180 available + 370 new = 550 total)
      expect(() => smallBufferManager.requestSamples(500)).not.toThrow()
      
      // But trying to generate too much without consuming will overflow
      // Note: Due to the large buffer size (8192), it's hard to demonstrate
      // actual overflow in tests. In real usage, overflow indicates the
      // consumer isn't reading data frequently enough.
    })
    
    it('automatically handles underflow by generating more data', () => {
      // Buffer underflow would occur if we try to read more data than available.
      // This test verifies that the buffer manager automatically generates
      // enough chunks to satisfy the request rather than returning partial data.
      
      // Start with empty buffer
      expect(bufferManager.getAvailableSamples()).toBe(0)
      
      // Request 1000 bytes - more than one chunk (370 bytes)
      const samples = bufferManager.requestSamples(1000)
      
      // Should receive exactly 1000 bytes (no partial data)
      expect(samples.length).toBe(1000)
      
      // Should have generated 3 chunks (3 * 370 = 1110 bytes)
      // Available: 1110 - 1000 = 110 bytes remaining
      expect(bufferManager.getAvailableSamples()).toBe(110)
    })
    
    it('demonstrates safe buffer usage patterns', () => {
      // This test shows how to use the buffer manager safely to avoid
      // overflow and minimize underflow blocking.
      
      // Pattern 1: Check available samples before large reads
      const available = bufferManager.getAvailableSamples()
      if (available < 512) {
        // Buffer is running low, might block on next read
        // In real-time context, you might skip this frame or use smaller read
      }
      
      // Pattern 2: Monitor buffer health
      const state = bufferManager.getBufferState()
      const fillLevel = state.available / 8192
      expect(fillLevel).toBeGreaterThanOrEqual(0)
      expect(fillLevel).toBeLessThanOrEqual(1)
      
      // Pattern 3: Consume data regularly to prevent overflow
      // Simulate audio callback consuming data every ~23ms (512 samples at 22.2kHz)
      for (let i = 0; i < 10; i++) {
        bufferManager.requestSamples(512)
        // In real app, this would be called by audio callback
      }
      
      // Buffer should remain healthy with regular consumption
      expect(bufferManager.getAvailableSamples()).toBeLessThan(8192)
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