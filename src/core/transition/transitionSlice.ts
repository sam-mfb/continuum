/**
 * @fileoverview Redux slice for managing level transitions
 */

import { createSlice } from '@reduxjs/toolkit'
import type { TransitionState } from './types'
import { MICO_DELAY_FRAMES } from './constants'

const initialState: TransitionState = {
  status: 'inactive',
  preFizzFrames: 0,
  starmapFrames: 0
}

export const transitionSlice = createSlice({
  name: 'transition',
  initialState,
  reducers: {
    /**
     * Start a level completion transition
     * Sets up the level-complete phase with countdown to fizz
     */
    startLevelTransition: state => {
      state.status = 'level-complete'
      state.preFizzFrames = MICO_DELAY_FRAMES
      state.starmapFrames = 0
    },
    /**
     * Skip to next level without delay
     */
    skipToNextLevel: state => {
      state.status = 'level-complete'
      state.preFizzFrames = 1
      state.starmapFrames = 0
    },

    /**
     * Decrement the pre-fizz countdown
     * Ship can still move during this countdown
     * Transitions to fizz when reaches 0
     */
    decrementPreFizz: state => {
      if (state.preFizzFrames > 0) {
        state.preFizzFrames--
        // Auto-transition to fizz when countdown completes
        if (state.preFizzFrames === 0) {
          state.status = 'fizz'
        }
      }
    },

    /**
     * Transition from fizz to starmap phase
     * Called when fizz animation completes
     */
    transitionToStarmap: state => {
      if (state.status === 'fizz') {
        state.status = 'starmap'
        state.starmapFrames = 0
      }
    },

    /**
     * Increment the starmap display counter
     * Counts frames showing starmap before next level loads
     */
    incrementStarmap: state => {
      if (state.status === 'starmap') {
        state.starmapFrames++
      }
    },

    /**
     * Reset the entire transition state
     * Called when transition completes and next level loads
     */
    resetTransition: state => {
      state.status = 'inactive'
      state.preFizzFrames = 0
      state.starmapFrames = 0
    }
  }
})

export const {
  startLevelTransition,
  skipToNextLevel,
  decrementPreFizz,
  transitionToStarmap,
  incrementStarmap,
  resetTransition
} = transitionSlice.actions

export default transitionSlice.reducer
