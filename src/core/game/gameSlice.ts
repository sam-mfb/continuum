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
  cheatUsed: boolean // Whether cheats were used this game
  killShipNextFrame: boolean
}

const initialState: GameState = {
  gameOver: false,
  levelComplete: false,
  paused: false,
  showMap: false,
  cheatUsed: false,
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
    // Mark that a cheat was used
    markCheatUsed: state => {
      state.cheatUsed = true
    },
    resetCheatUsed: state => {
      state.cheatUsed = false
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
  markCheatUsed,
  resetCheatUsed,
  killShipNextFrame,
  resetKillShipNextFrame
} = gameSlice.actions
