/**
 * Sound Manager Module
 *
 * Handles all sound operations including discrete sounds,
 * continuous sounds, and frame-based sound accumulation
 */

import type { RootState } from '../store'
import type { SoundService } from '@core/sound'
import { SoundType, playSounds, playDiscrete, setThrusting, setShielding } from '@core/sound'
import type { Store } from '@reduxjs/toolkit'

export type SoundContext = {
  state: RootState
  shipDeadCount: number
  transitionActive: boolean
  preDelayFrames: number
}

/**
 * Handle transition-specific sound triggers
 * Should be called from state updates when transition state changes
 */
export const handleTransitionSounds = (
  store: Store<RootState>,
  prevState: RootState['transition'],
  currState: RootState['transition']
): void => {
  // Check if fizz just started (pre-delay just hit 0)
  if (prevState.preDelayFrames > 0 && currState.preDelayFrames === 0 && currState.fizzStarted) {
    // Play fizz start sound
    console.log('Transition: Playing FIZZ_SOUND')
    store.dispatch(playDiscrete(SoundType.FIZZ_SOUND))

    // Stop any continuous sounds
    store.dispatch(setThrusting(false))
    store.dispatch(setShielding(false))
  }

  // Check if fizz just completed
  if (prevState.fizzActive && !currState.fizzActive && currState.fizzJustFinished) {
    // Play echo sound
    console.log('Transition: Playing ECHO_SOUND')
    store.dispatch(playDiscrete(SoundType.ECHO_SOUND))
  }
}

/**
 * Play all accumulated sounds for the current frame
 */
export const playFrameSounds = (
  context: SoundContext,
  soundService: SoundService
): void => {
  const { state } = context

  // Determine if fizz sound should play (transition active and past pre-delay)
  const fizzActive = context.transitionActive && context.preDelayFrames <= 0

  // Play all sounds with context
  playSounds(state.sound, soundService, {
    shipDeadCount: context.shipDeadCount,
    fizzActive
  })
}
