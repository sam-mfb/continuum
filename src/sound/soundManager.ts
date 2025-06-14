/**
 * Sound manager that bridges Redux state with the sound engine
 * Handles sound playback lifecycle and state synchronization
 */

import { store } from '../store/store';
import { SoundType, SOUND_PRIORITIES } from './constants';
import { createSoundEngine } from './soundEngine';
import { startSound as startSoundAction, stopSound as stopSoundAction } from './soundSlice';
import type { SoundEngine } from './types';

/**
 * Manages sound playback and lifecycle
 * Equivalent to the VBL interrupt handler and sound control functions in the original
 */
export const createSoundManager = (): {
  initialize: () => void;
  startSound: (soundType: SoundType) => void;
  stopSound: () => void;
  setVolume: (volume: number) => void;
  cleanup: () => void;
} => {
  let engine: SoundEngine | null = null;
  let currentSource: AudioBufferSourceNode | null = null;
  let isInitialized = false;
  
  /**
   * Initialize the sound system
   * Similar to open_sound() in Sound.c:527-559
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
   * Equivalent to start_sound() in Sound.c:461-522
   */
  const startSound = (soundType: SoundType): void => {
    if (!engine || !isInitialized) {
      initialize();
      if (!engine) return;
    }
    
    const state = store.getState();
    
    // Check if sound is enabled
    if (!state.sound.enabled) return;
    
    // Check priority (Sound.c:465)
    const newPriority = SOUND_PRIORITIES[soundType];
    if (newPriority <= state.sound.priority && soundType !== SoundType.NO_SOUND) {
      return;
    }
    
    // Stop current sound if playing
    if (currentSource) {
      try {
        currentSource.stop();
      } catch {
        // Source may have already stopped
      }
      currentSource = null;
    }
    
    // Update Redux state
    store.dispatch(startSoundAction(soundType));
    
    // Start the new sound
    switch (soundType) {
      case SoundType.THRU_SOUND:
        if (engine) {
          const thrustSound = engine.createThrustSound();
          currentSource = thrustSound.play();
        }
        break;
      
      case SoundType.NO_SOUND:
        // Just stop current sound
        break;
      
      // Additional sounds will be implemented here
      default:
        console.warn(`Sound type ${soundType} not yet implemented`);
    }
  };
  
  /**
   * Stop the current sound
   * Equivalent to clear_sound() in Sound.c:573-580
   */
  const stopSound = (): void => {
    if (currentSource) {
      try {
        currentSource.stop();
      } catch {
        // Source may have already stopped
      }
      currentSource = null;
    }
    
    store.dispatch(stopSoundAction());
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
   * Similar to close_sound() in Sound.c:561-571
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
    if (!state.sound.enabled && currentSource) {
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