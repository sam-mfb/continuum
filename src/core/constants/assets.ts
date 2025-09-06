/**
 * @fileoverview Asset path constants
 * Centralized location for all asset paths used throughout the application
 */

/**
 * Asset paths for binary data files and graphics resources
 */
export const ASSET_PATHS = {
  // Galaxy data files
  GALAXY_DATA: '/art/release_galaxy.bin',
  
  // Sprite and graphics resources
  SPRITE_RESOURCE: '/art/graphics/rsrc_260.bin',
  STATUS_BAR_RESOURCE: '/art/graphics/rsrc_259.bin'
} as const

export type AssetPath = typeof ASSET_PATHS[keyof typeof ASSET_PATHS]