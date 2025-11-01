/**
 * @fileoverview Game-specific constants
 */

// Game progression
export const STARTING_LEVEL = 1

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
