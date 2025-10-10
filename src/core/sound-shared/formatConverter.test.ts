import { describe, it, expect } from 'vitest'
import {
  convertSample,
  convertBuffer,
  convertBufferInPlace,
  convertChunks
} from './formatConverter'

describe('formatConverter', () => {
  describe('convertSample', () => {
    it('converts silence (0x80) to 0.0', () => {
      expect(convertSample(0x80)).toBe(0.0)
      expect(convertSample(128)).toBe(0.0)
    })

    it('converts minimum value (0x00) to -1.0', () => {
      expect(convertSample(0x00)).toBe(-1.0)
      expect(convertSample(0)).toBe(-1.0)
    })

    it('converts maximum value (0xFF) to ~1.0', () => {
      // Due to asymmetry of 8-bit signed values, 0xFF (255) converts to 127/128
      expect(convertSample(0xff)).toBeCloseTo(0.9921875)
      expect(convertSample(255)).toBeCloseTo(127 / 128)
    })

    it('converts mid-range values correctly', () => {
      // Test some intermediate values
      expect(convertSample(64)).toBe(-0.5) // (64 - 128) / 128 = -64/128 = -0.5
      expect(convertSample(192)).toBe(0.5) // (192 - 128) / 128 = 64/128 = 0.5
      expect(convertSample(96)).toBe(-0.25) // (96 - 128) / 128 = -32/128 = -0.25
      expect(convertSample(160)).toBe(0.25) // (160 - 128) / 128 = 32/128 = 0.25
    })

    it('handles edge cases around center', () => {
      expect(convertSample(127)).toBeCloseTo(-0.0078125) // -1/128
      expect(convertSample(129)).toBeCloseTo(0.0078125) // 1/128
    })
  })

  describe('convertBuffer', () => {
    it('converts empty buffer', () => {
      const input = new Uint8Array(0)
      const output = convertBuffer(input)
      expect(output).toBeInstanceOf(Float32Array)
      expect(output.length).toBe(0)
    })

    it('converts single sample buffer', () => {
      const input = new Uint8Array([128])
      const output = convertBuffer(input)
      expect(output).toBeInstanceOf(Float32Array)
      expect(output.length).toBe(1)
      expect(output[0]).toBe(0.0)
    })

    it('converts 370-byte buffer', () => {
      const input = new Uint8Array(370)
      // Fill with various test values
      input.fill(128) // All silence
      input[0] = 0 // Min at start
      input[369] = 255 // Max at end
      input[185] = 192 // 0.5 in middle

      const output = convertBuffer(input)
      expect(output).toBeInstanceOf(Float32Array)
      expect(output.length).toBe(370)
      expect(output[0]).toBe(-1.0)
      expect(output[369]).toBeCloseTo(127 / 128)
      expect(output[185]).toBe(0.5)

      // Check that most samples are silence
      let silenceCount = 0
      for (let i = 0; i < output.length; i++) {
        if (output[i] === 0.0) silenceCount++
      }
      expect(silenceCount).toBe(367) // 370 - 3 special values
    })

    it('converts pattern correctly', () => {
      // Create a recognizable pattern
      const input = new Uint8Array([0, 64, 128, 192, 255])
      const output = convertBuffer(input)

      expect(output[0]).toBe(-1.0)
      expect(output[1]).toBe(-0.5)
      expect(output[2]).toBe(0.0)
      expect(output[3]).toBe(0.5)
      expect(output[4]).toBeCloseTo(127 / 128)
    })

    it('preserves buffer length', () => {
      const sizes = [256, 512, 1024, 370, 333]
      for (const size of sizes) {
        const input = new Uint8Array(size)
        const output = convertBuffer(input)
        expect(output.length).toBe(size)
      }
    })
  })

  describe('convertBufferInPlace', () => {
    it('converts into existing buffer', () => {
      const input = new Uint8Array([0, 128, 255])
      const output = new Float32Array(10)
      output.fill(999) // Fill with sentinel value

      const converted = convertBufferInPlace(input, output)

      expect(converted).toBe(3)
      expect(output[0]).toBe(-1.0)
      expect(output[1]).toBe(0.0)
      expect(output[2]).toBeCloseTo(127 / 128)
      expect(output[3]).toBe(999) // Unchanged
    })

    it('respects offset parameter', () => {
      const input = new Uint8Array([0, 128, 255])
      const output = new Float32Array(10)
      output.fill(999)

      const converted = convertBufferInPlace(input, output, 5)

      expect(converted).toBe(3)
      expect(output[4]).toBe(999) // Before offset unchanged
      expect(output[5]).toBe(-1.0)
      expect(output[6]).toBe(0.0)
      expect(output[7]).toBeCloseTo(127 / 128)
      expect(output[8]).toBe(999) // After converted unchanged
    })

    it('handles output buffer too small', () => {
      const input = new Uint8Array([0, 128, 255, 64, 192])
      const output = new Float32Array(3)

      const converted = convertBufferInPlace(input, output)

      expect(converted).toBe(3) // Only converted what fits
      expect(output[0]).toBe(-1.0)
      expect(output[1]).toBe(0.0)
      expect(output[2]).toBeCloseTo(127 / 128)
    })

    it('handles output buffer too small with offset', () => {
      const input = new Uint8Array([0, 128, 255, 64, 192])
      const output = new Float32Array(5)
      output.fill(999)

      const converted = convertBufferInPlace(input, output, 3)

      expect(converted).toBe(2) // Only 2 slots available
      expect(output[2]).toBe(999) // Before offset
      expect(output[3]).toBe(-1.0)
      expect(output[4]).toBe(0.0)
    })

    it('handles zero offset explicitly', () => {
      const input = new Uint8Array([128])
      const output = new Float32Array(1)

      const converted = convertBufferInPlace(input, output, 0)
      expect(converted).toBe(1)
      expect(output[0]).toBe(0.0)
    })
  })

  describe('convertChunks', () => {
    it('converts empty chunks array', () => {
      const output = convertChunks([])
      expect(output).toBeInstanceOf(Float32Array)
      expect(output.length).toBe(0)
    })

    it('converts single chunk', () => {
      const chunk = new Uint8Array([0, 128, 255])
      const output = convertChunks([chunk])

      expect(output.length).toBe(3)
      expect(output[0]).toBe(-1.0)
      expect(output[1]).toBe(0.0)
      expect(output[2]).toBeCloseTo(127 / 128)
    })

    it('converts multiple 370-byte chunks', () => {
      const chunk1 = new Uint8Array(370)
      const chunk2 = new Uint8Array(370)
      const chunk3 = new Uint8Array(370)

      chunk1.fill(128) // Silence
      chunk2.fill(0) // Min
      chunk3.fill(255) // Max

      const output = convertChunks([chunk1, chunk2, chunk3])

      expect(output.length).toBe(1110) // 3 * 370

      // Check first chunk (silence)
      for (let i = 0; i < 370; i++) {
        expect(output[i]).toBe(0.0)
      }

      // Check second chunk (min)
      for (let i = 370; i < 740; i++) {
        expect(output[i]).toBe(-1.0)
      }

      // Check third chunk (max)
      for (let i = 740; i < 1110; i++) {
        expect(output[i]).toBeCloseTo(127 / 128)
      }
    })

    it('converts mixed size chunks', () => {
      const chunk1 = new Uint8Array([128, 128]) // 2 samples
      const chunk2 = new Uint8Array([0, 0, 0]) // 3 samples
      const chunk3 = new Uint8Array([255]) // 1 sample

      const output = convertChunks([chunk1, chunk2, chunk3])

      expect(output.length).toBe(6)
      expect(output[0]).toBe(0.0)
      expect(output[1]).toBe(0.0)
      expect(output[2]).toBe(-1.0)
      expect(output[3]).toBe(-1.0)
      expect(output[4]).toBe(-1.0)
      expect(output[5]).toBeCloseTo(127 / 128)
    })

    it('preserves chunk boundaries', () => {
      // Create chunks with distinct patterns
      const chunk1 = new Uint8Array([0, 255]) // Min, Max
      const chunk2 = new Uint8Array([128, 128]) // Silence, Silence
      const chunk3 = new Uint8Array([64, 192]) // -0.5, 0.5

      const output = convertChunks([chunk1, chunk2, chunk3])

      expect(output.length).toBe(6)
      // Chunk 1
      expect(output[0]).toBe(-1.0)
      expect(output[1]).toBeCloseTo(127 / 128)
      // Chunk 2
      expect(output[2]).toBe(0.0)
      expect(output[3]).toBe(0.0)
      // Chunk 3
      expect(output[4]).toBe(-0.5)
      expect(output[5]).toBe(0.5)
    })
  })

  describe('performance characteristics', () => {
    it('converts 370-byte buffer quickly', () => {
      const input = new Uint8Array(370)
      input.fill(128)

      const start = performance.now()
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        convertBuffer(input)
      }

      const elapsed = performance.now() - start
      const avgTime = elapsed / iterations

      // Should be well under 1ms per conversion
      expect(avgTime).toBeLessThan(1.0)
    })

    it('in-place conversion is efficient', () => {
      const input = new Uint8Array(370)
      const output = new Float32Array(370)
      input.fill(128)

      const start = performance.now()
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        convertBufferInPlace(input, output)
      }

      const elapsed = performance.now() - start
      const avgTime = elapsed / iterations

      // In-place should be faster than allocation
      expect(avgTime).toBeLessThan(0.5)
    })
  })

  describe('mathematical accuracy', () => {
    it('maintains linear scaling', () => {
      // Test that the conversion is linear
      for (let i = 0; i <= 255; i++) {
        const converted = convertSample(i)
        const expected = (i - 128) / 128
        expect(converted).toBeCloseTo(expected, 10)
      }
    })

    it('round-trip conversion maintains precision', () => {
      // While we can't truly round-trip (8-bit to float32 back to 8-bit),
      // we can verify that the conversion is mathematically consistent
      const testValues = [0, 1, 64, 127, 128, 129, 192, 254, 255]

      for (const value of testValues) {
        const floatValue = convertSample(value)
        // Reverse conversion: sample = (float * 128) + 128
        const reversed = Math.round(floatValue * 128 + 128)

        // Account for the asymmetry at the extremes
        if (value === 255) {
          // 255 maps to 127/128, which reverses to 255
          expect(reversed).toBe(255)
        } else {
          expect(reversed).toBe(value)
        }
      }
    })
  })
})
