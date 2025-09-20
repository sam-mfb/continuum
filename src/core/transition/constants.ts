/**
 * @fileoverview Constants for transition timing and effects
 */

/**
 * Delay frames before transition effect starts (MICODELAY from GW.h)
 * During this time, the ship can still move and even die
 */
export const MICO_DELAY_FRAMES = 45

/**
 * Delay frames after fizz completes before loading next level
 * ~1.5 seconds at 20 FPS (original uses 150 ticks)
 */
export const TRANSITION_DELAY_FRAMES = 30

/**
 * Duration of the fizz dissolve effect in frames
 * Based on measurements of fizz time on a Mac Plus
 */
export const FIZZ_DURATION = 26