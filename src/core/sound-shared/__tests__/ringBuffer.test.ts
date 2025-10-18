/**
 * Ring Buffer Tests
 */

import { describe, it, expect } from 'vitest'
import { createRingBuffer } from '../ringBuffer'

describe('createRingBuffer', () => {
  it('throws error if size is not power of 2', () => {
    expect(() => createRingBuffer(0)).toThrow('must be a power of 2')
    expect(() => createRingBuffer(3)).toThrow('must be a power of 2')
    expect(() => createRingBuffer(100)).toThrow('must be a power of 2')
    expect(() => createRingBuffer(-1)).toThrow('must be a power of 2')
  })

  it('accepts power of 2 sizes', () => {
    expect(() => createRingBuffer(2)).not.toThrow()
    expect(() => createRingBuffer(4)).not.toThrow()
    expect(() => createRingBuffer(1024)).not.toThrow()
    expect(() => createRingBuffer(8192)).not.toThrow()
  })

  it('initializes empty', () => {
    const buffer = createRingBuffer(16)

    expect(buffer.isEmpty()).toBe(true)
    expect(buffer.getAvailableSamples()).toBe(0)
  })
})

describe('RingBuffer - writeSample', () => {
  it('writes single sample successfully', () => {
    const buffer = createRingBuffer(16)

    const success = buffer.writeSample(200)

    expect(success).toBe(true)
  })

  it('returns false when buffer is full', () => {
    const buffer = createRingBuffer(4)

    // Fill buffer (size 4, can hold 4 items)
    expect(buffer.writeSample(100)).toBe(true)
    expect(buffer.writeSample(101)).toBe(true)
    expect(buffer.writeSample(102)).toBe(true)
    expect(buffer.writeSample(103)).toBe(true)

    // Next write should fail
    expect(buffer.writeSample(104)).toBe(false)
  })

  it('can write after reading frees space', () => {
    const buffer = createRingBuffer(4)

    // Fill buffer
    buffer.writeSample(100)
    buffer.writeSample(101)
    buffer.writeSample(102)

    // Read one sample to free space
    const output = new Float32Array(1)
    buffer.readSamples(output, 1)

    // Should be able to write again
    expect(buffer.writeSample(103)).toBe(true)
  })
})

describe('RingBuffer - writeSamples', () => {
  it('writes multiple samples successfully', () => {
    const buffer = createRingBuffer(16)
    const samples = new Uint8Array([100, 110, 120, 130])

    const written = buffer.writeSamples(samples)

    expect(written).toBe(4)
  })

  it('stops writing when buffer becomes full', () => {
    const buffer = createRingBuffer(4)
    const samples = new Uint8Array([100, 110, 120, 130, 140, 150])

    // Can write 4 samples before buffer is full
    const written = buffer.writeSamples(samples)

    expect(written).toBe(4)
  })

  it('handles wraparound correctly', () => {
    const buffer = createRingBuffer(8)

    // Write and read to advance positions
    buffer.writeSamples(new Uint8Array([100, 110, 120, 130]))
    const output1 = new Float32Array(4)
    buffer.readSamples(output1, 4)

    // Now write more samples that will wrap around
    const samples = new Uint8Array([200, 210, 220, 230, 240])
    const written = buffer.writeSamples(samples)

    expect(written).toBe(5)

    // Read them back
    const output2 = new Float32Array(5)
    buffer.readSamples(output2, 5)

    // Verify values (convert back from Float32 to check)
    expect(Math.round(output2[0]! * 128 + 128)).toBe(200)
    expect(Math.round(output2[1]! * 128 + 128)).toBe(210)
    expect(Math.round(output2[2]! * 128 + 128)).toBe(220)
    expect(Math.round(output2[3]! * 128 + 128)).toBe(230)
    expect(Math.round(output2[4]! * 128 + 128)).toBe(240)
  })
})

describe('RingBuffer - readSamples', () => {
  it('reads samples and converts to Float32', () => {
    const buffer = createRingBuffer(16)

    // Write some test samples
    buffer.writeSamples(new Uint8Array([0, 128, 255]))

    // Read them back
    const output = new Float32Array(3)
    const read = buffer.readSamples(output, 3)

    expect(read).toBe(3)
    expect(output[0]).toBeCloseTo(-1.0, 5) // 0 -> -1.0
    expect(output[1]).toBeCloseTo(0.0, 5) // 128 -> 0.0
    expect(output[2]).toBeCloseTo(0.9921875, 5) // 255 -> ~1.0
  })

  it('returns number of samples actually read', () => {
    const buffer = createRingBuffer(16)

    // Write only 3 samples
    buffer.writeSamples(new Uint8Array([100, 110, 120]))

    // Try to read 10 samples
    const output = new Float32Array(10)
    const read = buffer.readSamples(output, 10)

    // Should only read 3
    expect(read).toBe(3)
  })

  it('returns 0 when buffer is empty', () => {
    const buffer = createRingBuffer(16)

    // Read everything to empty the buffer
    const output1 = new Float32Array(16)
    buffer.readSamples(output1, 16)

    // Try to read from empty buffer
    const output2 = new Float32Array(10)
    const read = buffer.readSamples(output2, 10)

    expect(read).toBe(0)
  })
})

describe('RingBuffer - fillWithSilence', () => {
  it('fills buffer with center value (128)', () => {
    const buffer = createRingBuffer(8)

    // Read initial silence to empty buffer
    const temp = new Float32Array(8)
    buffer.readSamples(temp, 8)

    // Fill with silence again
    buffer.fillWithSilence(4)

    // Read and verify
    const output = new Float32Array(4)
    buffer.readSamples(output, 4)

    for (let i = 0; i < 4; i++) {
      expect(output[i]).toBe(0.0) // 128 -> 0.0
    }
  })

  it('stops filling when buffer becomes full', () => {
    const buffer = createRingBuffer(4)

    // Try to fill more than buffer can hold
    buffer.fillWithSilence(10)

    // Should only fill until full (4 samples in size-4 buffer)
    expect(buffer.getAvailableSamples()).toBe(4)
  })
})

describe('RingBuffer - getAvailableSamples', () => {
  it('returns 0 for empty buffer', () => {
    const buffer = createRingBuffer(16)

    // Read all initial silence
    const temp = new Float32Array(16)
    buffer.readSamples(temp, 16)

    expect(buffer.getAvailableSamples()).toBe(0)
  })

  it('returns correct count after writing', () => {
    const buffer = createRingBuffer(16)

    // Read initial silence
    const temp = new Float32Array(16)
    buffer.readSamples(temp, 16)

    // Write some samples
    buffer.writeSamples(new Uint8Array([100, 110, 120]))

    expect(buffer.getAvailableSamples()).toBe(3)
  })

  it('handles wraparound correctly', () => {
    const buffer = createRingBuffer(8)

    // Fill and empty to advance positions
    const temp1 = new Float32Array(8)
    buffer.readSamples(temp1, 8)

    buffer.writeSamples(new Uint8Array([100, 110, 120, 130]))
    const temp2 = new Float32Array(4)
    buffer.readSamples(temp2, 4)

    // Write more samples (will wrap around)
    buffer.writeSamples(new Uint8Array([200, 210, 220]))

    expect(buffer.getAvailableSamples()).toBe(3)
  })
})

describe('RingBuffer - isFull', () => {
  it('returns false for empty buffer', () => {
    const buffer = createRingBuffer(16)

    // Read all initial silence
    const temp = new Float32Array(16)
    buffer.readSamples(temp, 16)

    expect(buffer.isFull()).toBe(false)
  })

  it('returns true when buffer is full', () => {
    const buffer = createRingBuffer(4)

    // Fill buffer (size 4, can hold 4 items)
    buffer.writeSamples(new Uint8Array([100, 110, 120, 130]))

    expect(buffer.isFull()).toBe(true)
  })

  it('returns false after reading from full buffer', () => {
    const buffer = createRingBuffer(4)

    // Fill buffer
    buffer.writeSamples(new Uint8Array([100, 110, 120, 130]))

    expect(buffer.isFull()).toBe(true)

    // Read one sample
    const output = new Float32Array(1)
    buffer.readSamples(output, 1)

    expect(buffer.isFull()).toBe(false)
  })
})

describe('RingBuffer - isEmpty', () => {
  it('returns true for empty buffer', () => {
    const buffer = createRingBuffer(16)

    // Read all initial silence
    const temp = new Float32Array(16)
    buffer.readSamples(temp, 16)

    expect(buffer.isEmpty()).toBe(true)
  })

  it('returns false after writing', () => {
    const buffer = createRingBuffer(16)

    // Read all initial silence
    const temp = new Float32Array(16)
    buffer.readSamples(temp, 16)

    // Write one sample
    buffer.writeSample(100)

    expect(buffer.isEmpty()).toBe(false)
  })

  it('returns true after reading all samples', () => {
    const buffer = createRingBuffer(16)

    // Read all initial silence
    const temp1 = new Float32Array(16)
    buffer.readSamples(temp1, 16)

    // Write and read
    buffer.writeSamples(new Uint8Array([100, 110, 120]))
    const temp2 = new Float32Array(3)
    buffer.readSamples(temp2, 3)

    expect(buffer.isEmpty()).toBe(true)
  })
})

describe('RingBuffer - reset', () => {
  it('clears buffer state and fills with silence', () => {
    const buffer = createRingBuffer(8)

    // Read initial silence
    const temp1 = new Float32Array(8)
    buffer.readSamples(temp1, 8)

    // Write some samples
    buffer.writeSamples(new Uint8Array([100, 110, 120]))

    // Reset
    buffer.reset()

    // Should be filled with silence again
    expect(buffer.getAvailableSamples()).toBe(8)
    const output = new Float32Array(8)
    buffer.readSamples(output, 8)

    for (let i = 0; i < 8; i++) {
      expect(output[i]).toBe(0.0) // 128 -> 0.0
    }
  })

  it('resets read and write positions', () => {
    const buffer = createRingBuffer(8)

    // Advance positions
    const temp1 = new Float32Array(8)
    buffer.readSamples(temp1, 8)
    buffer.writeSamples(new Uint8Array([100, 110, 120]))
    const temp2 = new Float32Array(2)
    buffer.readSamples(temp2, 2)

    // Reset
    buffer.reset()

    // Write and read should work as if brand new
    buffer.readSamples(temp1, 8)
    buffer.writeSamples(new Uint8Array([200, 210, 220, 230, 240]))

    expect(buffer.getAvailableSamples()).toBe(5)
  })
})
