/**
 * @fileoverview Game-specific constants
 */

// Game progression
export const SHIPSTART = 2 // Number of spare ships to start with (GW.h:135)
export const TOTAL_INITIAL_LIVES = SHIPSTART + 1 // Total lives including current ship
export const STARTING_LEVEL = 1

// Level transition timing (in frames)
export const LEVEL_COMPLETE_DELAY = 60 // 1 second at 60fps
export const GAME_OVER_DELAY = 120 // 2 seconds at 60fps
export const TRANSITION_FADE_DURATION = 30 // 0.5 seconds
