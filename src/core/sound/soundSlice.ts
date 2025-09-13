/**
 * Redux slice for managing sound state
 * 
 * Accumulates sound events during each game loop frame,
 * then plays all sounds at once at the end of the frame
 */

import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { SoundType } from './constants'

export type SoundUIState = {
  // Frame-based sound accumulation
  discrete: SoundType[] // Discrete sounds to play this frame
  continuous: {
    thrusting: boolean
    shielding: boolean
  }
  lastContinuous: {  // Track what was playing last frame
    thrusting: boolean
    shielding: boolean
  }
  
  // Audio settings
  enabled: boolean // Sound on/off
  volume: number // Master volume 0-1
  currentSound: SoundType // For UI display only
}

const initialState: SoundUIState = {
  discrete: [],
  continuous: {
    thrusting: false,
    shielding: false
  },
  lastContinuous: {
    thrusting: false,
    shielding: false
  },
  enabled: true,
  volume: 0.5,
  currentSound: SoundType.NO_SOUND
}

const soundSlice = createSlice({
  name: 'sound',
  initialState,
  reducers: {
    /**
     * Reset frame - clear discrete sounds and update lastContinuous
     */
    resetFrame: (state) => {
      // Clear discrete sounds for new frame
      state.discrete = []
      
      // Copy current continuous state to last
      state.lastContinuous = {
        thrusting: state.continuous.thrusting,
        shielding: state.continuous.shielding
      }
    },

    /**
     * Play a discrete sound (one-shot)
     */
    playDiscrete: (state, action: PayloadAction<SoundType>) => {
      // Add to discrete sounds for this frame (avoid duplicates)
      if (!state.discrete.includes(action.payload)) {
        state.discrete.push(action.payload)
      }
    },

    /**
     * Set thrusting state (continuous sound)
     */
    setThrusting: (state, action: PayloadAction<boolean>) => {
      state.continuous.thrusting = action.payload
    },

    /**
     * Set shielding state (continuous sound)  
     */
    setShielding: (state, action: PayloadAction<boolean>) => {
      state.continuous.shielding = action.payload
    },

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
  resetFrame,
  playDiscrete,
  setThrusting,
  setShielding,
  setVolume,
  toggleSound,
  setEnabled,
  setCurrentSound,
  startSound,
  stopSound
} = soundSlice.actions
export default soundSlice.reducer
