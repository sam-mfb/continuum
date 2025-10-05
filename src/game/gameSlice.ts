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
  killShipNextFrame: boolean
}

const initialState: GameState = {
  gameOver: false,
  levelComplete: false,
  paused: false,
  showMap: false,
  highScoreEligible: true,
  // used so timing of modern collisions is in sync with old style
  killShipNextFrame: false
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
    },
    allowHighScore: state => {
      state.highScoreEligible = true
    },
    killShipNextFrame: state => {
      state.killShipNextFrame = true
    },
    resetKillShipNextFrame: state => {
      state.killShipNextFrame = false
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
  invalidateHighScore,
  allowHighScore,
  killShipNextFrame,
  resetKillShipNextFrame
} = gameSlice.actions
