// Base dimensions constants for mobile scaling
// These represent the original game dimensions at 1x scale

import { SCRWTH, SCRHT } from '@/core/screen'

// Base game dimensions (from original 68k Mac game)
export const BASE_GAME_WIDTH = SCRWTH // 512
export const BASE_GAME_HEIGHT = SCRHT // 342

// Current UI has controls below the game area
// At 2x scale: total height is 684px (342*2)
// This means controls area is 342px at 2x scale, or 171px at 1x scale
export const BASE_CONTROLS_HEIGHT = 171
export const BASE_TOTAL_HEIGHT = BASE_GAME_HEIGHT + BASE_CONTROLS_HEIGHT // 513

// Default scale used throughout the current implementation
export const DEFAULT_SCALE = 2

/**
 * Calculate scaled dimensions based on a scale factor
 * @param scale - The scaling factor (e.g., 1 for original size, 2 for pixel-doubled)
 * @returns Object containing scaled dimensions
 */
export const getScaledDimensions = (
  scale: number
): {
  gameWidth: number
  gameHeight: number
  controlsHeight: number
  totalHeight: number
} => ({
  gameWidth: BASE_GAME_WIDTH * scale,
  gameHeight: BASE_GAME_HEIGHT * scale,
  controlsHeight: BASE_CONTROLS_HEIGHT * scale,
  totalHeight: BASE_TOTAL_HEIGHT * scale
})
