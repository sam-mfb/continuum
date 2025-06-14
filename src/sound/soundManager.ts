/**
 * Sound manager that bridges Redux state with the sound engine
 * Phase 1: Simplified to just Redux bridge functionality
 */

import { store } from '../store/store';
import { SoundType } from './constants';
import { createSoundEngine } from './soundEngine';
import { startSound as startSoundAction, stopSound as stopSoundAction } from './soundSlice';
import type { SoundEngine } from './types';

/**
 * Manages sound playback and lifecycle
 * Phase 1: Minimal implementation - just Redux bridge
 */
export const createSoundManager = (): {
  initialize: () => void;
  startSound: (soundType: SoundType) => void;
  stopSound: () => void;
  setVolume: (volume: number) => void;
  cleanup: () => void;
} => {
  let engine: SoundEngine | null = null;
  let isInitialized = false;
  
  /**
   * Initialize the sound system
   */
  const initialize = (): void => {
    if (isInitialized) return;
    
    try {
      engine = createSoundEngine();
      isInitialized = true;
      
      // Set initial volume from Redux state
      const state = store.getState();
      engine.setVolume(state.sound.volume);
    } catch (error) {
      console.error('Failed to initialize sound engine:', error);
      engine = null;
      isInitialized = false;
    }
  };
  
  /**
   * Start playing a sound
   * Phase 1: Just updates Redux state
   */
  const startSound = (soundType: SoundType): void => {
    // Update Redux state
    store.dispatch(startSoundAction(soundType));
    
    // Phase 1: No actual audio playback
    if (engine) {
      engine.start();
    }
  };
  
  /**
   * Stop the current sound
   * Phase 1: Just updates Redux state
   */
  const stopSound = (): void => {
    store.dispatch(stopSoundAction());
    
    // Phase 1: No actual audio to stop
    if (engine) {
      engine.stop();
    }
  };
  
  /**
   * Set the master volume
   */
  const setVolume = (volume: number): void => {
    if (engine) {
      engine.setVolume(volume);
    }
  };
  
  /**
   * Clean up the sound system
   */
  const cleanup = (): void => {
    stopSound();
    engine = null;
    isInitialized = false;
  };
  
  // Subscribe to volume changes in Redux
  let lastVolume = store.getState().sound.volume;
  store.subscribe(() => {
    const state = store.getState();
    if (state.sound.volume !== lastVolume) {
      lastVolume = state.sound.volume;
      setVolume(lastVolume);
    }
    
    // Handle sound being disabled
    if (!state.sound.enabled && state.sound.currentSound !== SoundType.NO_SOUND) {
      stopSound();
    }
  });
  
  return {
    initialize,
    startSound,
    stopSound,
    setVolume,
    cleanup,
  };
};

// Create singleton instance
export const soundManager = createSoundManager();