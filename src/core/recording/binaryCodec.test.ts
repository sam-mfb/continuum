/**
 * Tests for binary codec
 */

import { describe, it, expect } from 'vitest'
import { encodeRecording, decodeRecording } from './binaryCodec'
import type { GameRecording } from './types'

describe('binaryCodec', () => {
  // Create a sample recording for testing
  const createSampleRecording = (): GameRecording => ({
    version: '1.0',
    engineVersion: 1,
    galaxyId: 'test-galaxy-abc123',
    startLevel: 1,
    timestamp: Date.now(),
    initialState: {
      lives: 3
    },
    inputs: [
      {
        frame: 0,
        controls: {
          thrust: false,
          left: false,
          right: false,
          fire: false,
          shield: false,
          selfDestruct: false,
          pause: false,
          quit: false,
          nextLevel: false,
          extraLife: false,
          map: false
        }
      },
      {
        frame: 100,
        controls: {
          thrust: true,
          left: false,
          right: false,
          fire: false,
          shield: false,
          selfDestruct: false,
          pause: false,
          quit: false,
          nextLevel: false,
          extraLife: false,
          map: false
        }
      },
      {
        frame: 200,
        controls: {
          thrust: true,
          left: true,
          right: false,
          fire: true,
          shield: false,
          selfDestruct: false,
          pause: false,
          quit: false,
          nextLevel: false,
          extraLife: false,
          map: false
        }
      }
    ],
    snapshots: [
      { frame: 0, hash: 'abc123' },
      { frame: 100, hash: 'def456' },
      { frame: 200, hash: '789xyz' }
    ],
    levelSeeds: [
      { level: 1, seed: 12345 },
      { level: 2, seed: 67890 }
    ],
    finalState: {
      score: 1000,
      fuel: 500,
      level: 2
    }
  })

  describe('roundtrip encoding/decoding', () => {
    it('encodes and decodes a recording without data loss', () => {
      const original = createSampleRecording()

      const encoded = encodeRecording(original)
      const decoded = decodeRecording(encoded)

      // Verify metadata
      expect(decoded.version).toBe(original.version)
      expect(decoded.engineVersion).toBe(original.engineVersion)
      expect(decoded.galaxyId).toBe(original.galaxyId)
      expect(decoded.startLevel).toBe(original.startLevel)
      expect(decoded.timestamp).toBe(original.timestamp)
      expect(decoded.initialState).toEqual(original.initialState)

      // Verify inputs
      expect(decoded.inputs).toHaveLength(original.inputs.length)
      for (let i = 0; i < original.inputs.length; i++) {
        expect(decoded.inputs[i]).toEqual(original.inputs[i])
      }

      // Verify snapshots
      expect(decoded.snapshots).toHaveLength(original.snapshots.length)
      for (let i = 0; i < original.snapshots.length; i++) {
        expect(decoded.snapshots[i]).toEqual(original.snapshots[i])
      }

      // Verify level seeds
      expect(decoded.levelSeeds).toHaveLength(original.levelSeeds.length)
      for (let i = 0; i < original.levelSeeds.length; i++) {
        expect(decoded.levelSeeds[i]).toEqual(original.levelSeeds[i])
      }

      // Verify final state
      expect(decoded.finalState).toEqual(original.finalState)
    })

    it('handles recording without optional fields', () => {
      const recording: GameRecording = {
        version: '1.0',
        engineVersion: 1,
        galaxyId: 'test-galaxy',
        startLevel: 1,
        timestamp: Date.now(),
        initialState: { lives: 3 },
        inputs: [],
        snapshots: [],
        levelSeeds: []
      }

      const encoded = encodeRecording(recording)
      const decoded = decodeRecording(encoded)

      expect(decoded).toEqual(recording)
    })

    it('handles all control combinations', () => {
      const recording: GameRecording = {
        version: '1.0',
        engineVersion: 1,
        galaxyId: 'test',
        startLevel: 1,
        timestamp: Date.now(),
        initialState: { lives: 3 },
        inputs: [
          {
            frame: 0,
            controls: {
              thrust: true,
              left: true,
              right: true,
              fire: true,
              shield: true,
              selfDestruct: true,
              pause: true,
              quit: true,
              nextLevel: true,
              extraLife: true,
              map: true
            }
          }
        ],
        snapshots: [],
        levelSeeds: []
      }

      const encoded = encodeRecording(recording)
      const decoded = decodeRecording(encoded)

      expect(decoded.inputs[0]?.controls).toEqual(recording.inputs[0]?.controls)
    })

    it('handles large frame numbers (varint encoding)', () => {
      const recording: GameRecording = {
        version: '1.0',
        engineVersion: 1,
        galaxyId: 'test',
        startLevel: 1,
        timestamp: Date.now(),
        initialState: { lives: 3 },
        inputs: [
          {
            frame: 1000000, // Large frame number
            controls: {
              thrust: true,
              left: false,
              right: false,
              fire: false,
              shield: false,
              selfDestruct: false,
              pause: false,
              quit: false,
              nextLevel: false,
              extraLife: false,
              map: false
            }
          }
        ],
        snapshots: [{ frame: 999999, hash: 'test' }],
        levelSeeds: []
      }

      const encoded = encodeRecording(recording)
      const decoded = decodeRecording(encoded)

      expect(decoded.inputs[0]?.frame).toBe(1000000)
      expect(decoded.snapshots[0]?.frame).toBe(999999)
    })
  })

  describe('format validation', () => {
    it('rejects invalid magic number', () => {
      const buffer = new ArrayBuffer(100)
      const bytes = new Uint8Array(buffer)
      bytes.set(new TextEncoder().encode('WRONG'), 0)

      expect(() => decodeRecording(buffer)).toThrow('Invalid recording format')
    })

    it('rejects unsupported version', () => {
      const buffer = new ArrayBuffer(100)
      const bytes = new Uint8Array(buffer)
      bytes.set(new TextEncoder().encode('CNREC'), 0)
      bytes[5] = 99 // Invalid version number

      expect(() => decodeRecording(buffer)).toThrow(
        'Unsupported recording format version'
      )
    })
  })

  describe('size comparison', () => {
    it('produces smaller output than JSON', () => {
      const recording = createSampleRecording()

      const jsonSize = JSON.stringify(recording).length
      const binarySize = encodeRecording(recording).byteLength

      // Binary should be significantly smaller
      expect(binarySize).toBeLessThan(jsonSize * 0.5)

      console.log(
        `Size comparison: JSON=${jsonSize} bytes, Binary=${binarySize} bytes (${Math.round((1 - binarySize / jsonSize) * 100)}% reduction)`
      )
    })

    it('produces even better compression with many inputs', () => {
      const recording = createSampleRecording()

      // Add many more inputs
      for (let i = 300; i < 10000; i += 100) {
        recording.inputs.push({
          frame: i,
          controls: {
            thrust: i % 2 === 0,
            left: i % 3 === 0,
            right: false,
            fire: i % 5 === 0,
            shield: false,
            selfDestruct: false,
            pause: false,
            quit: false,
            nextLevel: false,
            extraLife: false,
            map: false
          }
        })
        recording.snapshots.push({ frame: i, hash: `hash${i}` })
      }

      const jsonSize = JSON.stringify(recording).length
      const binarySize = encodeRecording(recording).byteLength

      // Should see even better compression with more data
      expect(binarySize).toBeLessThan(jsonSize * 0.3)

      console.log(
        `Large recording: JSON=${jsonSize} bytes, Binary=${binarySize} bytes (${Math.round((1 - binarySize / jsonSize) * 100)}% reduction)`
      )
    })
  })
})
