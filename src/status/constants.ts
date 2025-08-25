/**
 * Status bar and digit rendering constants
 * From orig/Sources/GW.h and Play.c
 */

// Digit dimensions
export const DIGHEIGHT = 9 // Height of digit sprites in pixels
export const DIGWIDTH = 8 // Width of digit sprites in pixels (1 byte)

// Character indices in the digits array
export const ACHAR = 10 // Index of character 'A' in digits array
export const SHIPCHAR = 36 // Index of little ship character
export const SPACECHAR = 37 // Index of space character

// Status bar positions from orig/Sources/Play.c

// Top row (y=0) positions for ship lives display
export const LIVES_START_X = 8
export const LIVES_Y = 0
export const LIVES_SPACING = 8

// Bottom row (y=12) positions
export const MESSAGE_X = 8
export const MESSAGE_Y = 12
export const FUEL_X = 296
export const FUEL_Y = 12
export const BONUS_X = 384
export const BONUS_Y = 12
export const LEVEL_X = 456
export const LEVEL_Y = 12

// Score position varies based on value (from score_plus in Play.c:997)
export const SCORE_Y = 12
export const SCORE_X_NORMAL = 216  // For scores < 1,000,000
export const SCORE_X_LARGE = 224   // For scores >= 1,000,000