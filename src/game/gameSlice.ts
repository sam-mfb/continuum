/**
 * @fileoverview Game state management slice
 * Handles core game state like game over and level completion
 */

import { createSlice } from '@reduxjs/toolkit'

export type GameState = {
  // Game status
  gameOver: boolean
  levelComplete: boolean
  paused: boolean
}

const initialState: GameState = {
  gameOver: false,
  levelComplete: false,
  paused: false
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
    pause: state => {
      state.paused = true
    },
    unpause: state => {
      state.paused = false
    },
    togglePause: state => {
      state.paused = !state.paused
    }
  }
})

export const {
  markLevelComplete,
  clearLevelComplete,
  triggerGameOver,
  resetGame,
  pause,
  unpause,
  togglePause
} = gameSlice.actions
