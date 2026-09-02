/**
 * @fileoverview Game-specific constants
 */

// Game progression
export const STARTING_LEVEL = 1

/**
 * Slack allowed when deciding whether enough time has passed to run the next
 * game frame.
 *
 * The loop is driven by requestAnimationFrame, so a frame can only start on a
 * display refresh. Without slack the comparison is a knife edge: on a 120Hz
 * display six refreshes come to 50.0ms, which is exactly the 20fps interval,
 * so timestamp jitter makes it fail about half the time and the frame waits a
 * seventh refresh (58.3ms). Measured on a 120Hz display, that put 55% of
 * frames 8ms late and ran the game at ~17.5fps instead of 20.
 *
 * The slack must stay under one refresh interval so a frame is never run a
 * whole refresh early; 4ms is comfortably below 60Hz (16.7ms) and 120Hz
 * (8.3ms) intervals.
 */
export const FRAME_INTERVAL_SLACK_MS = 4

// Sound defaults
export const DEFAULT_SOUND_VOLUME = 0.5
export const DEFAULT_SOUND_MUTED = false

// Asset paths for the game
export const ASSET_PATHS = {
  // Sprite and graphics resources
  SPRITE_RESOURCE: '/rsrc_260.bin',
  STATUS_BAR_RESOURCE: '/rsrc_259.bin',
  TITLE_PAGE_RESOURCE: '/rsrc_261.bin'
} as const

export type AssetPath = (typeof ASSET_PATHS)[keyof typeof ASSET_PATHS]
