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
import type { AlignmentMode } from '@/core/shared/alignment'

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

  // Display settings
  alignmentMode: AlignmentMode
}

const initialState: GameState = {
  currentLevel: STARTING_LEVEL,
  galaxyHeader: null,
  galaxyLoaded: false,
  gameOver: false,
  levelComplete: false,
  statusMessage: '',
  alignmentMode: 'screen-fixed' // Default to screen-fixed (not original)
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
    },

    // Display settings
    setAlignmentMode: (state, action: PayloadAction<AlignmentMode>) => {
      state.alignmentMode = action.payload
    },

    toggleAlignmentMode: state => {
      state.alignmentMode =
        state.alignmentMode === 'world-fixed' ? 'screen-fixed' : 'world-fixed'
    }
  }
})

export const {
  loadGalaxyHeader,
  setCurrentLevel,
  markLevelComplete,
  triggerGameOver,
  resetGame,
  setStatusMessage,
  clearStatusMessage,
  setAlignmentMode,
  toggleAlignmentMode
} = gameSlice.actions

export default gameSlice.reducer
