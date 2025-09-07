/**
 * Redux slice for sound UI settings
 * Only manages UI-related settings like volume and mute
 * Actual sound playback is handled by the sound service
 */

import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { SoundType } from './constants'

export type SoundUIState = {
  enabled: boolean    // Sound on/off
  volume: number      // Master volume 0-1
  currentSound: SoundType  // For UI display only
}

const initialState: SoundUIState = {
  enabled: true,
  volume: 0.5,
  currentSound: SoundType.NO_SOUND
}

const soundSlice = createSlice({
  name: 'sound',
  initialState,
  reducers: {
    /**
     * Set the master volume
     */
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = Math.max(0, Math.min(1, action.payload))
    },

    /**
     * Toggle sound on/off
     */
    toggleSound: state => {
      state.enabled = !state.enabled
      if (!state.enabled) {
        state.currentSound = SoundType.NO_SOUND
      }
    },

    /**
     * Enable/disable sound
     */
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload
      if (!state.enabled) {
        state.currentSound = SoundType.NO_SOUND
      }
    },

    /**
     * Update current sound for UI display
     * This is called by the service to keep UI in sync
     */
    setCurrentSound: (state, action: PayloadAction<SoundType>) => {
      state.currentSound = action.payload
    },

    /**
     * These actions are for backwards compatibility with the service
     * The service dispatches these to keep the UI in sync
     */
    startSound: (state, action: PayloadAction<SoundType>) => {
      state.currentSound = action.payload
    },

    stopSound: state => {
      state.currentSound = SoundType.NO_SOUND
    }
  }
})

export const {
  setVolume,
  toggleSound,
  setEnabled,
  setCurrentSound,
  startSound,
  stopSound
} = soundSlice.actions
export default soundSlice.reducer
