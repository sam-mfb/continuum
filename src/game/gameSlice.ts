/**
 * @fileoverview Game state management slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { GalaxyHeader } from '@core/galaxy'
import { STARTING_LEVEL, GAME_OVER_MESSAGE, LEVEL_COMPLETE_MESSAGE } from './constants'

// Module-level storage for non-serializable data
let planetsBufferCache: ArrayBuffer | null = null

export interface GameState {
  // Level progression
  currentLevel: number
  galaxyHeader: GalaxyHeader | null
  hasPlanetsBuffer: boolean // Flag to indicate if buffer is loaded
  
  // Game status
  gameOver: boolean
  levelComplete: boolean
  transitioning: boolean
  transitionFrame: number // Counter for transition animations
  
  // Messages
  statusMessage: string
}

const initialState: GameState = {
  currentLevel: STARTING_LEVEL,
  galaxyHeader: null,
  hasPlanetsBuffer: false,
  gameOver: false,
  levelComplete: false,
  transitioning: false,
  transitionFrame: 0,
  statusMessage: ''
}

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Galaxy data management
    loadGalaxyData: (state, action: PayloadAction<{ 
      header: GalaxyHeader; 
      planetsBuffer: ArrayBuffer 
    }>) => {
      state.galaxyHeader = action.payload.header
      // Store ArrayBuffer outside Redux to avoid serialization issues
      planetsBufferCache = action.payload.planetsBuffer
      state.hasPlanetsBuffer = true
    },

    // Level progression
    setCurrentLevel: (state, action: PayloadAction<number>) => {
      state.currentLevel = action.payload
      state.levelComplete = false
      state.statusMessage = ''
    },

    markLevelComplete: (state) => {
      state.levelComplete = true
      state.transitioning = true
      state.transitionFrame = 0
      state.statusMessage = LEVEL_COMPLETE_MESSAGE
    },

    nextLevel: (state) => {
      if (state.galaxyHeader && state.currentLevel < state.galaxyHeader.planets) {
        state.currentLevel++
        state.levelComplete = false
        state.transitioning = false
        state.transitionFrame = 0
        state.statusMessage = ''
      }
    },

    // Game over handling
    triggerGameOver: (state) => {
      state.gameOver = true
      state.transitioning = true
      state.transitionFrame = 0
      state.statusMessage = GAME_OVER_MESSAGE
    },

    resetGame: (state) => {
      state.currentLevel = STARTING_LEVEL
      state.gameOver = false
      state.levelComplete = false
      state.transitioning = false
      state.transitionFrame = 0
      state.statusMessage = ''
    },

    // Transition animation
    updateTransition: (state) => {
      if (state.transitioning) {
        state.transitionFrame++
      }
    },

    endTransition: (state) => {
      state.transitioning = false
      state.transitionFrame = 0
      // Clear level complete message but keep game over message
      if (state.levelComplete) {
        state.statusMessage = ''
      }
    },

    // Status message
    setStatusMessage: (state, action: PayloadAction<string>) => {
      state.statusMessage = action.payload
    },

    clearStatusMessage: (state) => {
      state.statusMessage = ''
    }
  }
})

export const {
  loadGalaxyData,
  setCurrentLevel,
  markLevelComplete,
  nextLevel,
  triggerGameOver,
  resetGame,
  updateTransition,
  endTransition,
  setStatusMessage,
  clearStatusMessage
} = gameSlice.actions

// Selector to get the planets buffer from cache
export const getPlanetsBuffer = (): ArrayBuffer | null => planetsBufferCache

// Helper to clear the cache (useful for testing or cleanup)
export const clearPlanetsBufferCache = (): void => {
  planetsBufferCache = null
}

export default gameSlice.reducer