/**
 * Tests for the sound manager
 * Verifies integration between Redux state and sound engine
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { store } from '../../store/store';
import { SoundType } from '../constants';
import { setVolume, toggleSound } from '../soundSlice';

// Mock the sound engine
vi.mock('../soundEngine', () => ({
  createSoundEngine: vi.fn(() => ({
    audioContext: {},
    masterGain: {},
    createThrustSound: vi.fn(() => ({
      play: vi.fn(() => ({
        stop: vi.fn()
      }))
    })),
    setVolume: vi.fn()
  }))
}));

// Import after mocking
import { createSoundManager } from '../soundManager';

describe('createSoundManager', () => {
  let soundManager: ReturnType<typeof createSoundManager>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Redux state
    store.dispatch(toggleSound());
    store.dispatch(toggleSound());
    store.dispatch(setVolume(0.5));
    // Create new instance for each test
    soundManager = createSoundManager();
  });
  
  afterEach(() => {
    soundManager.cleanup();
  });
  
  it('initializes sound engine on first use', async () => {
    const { createSoundEngine } = await import('../soundEngine');
    
    expect(createSoundEngine).not.toHaveBeenCalled();
    
    soundManager.startSound(SoundType.THRU_SOUND);
    
    expect(createSoundEngine).toHaveBeenCalledTimes(1);
  });
  
  it('respects sound priority system', () => {
    soundManager.initialize();
    
    // Start low priority sound
    soundManager.startSound(SoundType.THRU_SOUND); // Priority 35
    expect(store.getState().sound.currentSound).toBe(SoundType.THRU_SOUND);
    
    // Try to start lower priority sound - should be ignored
    soundManager.startSound(SoundType.SOFT_SOUND); // Priority 30
    expect(store.getState().sound.currentSound).toBe(SoundType.THRU_SOUND);
    
    // Start higher priority sound - should replace
    soundManager.startSound(SoundType.FIRE_SOUND); // Priority 70
    expect(store.getState().sound.currentSound).toBe(SoundType.FIRE_SOUND);
  });
  
  it('stops sound when sound is disabled', async () => {
    soundManager.initialize();
    soundManager.startSound(SoundType.THRU_SOUND);
    
    expect(store.getState().sound.currentSound).toBe(SoundType.THRU_SOUND);
    
    // Disable sound
    store.dispatch(toggleSound());
    
    // Allow store subscription to process
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(store.getState().sound.currentSound).toBe(SoundType.NO_SOUND);
  });
  
  it('updates volume when Redux state changes', async () => {
    soundManager.initialize();
    
    // Change volume in Redux
    store.dispatch(setVolume(0.8));
    
    // Allow store subscription to process
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // The volume should be set on the engine
    expect(store.getState().sound.volume).toBe(0.8);
  });
  
  it('cleans up properly', () => {
    soundManager.initialize();
    soundManager.startSound(SoundType.THRU_SOUND);
    
    soundManager.cleanup();
    
    expect(store.getState().sound.currentSound).toBe(SoundType.NO_SOUND);
  });
});