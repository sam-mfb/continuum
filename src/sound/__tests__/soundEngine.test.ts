/**
 * Tests for the sound engine
 * Phase 1: Tests for minimal shell implementation
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
    expect(engine).toHaveProperty('setVolume');
    expect(engine).toHaveProperty('start');
    expect(engine).toHaveProperty('stop');
  });

  it('initializes audio context and connects master gain', () => {
    const engine = createSoundEngine();
    
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(engine.masterGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });
  
  it('sets volume correctly', () => {
    const engine = createSoundEngine();
    const mockGainValue = { value: 1 };
    Object.defineProperty(engine.masterGain, 'gain', {
      value: mockGainValue,
      writable: true
    });
    
    engine.setVolume(0.5);
    expect(mockGainValue.value).toBe(0.5);
    
    // Test clamping
    engine.setVolume(1.5);
    expect(mockGainValue.value).toBe(1);
    
    engine.setVolume(-0.5);
    expect(mockGainValue.value).toBe(0);
  });

  it('has start method that can be called', () => {
    const engine = createSoundEngine();
    expect(() => engine.start()).not.toThrow();
  });

  it('has stop method that can be called', () => {
    const engine = createSoundEngine();
    expect(() => engine.stop()).not.toThrow();
  });
});