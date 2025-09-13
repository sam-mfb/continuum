/**
 * Tests for the sound engine
 * Phase 6: Tests for new buffer-based audio system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSoundEngine } from '../soundEngine'

// Mock AudioContext for Node.js test environment
global.AudioContext = vi.fn().mockImplementation(() => ({
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null
  })),
  destination: { channelCount: 2 },
  sampleRate: 44100,
  state: 'running',
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn(),
  baseLatency: 0.01
}))

// Mock the audio modules
vi.mock('../bufferManager', () => ({
  createBufferManager: vi.fn(() => ({
    setGenerator: vi.fn(),
    requestSamples: vi.fn(() => new Uint8Array(512)),
    getAvailableSamples: vi.fn(() => 1024),
    getBufferState: vi.fn(() => ({
      writePosition: 0,
      readPosition: 0,
      available: 0
    })),
    reset: vi.fn()
  }))
}))

vi.mock('../audioOutput', () => ({
  createAudioOutput: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    isPlaying: vi.fn(() => false),
    getContext: vi.fn(() => null),
    getStats: vi.fn(() => ({
      underruns: 0,
      totalCallbacks: 0,
      averageLatency: 0
    }))
  }))
}))

vi.mock('../generators/testSounds', () => ({
  createTestSounds: vi.fn(() => ({
    silence: { generateChunk: vi.fn(), reset: vi.fn() },
    sine440: { generateChunk: vi.fn(), reset: vi.fn() },
    sine880: { generateChunk: vi.fn(), reset: vi.fn() },
    sine220: { generateChunk: vi.fn(), reset: vi.fn() },
    whiteNoise: { generateChunk: vi.fn(), reset: vi.fn() },
    majorChord: { generateChunk: vi.fn(), reset: vi.fn() },
    octaves: { generateChunk: vi.fn(), reset: vi.fn() }
  }))
}))

vi.mock('../generators/gameSounds', () => ({
  createGameSounds: vi.fn(() => ({
    thruster: { generateChunk: vi.fn(), reset: vi.fn() },
    shield: { generateChunk: vi.fn(), reset: vi.fn() },
    explosionBunker: { generateChunk: vi.fn(), reset: vi.fn() },
    explosionShip: { generateChunk: vi.fn(), reset: vi.fn() },
    explosionAlien: { generateChunk: vi.fn(), reset: vi.fn() }
  }))
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSoundEngine', () => {
  it('creates sound engine with required properties', () => {
    const engine = createSoundEngine()

    expect(engine).toHaveProperty('audioContext')
    expect(engine).toHaveProperty('masterGain')
    expect(engine).toHaveProperty('setVolume')
    expect(engine).toHaveProperty('start')
    expect(engine).toHaveProperty('stop')
    expect(engine).toHaveProperty('play')
    expect(engine).toHaveProperty('getCurrentSoundType')
    expect(engine).toHaveProperty('isPlaying')
    expect(engine).toHaveProperty('resumeContext')
  })

  it('can play different sound types', () => {
    const engine = createSoundEngine()

    // Should not throw when playing valid sounds
    expect(() => engine.play?.('fire')).not.toThrow()
    expect(() => engine.play?.('thruster')).not.toThrow()
    expect(() => engine.play?.('silence')).not.toThrow()
  })

  it('tracks current sound type', () => {
    const engine = createSoundEngine()

    // Should start with silence
    expect(engine.getCurrentSoundType?.()).toBe('silence')

    // After playing a sound, should return that sound type
    engine.play?.('fire')
    expect(engine.getCurrentSoundType?.()).toBe('fire')
  })

  it('has start method that can be called', () => {
    const engine = createSoundEngine()
    expect(() => engine.start()).not.toThrow()
  })

  it('has stop method that can be called', () => {
    const engine = createSoundEngine()
    expect(() => engine.stop()).not.toThrow()
  })
})
