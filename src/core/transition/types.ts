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
 * Status of the transition state machine
 */
export type TransitionStatus =
  | 'inactive'
  | 'level-complete'
  | 'fizz'
  | 'starmap'

/**
 * State for managing level transition effects
 */
export type TransitionState = {
  /** Current status of the transition */
  status: TransitionStatus

  /** Countdown frames before fizz effect starts (ship can still move) */
  preFizzFrames: number

  /** Frames showing starmap after fizz completes */
  starmapFrames: number
}
