import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createBufferManager } from '../bufferManager'
import { convertBuffer } from '../formatConverter'
import { createTestGenerators } from '../sampleGenerator'

describe('Sound System Integration', () => {
  let bufferManager: ReturnType<typeof createBufferManager>
  let sampleGenerators: ReturnType<typeof createTestGenerators>

  beforeEach(() => {
    sampleGenerators = createTestGenerators()
    bufferManager = createBufferManager(sampleGenerators.silence)
    vi.clearAllMocks()
  })

  describe('Mock Browser Audio Requests', () => {
    it('handles standard Web Audio buffer size (256 samples)', () => {
      bufferManager.setGenerator(sampleGenerators.silence)

      const samples = bufferManager.requestSamples(256)
      expect(samples).toHaveLength(256)

      const float32Samples = convertBuffer(samples)
      expect(float32Samples).toHaveLength(256)
      expect(float32Samples.every(s => s === 0)).toBe(true)
    })

    it('handles common browser buffer size (512 samples)', () => {
      bufferManager.setGenerator(sampleGenerators.silence)

      const samples = bufferManager.requestSamples(512)
      expect(samples).toHaveLength(512)

      const float32Samples = convertBuffer(samples)
      expect(float32Samples).toHaveLength(512)
    })

    it('handles large buffer size (1024 samples)', () => {
      bufferManager.setGenerator(sampleGenerators.silence)

      const samples = bufferManager.requestSamples(1024)
      expect(samples).toHaveLength(1024)

      const float32Samples = convertBuffer(samples)
      expect(float32Samples).toHaveLength(1024)
    })

    it('handles odd buffer size (333 samples)', () => {
      bufferManager.setGenerator(sampleGenerators.silence)

      const samples = bufferManager.requestSamples(333)
      expect(samples).toHaveLength(333)

      const float32Samples = convertBuffer(samples)
      expect(float32Samples).toHaveLength(333)
    })

    it('handles rapid consecutive requests', () => {
      bufferManager.setGenerator(sampleGenerators.silence)

      const sizes = [256, 512, 256, 1024, 128, 256]
      const results = sizes.map(size => bufferManager.requestSamples(size))

      results.forEach((samples, i) => {
        expect(samples).toHaveLength(sizes[i]!)
      })
    })
  })

  describe('Timing Verification', () => {
    it('generates samples under 16.67ms (60fps frame budget)', () => {
      bufferManager.setGenerator(sampleGenerators.sine440)

      const start = performance.now()
      bufferManager.requestSamples(1024)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(16.67)
    })

    it('targets under 3ms for safety margin', () => {
      bufferManager.setGenerator(sampleGenerators.sine440)

      const iterations = 10
      let totalTime = 0

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        bufferManager.requestSamples(512)
        totalTime += performance.now() - start
      }

      const avgTime = totalTime / iterations
      expect(avgTime).toBeLessThan(3)
    })

    it('maintains consistent timing across different buffer sizes', () => {
      bufferManager.setGenerator(sampleGenerators.sine440)

      const sizes = [256, 512, 1024]
      const timings = sizes.map(size => {
        const start = performance.now()
        bufferManager.requestSamples(size)
        return performance.now() - start
      })

      // Larger buffers should take proportionally more time, but all should be fast
      timings.forEach(time => expect(time).toBeLessThan(3))
    })
  })

  describe('Data Flow Verification', () => {
    it('correctly flows from generator through buffer to converter', () => {
      // Use a generator with known output
      bufferManager.setGenerator(sampleGenerators.sine440)

      // Get raw samples from buffer
      const rawSamples = bufferManager.requestSamples(370)
      expect(rawSamples).toBeInstanceOf(Uint8Array)
      expect(rawSamples).toHaveLength(370)

      // Convert to float32
      const float32Samples = convertBuffer(rawSamples)
      expect(float32Samples).toBeInstanceOf(Float32Array)
      expect(float32Samples).toHaveLength(370)

      // Verify conversion maintains signal characteristics
      // Sine wave should have values oscillating around 0
      const hasPositive = float32Samples.some(s => s > 0)
      const hasNegative = float32Samples.some(s => s < 0)
      expect(hasPositive).toBe(true)
      expect(hasNegative).toBe(true)
    })

    it('preserves sample count through entire pipeline', () => {
      bufferManager.setGenerator(sampleGenerators.whiteNoise)

      const requestedSamples = 777
      const rawSamples = bufferManager.requestSamples(requestedSamples)
      const float32Samples = convertBuffer(rawSamples)

      expect(rawSamples).toHaveLength(requestedSamples)
      expect(float32Samples).toHaveLength(requestedSamples)
    })

    it('handles generator switching mid-stream', () => {
      // Start with silence
      bufferManager.setGenerator(sampleGenerators.silence)
      const silence1 = bufferManager.requestSamples(256)

      // Switch to sine wave
      bufferManager.setGenerator(sampleGenerators.sine440)
      const sine = bufferManager.requestSamples(256)

      // Switch back to silence
      bufferManager.setGenerator(sampleGenerators.silence)
      // Note: The buffer manager uses 370-byte chunks, so when we switch generators,
      // there may be leftover data from the previous generator in the buffer.
      // Request enough samples to ensure we get fresh silence data.
      // 370 bytes would ensure at least one full chunk from the new generator.
      const silence2 = bufferManager.requestSamples(740) // 2 chunks worth

      // Verify each segment has expected characteristics
      const silenceFloat1 = convertBuffer(silence1)
      const sineFloat = convertBuffer(sine)
      const silenceFloat2 = convertBuffer(silence2)

      expect(silenceFloat1.every(s => s === 0)).toBe(true)
      expect(sineFloat.some(s => s !== 0)).toBe(true)

      // The latter part of silence2 should be all zeros (after the leftover sine data)
      // Check that at least the last 370 samples are silence
      const lastChunk = silenceFloat2.slice(-370)
      expect(lastChunk.every(s => s === 0)).toBe(true)
    })
  })

  describe('Continuous Operation', () => {
    it('handles 1000+ consecutive requests without issues', () => {
      bufferManager.setGenerator(sampleGenerators.sine440)

      const iterations = 1000
      for (let i = 0; i < iterations; i++) {
        const samples = bufferManager.requestSamples(256)
        expect(samples).toHaveLength(256)

        // Spot check some conversions
        if (i % 100 === 0) {
          const float32 = convertBuffer(samples)
          expect(float32).toHaveLength(256)
        }
      }
    })

    it('maintains stable timing over extended operation', () => {
      bufferManager.setGenerator(sampleGenerators.whiteNoise)

      const timings: number[] = []
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        bufferManager.requestSamples(512)
        timings.push(performance.now() - start)
      }

      // Calculate timing statistics
      const avgTime = timings.reduce((a, b) => a + b) / timings.length
      const maxTime = Math.max(...timings)
      const minTime = Math.min(...timings)

      // Verify stable performance
      expect(avgTime).toBeLessThan(3)
      expect(maxTime).toBeLessThan(5) // Allow some variance
      expect(maxTime - minTime).toBeLessThan(3) // But not too much
    })

    it('does not accumulate errors over time', () => {
      bufferManager.setGenerator(sampleGenerators.sine440)

      // Get initial sample
      const initial = bufferManager.requestSamples(370)

      // Process many buffers
      for (let i = 0; i < 1000; i++) {
        bufferManager.requestSamples(370)
      }

      // Generator should produce same pattern
      bufferManager.reset()
      sampleGenerators.sine440.reset()
      bufferManager.setGenerator(sampleGenerators.sine440)
      const final = bufferManager.requestSamples(370)

      // First few samples should match (allowing for phase differences)
      expect(initial[0]).toBe(final[0])
      expect(initial[1]).toBe(final[1])
    })

    it('handles mixed buffer sizes over extended operation', () => {
      bufferManager.setGenerator(sampleGenerators.whiteNoise)

      const sizes = [256, 512, 1024, 128, 333, 777]
      const iterations = 200

      for (let i = 0; i < iterations; i++) {
        const size = sizes[i % sizes.length]!
        const samples = bufferManager.requestSamples(size)
        expect(samples).toHaveLength(size)
      }
    })
  })

  describe('Memory Characteristics', () => {
    it('reuses buffers efficiently', () => {
      bufferManager.setGenerator(sampleGenerators.silence)

      // Get multiple buffers of same size
      const buffers: Uint8Array[] = []
      for (let i = 0; i < 10; i++) {
        buffers.push(bufferManager.requestSamples(512))
      }

      // All should be valid
      buffers.forEach(buffer => {
        expect(buffer).toHaveLength(512)
        expect(buffer).toBeInstanceOf(Uint8Array)
      })
    })

    it('handles very large single requests', () => {
      bufferManager.setGenerator(sampleGenerators.sine440)

      // Request close to buffer size but not exceeding it
      // Buffer size is 8192, leaving some room for the ring buffer
      const largeSamples = bufferManager.requestSamples(7000)
      expect(largeSamples).toHaveLength(7000)

      const float32 = convertBuffer(largeSamples)
      expect(float32).toHaveLength(7000)
    })
  })
})
