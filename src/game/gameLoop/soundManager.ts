/**
 * Sound Manager Module
 *
 * Handles all sound operations including discrete sounds,
 * continuous sounds, and frame-based sound accumulation
 */

import type { RootState } from '../store'
import type { SoundService } from '@core/sound'
import {
  SoundType,
  playSounds,
  playDiscrete,
  setThrusting,
  setShielding
} from '@core/sound'
import type { Store } from '@reduxjs/toolkit'

export type SoundContext = {
  state: RootState
  shipDeadCount: number
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
  // Check if transitioning from 'level-complete' to 'fizz'
  if (prevState.status === 'level-complete' && currState.status === 'fizz') {
    // Play fizz start sound
    store.dispatch(playDiscrete(SoundType.FIZZ_SOUND))

    // Stop any continuous sounds
    store.dispatch(setThrusting(false))
    store.dispatch(setShielding(false))
  }

  // Check if transitioning from 'fizz' to 'starmap'
  if (prevState.status === 'fizz' && currState.status === 'starmap') {
    // Play echo sound
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

  // Determine if fizz sound should play based on transition status
  const fizzActive = state.transition.status === 'fizz'

  // Play all sounds with context
  playSounds(state.sound, soundService, {
    shipDeadCount: context.shipDeadCount,
    fizzActive
  })
}
