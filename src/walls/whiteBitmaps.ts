import { NEW_TYPE } from './constants'

/**
 * White piece bitmap data from Junctions.c
 * Each array represents scanlines of a 16-bit bitmap pattern
 * Used to draw white shadow pieces at wall endpoints
 */

// Generic patterns used by multiple wall types
export const GENERIC_TOP = [
  0xffff, 0x3fff, 0x0fff, 0x03ff, 0x00ff, 0x007f
] as const

// Bottom patterns for each wall direction
export const S_BOT = [0x803f, 0xc03f, 0xf03f, 0xfc3f, 0xff3f, 0xffff] as const
export const SSE_BOT = [0x80ff, 0xc07f, 0xf07f, 0xfc3f, 0xff3f, 0xffff] as const
export const SE_BOT = [0x87ff, 0xc3ff, 0xf1ff, 0xfcff, 0xff7f, 0xffff] as const
export const NE_BOT = [0x8001, 0xc003, 0xf007, 0xfc0f, 0xff1f, 0xffff] as const
export const NNE_BOT = [0x800f, 0xc01f, 0xf01f, 0xfc3f, 0xff3f, 0xffff] as const

// Top patterns for specific wall directions
export const SSE_TOP = [0xffff, 0xbfff, 0xcfff, 0xc3ff, 0xe0ff, 0xe03f] as const
export const SE_TOP = [0xffff, 0xffff, 0xefff, 0xf3ff, 0xf8ff, 0xfc3f] as const

// Side patterns for horizontal walls
export const E_LEFT = [0xffff, 0xffff, 0xf000, 0xfc00, 0xff00, 0xff80] as const
export const ENE_LEFT = [
  0x8000, 0xc000, 0xf000, 0xfc01, 0xff07, 0xffdf
] as const
export const ESE_RIGHT = [
  0xffff, 0x3fff, 0x8fff, 0xe3ff, 0xf8ff, 0xfe7f
] as const

// Glitch fix patterns
export const NE_GLITCH = [0xefff, 0xcfff, 0x8fff, 0x0fff] as const
export const ENE_GLITCH1 = [0x07ff, 0x1fff, 0x7fff] as const
export const ENE_GLITCH2 = [0xff3f, 0xfc3f, 0xf03f, 0xc03f, 0x003f] as const
export const ESE_GLITCH = [0x3fff, 0xcfff, 0xf3ff, 0xfdff] as const

/**
 * Lookup table mapping wall types to their white piece bitmaps
 * Structure matches whitepicts[][] from Junctions.c
 * Array index corresponds to newtype value (0-8)
 * Index 0 is top/left piece, index 1 is bottom/right piece
 * null entries mean no white piece for that position
 */
export const WHITE_PICTS = [
  { top: null, bottom: null }, // 0: unused
  { top: GENERIC_TOP, bottom: S_BOT }, // 1: NEW_S
  { top: SSE_TOP, bottom: SSE_BOT }, // 2: NEW_SSE
  { top: SE_TOP, bottom: SE_BOT }, // 3: NEW_SE
  { top: null, bottom: ESE_RIGHT }, // 4: NEW_ESE
  { top: E_LEFT, bottom: GENERIC_TOP }, // 5: NEW_E
  { top: ENE_LEFT, bottom: GENERIC_TOP }, // 6: NEW_ENE
  { top: NE_BOT, bottom: GENERIC_TOP }, // 7: NEW_NE
  { top: NNE_BOT, bottom: GENERIC_TOP } // 8: NEW_NNE
] as const

/**
 * Hash crosshatch pattern for junctions
 * 6x6 pixel pattern drawn at wall intersections
 */
export const HASH_FIGURE = [
  0x8000, 0x6000, 0x1800, 0x0600, 0x0180, 0x0040
] as const

/**
 * Junction patch patterns
 * Used by one_close() to fill gaps where walls meet
 */
export const N_PATCH = [
  0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f,
  0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f, 0x003f,
  0x003f, 0x003f, 0x003f, 0x003f
] as const

export const NE_PATCH = [0xe000, 0xc001, 0x8003, 0x0007] as const

export const ENE_PATCH = [0xfc00, 0xf003, 0xc00f, 0x003f] as const

export const E_PATCH = [0x0003, 0x0003, 0x0003, 0x0003] as const

export const SE_PATCH = [
  0x07ff, 0x83ff, 0xc1ff, 0xe0ff, 0xf07f, 0xf83f, 0xfc1f, 0xfe0f, 0xff07,
  0xff83, 0xffc1
] as const

export const SSE_PATCH = [
  0x00ff, 0x00ff, 0x807f, 0x807f, 0xc03f, 0xc03f, 0xe01f, 0xe01f, 0xf00f,
  0xf00f, 0xf807, 0xf807, 0xfc03, 0xfc03, 0xfe01, 0xfe01, 0xff00, 0xff00
] as const

/**
 * Simple h1/h2 values for walls
 * Used to optimize white shadow drawing
 */
export const SIMPLE_H1 = [0, 6, 6, 6, 12, 16, 0, 1, 0] as const
export const SIMPLE_H2 = [0, 0, 0, 0, -1, 0, -11, -5, -5] as const

// Type for white bitmap data
export type WhiteBitmapData = readonly number[]
