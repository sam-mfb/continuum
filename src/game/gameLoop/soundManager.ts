/**
 * Sound Manager Module
 *
 * Handles all sound operations including discrete sounds,
 * continuous sounds, and frame-based sound accumulation
 */

import type { RootState } from '../store'
import type { SoundService } from '@core/sound'
import { playSounds } from '@core/sound'

export type SoundContext = {
  state: RootState
  shipDeadCount: number
  transitionActive: boolean
  preDelayFrames: number
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
