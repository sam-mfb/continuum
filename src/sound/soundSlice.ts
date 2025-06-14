/**
 * Redux slice for sound state management
 * Manages the current sound, priority, and playback state
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { SoundState } from './types';
import { SoundType, SOUND_PRIORITIES } from './constants';

const initialState: SoundState = {
  currentSound: SoundType.NO_SOUND,
  priority: 0,
  enabled: true,
  volume: 0.5,
  activeSource: null
};

const soundSlice = createSlice({
  name: 'sound',
  initialState,
  reducers: {
    /**
     * Start a sound if its priority is higher than current
     * Mirrors the priority check in start_sound() (Sound.c:465)
     */
    startSound: (state, action: PayloadAction<SoundType>) => {
      const newSound = action.payload;
      const newPriority = SOUND_PRIORITIES[newSound];
      
      // Original: if (priorities[whichsound] > priority) (Sound.c:465)
      if (newPriority > state.priority) {
        state.currentSound = newSound;
        state.priority = newPriority;
      }
    },
    
    /**
     * Stop the current sound
     * Equivalent to clear_sound() (Sound.c:573-580)
     */
    stopSound: (state) => {
      state.currentSound = SoundType.NO_SOUND;
      state.priority = 0;
      state.activeSource = null;
    },
    
    /**
     * Set the master volume
     */
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload));
    },
    
    /**
     * Toggle sound on/off
     */
    toggleSound: (state) => {
      state.enabled = !state.enabled;
      if (!state.enabled) {
        state.currentSound = SoundType.NO_SOUND;
        state.priority = 0;
        state.activeSource = null;
      }
    },
    
    /**
     * Store reference to active audio source for cleanup
     */
    setActiveSource: (state, action: PayloadAction<AudioBufferSourceNode | null>) => {
      // Note: We can't actually store AudioBufferSourceNode in Redux
      // This is just for type definition - actual management happens outside Redux
      state.activeSource = action.payload;
    }
  }
});

export const { startSound, stopSound, setVolume, toggleSound, setActiveSource } = soundSlice.actions;
export default soundSlice.reducer;