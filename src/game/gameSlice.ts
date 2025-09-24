/**
 * @fileoverview Game state management slice
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AlignmentMode } from '@/core/shared'

export type GameMode = 'start' | 'playing' | 'highScoreEntry' | 'gameOver'

export type PendingHighScore = {
  score: number
  planet: number
  fuel: number
}

export type GameState = {
  // Game status
  gameOver: boolean
  levelComplete: boolean

  // Display settings
  alignmentMode: AlignmentMode

  // Game flow
  mode: GameMode
  pendingHighScore: PendingHighScore | null
}

const initialState: GameState = {
  gameOver: false,
  levelComplete: false,
  alignmentMode: 'screen-fixed', // Default to screen-fixed (not original)
  mode: 'start',
  pendingHighScore: null
}

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Level progression
    markLevelComplete: state => {
      state.levelComplete = true
    },

    clearLevelComplete: state => {
      state.levelComplete = false
    },

    // Game over handling
    triggerGameOver: state => {
      state.gameOver = true
    },

    resetGame: state => {
      state.gameOver = false
      state.levelComplete = false
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
  markLevelComplete,
  clearLevelComplete,
  triggerGameOver,
  resetGame,
  setAlignmentMode,
  toggleAlignmentMode,
  setMode,
  startGame,
  setPendingHighScore,
  clearPendingHighScore
} = gameSlice.actions
