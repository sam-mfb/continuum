/**
 * @fileoverview Type definitions for transition system
 */

/**
 * Minimal root state type for transition system
 * Allows transition module to work without importing from game layer
 */
export type TransitionRootState = {
  transition: TransitionState
  ship: {
    deadCount: number
    shiprot: number
    shipx: number
    shipy: number
  }
  // Other slices can be any shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * State for managing level transition effects
 */
export type TransitionState = {
  /** Whether a transition is currently active */
  active: boolean

  /** Countdown frames before transition effect starts (allows ship to keep moving) */
  preDelayFrames: number

  /** Whether the fizz effect is currently playing */
  fizzActive: boolean

  /** Whether the fizz transition has been started (prevents re-creation) */
  fizzStarted: boolean

  /** Post-transition delay frames counter */
  delayFrames: number

  /** Flag set for one frame when fizz completes (triggers ECHO_SOUND) */
  fizzJustFinished: boolean
}
