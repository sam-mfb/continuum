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
  showInGameControls: boolean

  // Sound settings
  volume: number
  soundOn: boolean

  // Game flow
  mode: GameMode
  mostRecentScore: MostRecentScore | null

  // UI state
  showSettings: boolean

  // Current galaxy
  currentGalaxyId: string
  totalLevels: number
}

const initialState: AppState = {
  alignmentMode: 'screen-fixed', // Default to screen-fixed (not original)
  showInGameControls: true,
  volume: 0,
  soundOn: true,
  mode: 'start',
  mostRecentScore: null,
  showSettings: false,
  currentGalaxyId: 'release', // Will be overridden by galaxy config
  totalLevels: 0 // Will be set when galaxy is loaded
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

    toggleInGameControls: state => {
      state.showInGameControls = !state.showInGameControls
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
    },

    // Galaxy management
    setCurrentGalaxy: (state, action: PayloadAction<string>) => {
      state.currentGalaxyId = action.payload
    },

    setTotalLevels: (state, action: PayloadAction<number>) => {
      state.totalLevels = action.payload
    }
  }
})

export const {
  setAlignmentMode,
  toggleAlignmentMode,
  toggleInGameControls,
  setVolume,
  enableSound,
  disableSound,
  setMode,
  startGame,
  setMostRecentScore,
  openSettings,
  closeSettings,
  toggleSettings,
  setCurrentGalaxy,
  setTotalLevels
} = appSlice.actions
