/**
 * Tests for the sound engine
 * Phase 6: Tests for new buffer-based audio system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSoundEngine } from '../soundEngine'

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

vi.mock('../sampleGenerator', () => ({
  createTestGenerators: vi.fn(() => ({
    silence: { generateChunk: vi.fn(), reset: vi.fn() },
    sine440: { generateChunk: vi.fn(), reset: vi.fn() },
    sine880: { generateChunk: vi.fn(), reset: vi.fn() },
    sine220: { generateChunk: vi.fn(), reset: vi.fn() },
    whiteNoise: { generateChunk: vi.fn(), reset: vi.fn() },
    majorChord: { generateChunk: vi.fn(), reset: vi.fn() },
    octaves: { generateChunk: vi.fn(), reset: vi.fn() }
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
    expect(engine).toHaveProperty('playTestSound')
    expect(engine).toHaveProperty('getTestSounds')
    expect(engine).toHaveProperty('getStats')
    expect(engine).toHaveProperty('isPlaying')
  })

  it('returns test sound names', () => {
    const engine = createSoundEngine()
    const sounds = engine.getTestSounds()
    
    expect(sounds).toContain('silence')
    expect(sounds).toContain('sine440')
    expect(sounds).toContain('whiteNoise')
    expect(sounds).toContain('majorChord')
  })

  it('can switch between test sounds', () => {
    const engine = createSoundEngine()
    
    // Should not throw
    expect(() => engine.playTestSound('sine440')).not.toThrow()
    expect(() => engine.playTestSound('whiteNoise')).not.toThrow()
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
