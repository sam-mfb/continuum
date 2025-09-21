/**
 * @fileoverview Redux slice for managing level transitions
 */

import { createSlice } from '@reduxjs/toolkit'
import type { TransitionState } from './types'
import { MICO_DELAY_FRAMES } from './constants'

const initialState: TransitionState = {
  active: false,
  preDelayFrames: 0,
  fizzActive: false,
  fizzStarted: false,
  delayFrames: 0,
  fizzJustFinished: false
}

export const transitionSlice = createSlice({
  name: 'transition',
  initialState,
  reducers: {
    /**
     * Start a level completion transition
     * Sets up the pre-delay countdown and fizz state
     */
    startLevelTransition: state => {
      state.active = true
      state.preDelayFrames = MICO_DELAY_FRAMES
      state.delayFrames = 0
      state.fizzJustFinished = false
      state.fizzStarted = false
      state.fizzActive = true
    },

    /**
     * Decrement the pre-transition delay counter
     * Ship can still move during this countdown
     */
    decrementPreDelay: state => {
      if (state.preDelayFrames > 0) {
        state.preDelayFrames--
      }
    },


    /**
     * Mark that the fizz transition has been started
     * Prevents recreating the FizzTransition instance
     */
    markFizzStarted: state => {
      state.fizzStarted = true
    },

    /**
     * Mark the fizz animation as complete
     * Sets the justFinished flag for sound triggering
     */
    completeFizz: state => {
      state.fizzActive = false
      state.fizzJustFinished = true
    },

    /**
     * Clear the fizz completion flag
     * Called after the ECHO_SOUND has been triggered
     */
    clearFizzFinished: state => {
      state.fizzJustFinished = false
    },

    /**
     * Increment the post-transition delay counter
     * Counts frames after fizz completes before level load
     */
    incrementDelay: state => {
      state.delayFrames++
    },

    /**
     * Reset the entire transition state
     * Called when transition completes and next level loads
     */
    resetTransition: state => {
      state.active = false
      state.preDelayFrames = 0
      state.fizzActive = false
      state.fizzStarted = false
      state.delayFrames = 0
      state.fizzJustFinished = false
    }
  }
})

export const {
  startLevelTransition,
  decrementPreDelay,
  markFizzStarted,
  completeFizz,
  clearFizzFinished,
  incrementDelay,
  resetTransition
} = transitionSlice.actions

export default transitionSlice.reducer
