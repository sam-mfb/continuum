/**
 * Unit tests for the sample generator module
 *
 * These tests verify that generators produce exactly 370 bytes of
 * 8-bit unsigned audio data with the expected characteristics.
 */

import { describe, test, expect } from 'vitest'
import {
  CHUNK_SIZE,
  CENTER_VALUE,
  SAMPLE_RATE,
  buildSilenceGenerator,
  buildSineWaveGenerator,
  buildWhiteNoiseGenerator,
  buildMusicalIntervalGenerator
} from '../sampleGenerator'
describe('Constants', () => {
  test('chunk size is exactly 370 bytes', () => {
    expect(CHUNK_SIZE).toBe(370)
  })

  test('center value is 128 (0x80)', () => {
    expect(CENTER_VALUE).toBe(128)
    expect(CENTER_VALUE).toBe(0x80)
  })

  test('sample rate is 22.2kHz', () => {
    expect(SAMPLE_RATE).toBe(22200)
  })
})

describe('buildSilenceGenerator', () => {
  const generator = buildSilenceGenerator()

  test('generates exactly 370 bytes', () => {
    const chunk = generator.generateChunk()
    expect(chunk).toBeInstanceOf(Uint8Array)
    expect(chunk.length).toBe(370)
  })

  test('all samples are at center value (128)', () => {
    const chunk = generator.generateChunk()
    for (let i = 0; i < chunk.length; i++) {
      expect(chunk[i]).toBe(128)
    }
  })

  test('generates consistent output across multiple calls', () => {
    const chunk1 = generator.generateChunk()
    const chunk2 = generator.generateChunk()
    expect(chunk1).toEqual(chunk2)
  })

  test('reset has no effect (stateless)', () => {
    const chunk1 = generator.generateChunk()
    generator.reset()
    const chunk2 = generator.generateChunk()
    expect(chunk1).toEqual(chunk2)
  })
})

describe('buildSineWaveGenerator', () => {
  test('generates exactly 370 bytes', () => {
    const generator = buildSineWaveGenerator(440)
    const chunk = generator.generateChunk()
    expect(chunk).toBeInstanceOf(Uint8Array)
    expect(chunk.length).toBe(370)
  })

  test('all values are in valid 8-bit range (0-255)', () => {
    const generator = buildSineWaveGenerator(440)
    const chunk = generator.generateChunk()
    for (let i = 0; i < chunk.length; i++) {
      expect(chunk[i]).toBeGreaterThanOrEqual(0)
      expect(chunk[i]).toBeLessThanOrEqual(255)
    }
  })

  test('produces oscillating values around center', () => {
    const generator = buildSineWaveGenerator(440)
    const chunk = generator.generateChunk()

    let aboveCenter = 0
    let belowCenter = 0

    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i]! > CENTER_VALUE) aboveCenter++
      else if (chunk[i]! < CENTER_VALUE) belowCenter++
    }

    // Should have roughly equal samples above and below center
    expect(aboveCenter).toBeGreaterThan(0)
    expect(belowCenter).toBeGreaterThan(0)
    expect(Math.abs(aboveCenter - belowCenter)).toBeLessThan(50)
  })

  test('consecutive chunks continue the waveform', () => {
    const generator = buildSineWaveGenerator(440)
    const chunk1 = generator.generateChunk()
    const chunk2 = generator.generateChunk()

    // Last sample of chunk1 and first sample of chunk2 should show continuity
    // (not be identical, but follow the sine wave pattern)
    expect(chunk1[369]!).not.toBe(chunk2[0]!)
  })

  test('reset restarts the waveform', () => {
    const generator = buildSineWaveGenerator(440)
    const chunk1 = generator.generateChunk()
    generator.reset()
    const chunk2 = generator.generateChunk()

    // After reset, should produce identical output
    expect(chunk1).toEqual(chunk2)
  })

  test('different frequencies produce different waveforms', () => {
    const gen440 = buildSineWaveGenerator(440)
    const gen880 = buildSineWaveGenerator(880)

    const chunk440 = gen440.generateChunk()
    const chunk880 = gen880.generateChunk()

    expect(chunk440).not.toEqual(chunk880)
  })

  test('waveform has expected characteristics for 440Hz', () => {
    const generator = buildSineWaveGenerator(440)
    const chunk = generator.generateChunk()

    // At 22.2kHz sample rate, 440Hz should have ~50.45 samples per cycle
    // In 370 samples, we should see ~7.33 complete cycles

    // Count zero crossings (transitions through center value)
    let crossings = 0
    for (let i = 1; i < chunk.length; i++) {
      if (
        (chunk[i - 1]! < CENTER_VALUE && chunk[i]! >= CENTER_VALUE) ||
        (chunk[i - 1]! > CENTER_VALUE && chunk[i]! <= CENTER_VALUE)
      ) {
        crossings++
      }
    }

    // Should have approximately 14-15 zero crossings (2 per cycle)
    expect(crossings).toBeGreaterThanOrEqual(13)
    expect(crossings).toBeLessThanOrEqual(16)
  })
})

describe('buildWhiteNoiseGenerator', () => {
  const generator = buildWhiteNoiseGenerator()

  test('generates exactly 370 bytes', () => {
    const chunk = generator.generateChunk()
    expect(chunk).toBeInstanceOf(Uint8Array)
    expect(chunk.length).toBe(370)
  })

  test('all values are in valid 8-bit range (0-255)', () => {
    const chunk = generator.generateChunk()
    for (let i = 0; i < chunk.length; i++) {
      expect(chunk[i]).toBeGreaterThanOrEqual(0)
      expect(chunk[i]).toBeLessThanOrEqual(255)
    }
  })

  test('produces different output each time', () => {
    const chunk1 = generator.generateChunk()
    const chunk2 = generator.generateChunk()
    expect(chunk1).not.toEqual(chunk2)
  })

  test('reset has no effect (stateless random)', () => {
    const chunk1 = generator.generateChunk()
    generator.reset()
    const chunk2 = generator.generateChunk()
    expect(chunk1).not.toEqual(chunk2)
  })

  test('has roughly uniform distribution', () => {
    // Generate multiple chunks for statistical analysis
    const buckets = new Array(16).fill(0)
    const bucketSize = 256 / 16

    for (let n = 0; n < 10; n++) {
      const chunk = generator.generateChunk()
      for (let i = 0; i < chunk.length; i++) {
        const bucket = Math.floor(chunk[i]! / bucketSize)
        buckets[bucket]++
      }
    }

    // Each bucket should have roughly 1/16 of total samples
    const totalSamples = 370 * 10
    const expectedPerBucket = totalSamples / 16

    for (let i = 0; i < buckets.length; i++) {
      // Allow 30% deviation from expected
      expect(buckets[i]).toBeGreaterThan(expectedPerBucket * 0.7)
      expect(buckets[i]).toBeLessThan(expectedPerBucket * 1.3)
    }
  })
})

describe('buildMusicalIntervalGenerator', () => {
  test('generates exactly 370 bytes', () => {
    const generator = buildMusicalIntervalGenerator([440, 880])
    const chunk = generator.generateChunk()
    expect(chunk).toBeInstanceOf(Uint8Array)
    expect(chunk.length).toBe(370)
  })

  test('all values are in valid 8-bit range', () => {
    const generator = buildMusicalIntervalGenerator([220, 440, 880])
    const chunk = generator.generateChunk()
    for (let i = 0; i < chunk.length; i++) {
      expect(chunk[i]).toBeGreaterThanOrEqual(0)
      expect(chunk[i]).toBeLessThanOrEqual(255)
    }
  })

  test('switches between frequencies at specified intervals', () => {
    // Use very short duration for testing
    const generator = buildMusicalIntervalGenerator([440, 880], 0.01) // 10ms per note

    // At 22.2kHz, 10ms = 222 samples
    // So in 370 samples, we should see a frequency change

    const chunk = generator.generateChunk()

    // Check that the waveform characteristics change
    // Count zero crossings in first and second half
    let firstHalfCrossings = 0
    let secondHalfCrossings = 0

    // First half
    for (let i = 1; i < 185; i++) {
      if (
        (chunk[i - 1]! < CENTER_VALUE && chunk[i]! >= CENTER_VALUE) ||
        (chunk[i - 1]! > CENTER_VALUE && chunk[i]! <= CENTER_VALUE)
      ) {
        firstHalfCrossings++
      }
    }

    // Second half
    for (let i = 186; i < chunk.length; i++) {
      if (
        (chunk[i - 1]! < CENTER_VALUE && chunk[i]! >= CENTER_VALUE) ||
        (chunk[i - 1]! > CENTER_VALUE && chunk[i]! <= CENTER_VALUE)
      ) {
        secondHalfCrossings++
      }
    }

    // 880Hz should have roughly twice as many crossings as 440Hz
    // But due to the short interval and transition, just check they're different
    expect(firstHalfCrossings).not.toBe(secondHalfCrossings)
  })

  test('reset restarts the sequence', () => {
    const generator = buildMusicalIntervalGenerator([440, 880], 0.1)
    const chunk1 = generator.generateChunk()
    generator.reset()
    const chunk2 = generator.generateChunk()

    // After reset, should produce identical output
    expect(chunk1).toEqual(chunk2)
  })

  test('handles note transitions across chunk boundaries', () => {
    const generator = buildMusicalIntervalGenerator([440, 880], 0.008) // ~177 samples per note

    // Generate multiple chunks
    const chunks = []
    for (let i = 0; i < 5; i++) {
      chunks.push(generator.generateChunk())
    }

    // All chunks should be exactly 370 bytes
    for (const chunk of chunks) {
      expect(chunk.length).toBe(370)
    }
  })
})

// Removed createTestSounds factory tests - module no longer exists

describe('Performance characteristics', () => {

  test('multiple consecutive calls maintain timing', () => {
    const generator = buildSineWaveGenerator(440)
    const timings = []

    // Generate 1000 chunks and measure timing
    for (let i = 0; i < 1000; i++) {
      const start = performance.now()
      generator.generateChunk()
      const elapsed = performance.now() - start
      timings.push(elapsed)
    }

    // Calculate average and max timing
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length
    const maxTime = Math.max(...timings)

    // Average should be well under 3ms
    expect(avgTime).toBeLessThan(3)

    // No single generation should take more than 16ms
    expect(maxTime).toBeLessThan(16)
  })
})
