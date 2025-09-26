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
  showMap: boolean
  highScoreEligible: boolean // Whether this game is eligible for a highscore
}

const initialState: GameState = {
  gameOver: false,
  levelComplete: false,
  paused: false,
  showMap: false,
  highScoreEligible: true
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
      state.highScoreEligible = true
    },
    pause: state => {
      state.paused = true
    },
    unpause: state => {
      state.paused = false
    },
    togglePause: state => {
      state.paused = !state.paused
    },
    showMap: state => {
      state.showMap = true
    },
    hideMap: state => {
      state.showMap = false
    },
    // Make game high score ineligible
    invalidateHighScore: state => {
      state.highScoreEligible = false
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
  togglePause,
  showMap,
  hideMap,
  invalidateHighScore
} = gameSlice.actions
