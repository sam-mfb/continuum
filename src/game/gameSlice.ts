/**
 * @fileoverview Game state management slice
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GalaxyHeader } from '@core/galaxy'
import { GAME_OVER_MESSAGE, LEVEL_COMPLETE_MESSAGE } from './constants'
import type { AlignmentMode } from '@/core/shared/alignment'

export type GameMode = 'start' | 'playing' | 'highScoreEntry' | 'gameOver'

export type PendingHighScore = {
  score: number
  planet: number
  fuel: number
}

export type GameState = {
  // Level progression
  galaxyHeader: GalaxyHeader | null
  galaxyLoaded: boolean // Flag to indicate if galaxy is loaded

  // Game status
  gameOver: boolean
  levelComplete: boolean

  // Messages
  statusMessage: string

  // Display settings
  alignmentMode: AlignmentMode

  // Game flow
  mode: GameMode
  pendingHighScore: PendingHighScore | null
}

const initialState: GameState = {
  galaxyHeader: null,
  galaxyLoaded: false,
  gameOver: false,
  levelComplete: false,
  statusMessage: '',
  alignmentMode: 'screen-fixed', // Default to screen-fixed (not original)
  mode: 'start',
  pendingHighScore: null
}

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Galaxy data management
    loadGalaxyHeader: (state, action: PayloadAction<GalaxyHeader>) => {
      state.galaxyHeader = action.payload
      state.galaxyLoaded = true
    },

    // Level progression

    markLevelComplete: state => {
      state.levelComplete = true
      state.statusMessage = LEVEL_COMPLETE_MESSAGE
    },

    clearLevelComplete: state => {
      state.levelComplete = false
    },

    // Game over handling
    triggerGameOver: state => {
      state.gameOver = true
      state.statusMessage = GAME_OVER_MESSAGE
    },

    resetGame: state => {
      state.gameOver = false
      state.levelComplete = false
      state.statusMessage = ''
    },

    // Status message
    setStatusMessage: (state, action: PayloadAction<string>) => {
      state.statusMessage = action.payload
    },

    clearStatusMessage: state => {
      state.statusMessage = ''
    },

    // Display settings
    setAlignmentMode: (state, action: PayloadAction<AlignmentMode>) => {
      state.alignmentMode = action.payload
    },

    toggleAlignmentMode: state => {
      state.alignmentMode =
        state.alignmentMode === 'world-fixed' ? 'screen-fixed' : 'world-fixed'
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
      state.gameOver = false
      state.levelComplete = false
      state.statusMessage = ''
      state.pendingHighScore = null
    },

    setPendingHighScore: (state, action: PayloadAction<PendingHighScore>) => {
      state.pendingHighScore = action.payload
      state.mode = 'highScoreEntry'
    },

    clearPendingHighScore: state => {
      state.pendingHighScore = null
    }
  }
})

export const {
  loadGalaxyHeader,
  markLevelComplete,
  clearLevelComplete,
  triggerGameOver,
  resetGame,
  setStatusMessage,
  clearStatusMessage,
  setAlignmentMode,
  toggleAlignmentMode,
  setMode,
  startGame,
  setPendingHighScore,
  clearPendingHighScore
} = gameSlice.actions

export default gameSlice.reducer
