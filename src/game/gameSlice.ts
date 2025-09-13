/**
 * @fileoverview Game state management slice
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GalaxyHeader } from '@core/galaxy'
import {
  STARTING_LEVEL,
  GAME_OVER_MESSAGE,
  LEVEL_COMPLETE_MESSAGE
} from './constants'

export type GameState = {
  // Level progression
  currentLevel: number
  galaxyHeader: GalaxyHeader | null
  galaxyLoaded: boolean // Flag to indicate if galaxy is loaded

  // Game status
  gameOver: boolean
  levelComplete: boolean

  // Messages
  statusMessage: string
}

const initialState: GameState = {
  currentLevel: STARTING_LEVEL,
  galaxyHeader: null,
  galaxyLoaded: false,
  gameOver: false,
  levelComplete: false,
  statusMessage: ''
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
    setCurrentLevel: (state, action: PayloadAction<number>) => {
      state.currentLevel = action.payload
      state.levelComplete = false
      state.statusMessage = ''
    },

    markLevelComplete: state => {
      state.levelComplete = true
      state.statusMessage = LEVEL_COMPLETE_MESSAGE
    },

    nextLevel: state => {
      if (
        state.galaxyHeader &&
        state.currentLevel < state.galaxyHeader.planets
      ) {
        state.currentLevel++
        state.levelComplete = false
        state.statusMessage = ''
      }
    },

    // Game over handling
    triggerGameOver: state => {
      state.gameOver = true
      state.statusMessage = GAME_OVER_MESSAGE
    },

    resetGame: state => {
      state.currentLevel = STARTING_LEVEL
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
    }
  }
})

export const {
  loadGalaxyHeader,
  setCurrentLevel,
  markLevelComplete,
  nextLevel,
  triggerGameOver,
  resetGame,
  setStatusMessage,
  clearStatusMessage
} = gameSlice.actions

export default gameSlice.reducer
