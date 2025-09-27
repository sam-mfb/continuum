/**
 * @fileoverview Application state management slice
 * Handles UI state, display settings, and sound settings
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AlignmentMode } from '@/core/shared'

export type GameMode = 'start' | 'playing' | 'highScoreEntry' | 'gameOver'

export type MostRecentScore = {
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
  mostRecentScore: MostRecentScore | null

  // UI state
  showSettings: boolean
}

const initialState: AppState = {
  alignmentMode: 'screen-fixed', // Default to screen-fixed (not original)
  volume: 0,
  soundOn: true,
  mode: 'start',
  mostRecentScore: null,
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
    },

    startGame: state => {
      state.mode = 'playing'
    },

    setMostRecentScore: (state, action: PayloadAction<MostRecentScore>) => {
      state.mostRecentScore = action.payload
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
  setMostRecentScore,
  openSettings,
  closeSettings,
  toggleSettings
} = appSlice.actions
