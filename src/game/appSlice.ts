/**
 * @fileoverview Application state management slice
 * Handles UI state, display settings, and sound settings
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AlignmentMode } from '@/core/shared'

export type GameMode = 'start' | 'playing' | 'highScoreEntry' | 'gameOver'

export type PendingHighScore = {
  score: number
  planet: number
  fuel: number
}

export type AppState = {
  // Display settings
  alignmentMode: AlignmentMode

  // Sound settings
  volume: number
  soundOn: boolean

  // Game flow
  mode: GameMode
  pendingHighScore: PendingHighScore | null

  // UI state
  showSettings: boolean
}

const initialState: AppState = {
  alignmentMode: 'screen-fixed', // Default to screen-fixed (not original)
  volume: 0,
  soundOn: true,
  mode: 'start',
  pendingHighScore: null,
  showSettings: false
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Display settings
    setAlignmentMode: (state, action: PayloadAction<AlignmentMode>) => {
      state.alignmentMode = action.payload
    },

    toggleAlignmentMode: state => {
      state.alignmentMode =
        state.alignmentMode === 'world-fixed' ? 'screen-fixed' : 'world-fixed'
    },

    // Sound settings
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload
    },
    enableSound: state => {
      state.soundOn = true
    },
    disableSound: state => {
      state.soundOn = false
    },

    // Game flow management
    setMode: (state, action: PayloadAction<GameMode>) => {
      state.mode = action.payload
      if (action.payload === 'start') {
        state.pendingHighScore = null
      }
    },

    startGame: state => {
      state.mode = 'playing'
      state.pendingHighScore = null
    },

    setPendingHighScore: (state, action: PayloadAction<PendingHighScore>) => {
      state.pendingHighScore = action.payload
      state.mode = 'highScoreEntry'
    },

    clearPendingHighScore: state => {
      state.pendingHighScore = null
    },

    // UI state actions
    openSettings: state => {
      state.showSettings = true
    },

    closeSettings: state => {
      state.showSettings = false
    },

    toggleSettings: state => {
      state.showSettings = !state.showSettings
    }
  }
})

export const {
  setAlignmentMode,
  toggleAlignmentMode,
  setVolume,
  enableSound,
  disableSound,
  setMode,
  startGame,
  setPendingHighScore,
  clearPendingHighScore,
  openSettings,
  closeSettings,
  toggleSettings
} = appSlice.actions
