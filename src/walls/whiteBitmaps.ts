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
 * Index 0 is top/left piece, index 1 is bottom/right piece
 * null entries mean no white piece for that position
 */
export const WHITE_PICTS = {
  [NEW_TYPE.S]: { top: null, bottom: null },
  [NEW_TYPE.SSE]: { top: GENERIC_TOP, bottom: S_BOT },
  [NEW_TYPE.SE]: { top: SSE_TOP, bottom: SSE_BOT },
  [NEW_TYPE.ESE]: { top: SE_TOP, bottom: SE_BOT },
  [NEW_TYPE.E]: { top: null, bottom: ESE_RIGHT },
  [NEW_TYPE.ENE]: { top: E_LEFT, bottom: GENERIC_TOP },
  [NEW_TYPE.NE]: { top: ENE_LEFT, bottom: GENERIC_TOP },
  [NEW_TYPE.NNE]: { top: NNE_BOT, bottom: GENERIC_TOP }
} as const

// Type for white bitmap data
export type WhiteBitmapData = readonly number[]
