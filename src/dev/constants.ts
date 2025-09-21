/**
 * @fileoverview Dev tools specific constants
 */

// Asset paths for dev tools
export const ASSET_PATHS = {
  // Galaxy data files
  GALAXY_DATA: '/release_galaxy.bin',

  // Sprite and graphics resources
  SPRITE_RESOURCE: '/rsrc_260.bin',
  STATUS_BAR_RESOURCE: '/rsrc_259.bin'
} as const

export type AssetPath = (typeof ASSET_PATHS)[keyof typeof ASSET_PATHS]