/**
 * @fileoverview Type definitions for transition system
 */

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

  /** Bitmap data for the "from" state (current game view) */
  fromBitmap: Uint8Array | null

  /** Bitmap data for the "to" state (star background) */
  toBitmap: Uint8Array | null

  /** Post-transition delay frames counter */
  delayFrames: number

  /** Flag set for one frame when fizz completes (triggers ECHO_SOUND) */
  fizzJustFinished: boolean
}