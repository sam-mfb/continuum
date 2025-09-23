/**
 * @fileoverview Game-specific constants
 */

import { SHIPSTART } from '@core/ship'

// Re-export for backward compatibility
export { SHIPSTART }

// Game progression
export const TOTAL_INITIAL_LIVES = SHIPSTART + 1 // Total lives including current ship
export const STARTING_LEVEL = 1

// Sound defaults
export const DEFAULT_SOUND_VOLUME = 0.5
export const DEFAULT_SOUND_MUTED = false

// Asset paths for the game
export const ASSET_PATHS = {
  // Galaxy data files
  GALAXY_DATA: '/release_galaxy.bin',

  // Sprite and graphics resources
  SPRITE_RESOURCE: '/rsrc_260.bin',
  STATUS_BAR_RESOURCE: '/rsrc_259.bin'
} as const

export type AssetPath = (typeof ASSET_PATHS)[keyof typeof ASSET_PATHS]
