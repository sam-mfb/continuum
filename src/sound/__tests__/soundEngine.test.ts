/**
 * Tests for the sound engine
 * Verifies Web Audio API integration and sound generation
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createSoundEngine } from '../soundEngine';

// Mock Web Audio API for testing
const mockAudioContext = {
  sampleRate: 44100,
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  createBuffer: vi.fn((channels, length, sampleRate) => ({
    length,
    sampleRate,
    numberOfChannels: channels,
    getChannelData: vi.fn(() => new Float32Array(length))
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  destination: {}
};

beforeAll(() => {
  // @ts-ignore
  global.AudioContext = vi.fn(() => mockAudioContext);
});

describe('createSoundEngine', () => {
  it('creates sound engine with required properties', () => {
    const engine = createSoundEngine();
    
    expect(engine).toHaveProperty('audioContext');
    expect(engine).toHaveProperty('masterGain');
    expect(engine).toHaveProperty('createThrustSound');
  });

  it('initializes audio context and connects master gain', () => {
    const engine = createSoundEngine();
    
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(engine.masterGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });
});

describe('createThrustSound', () => {
  it('creates playable sound with play method', () => {
    const engine = createSoundEngine();
    const thrustSound = engine.createThrustSound();
    
    expect(thrustSound).toHaveProperty('play');
    expect(typeof thrustSound.play).toBe('function');
  });

  it('creates audio buffer with correct parameters', () => {
    const engine = createSoundEngine();
    engine.createThrustSound();
    
    expect(mockAudioContext.createBuffer).toHaveBeenCalled();
    const callArgs = mockAudioContext.createBuffer.mock.calls[0];
    expect(callArgs?.[0]).toBe(1); // Mono
    expect(callArgs?.[1]).toBeGreaterThan(0); // Buffer size
    expect(callArgs?.[2]).toBe(44100); // Sample rate
  });

  it('configures buffer source for looping when played', () => {
    const engine = createSoundEngine();
    const thrustSound = engine.createThrustSound();
    
    const source = thrustSound.play();
    
    expect(source.loop).toBe(true);
    expect(source.connect).toHaveBeenCalledWith(engine.masterGain);
    expect(source.start).toHaveBeenCalled();
  });

  it('returns audio source node for later stopping', () => {
    const engine = createSoundEngine();
    const thrustSound = engine.createThrustSound();
    
    const source = thrustSound.play();
    
    expect(source).toHaveProperty('stop');
    expect(typeof source.stop).toBe('function');
  });
});