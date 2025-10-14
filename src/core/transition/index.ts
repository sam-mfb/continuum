/**
 * @fileoverview Barrel export for transition module
 */

export { transitionSlice } from './transitionSlice'
export {
  startLevelTransition,
  decrementPreFizz,
  transitionToStarmap,
  incrementStarmap,
  resetTransition,
  skipToNextLevel
} from './transitionSlice'
export type { FizzTransitionService } from './FizzTransitionService'
export { createFizzTransitionService } from './FizzTransitionService'
export type { TransitionState, TransitionStatus } from './types'
export {
  MICO_DELAY_FRAMES,
  TRANSITION_DELAY_FRAMES,
  FIZZ_DURATION
} from './constants'
export { advanceLFSR, shouldSkipSeed, generatePixelSequence } from './lfsrUtils'
