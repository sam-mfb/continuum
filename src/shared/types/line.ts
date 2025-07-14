/**
 * Shared line types based on the original C structures in GW.h
 *
 * Original source: orig/Sources/GW.h:196-222
 */

/**
 * Line type constants - direction of line
 * See GW.h:211
 */
export const LINE_TYPE = {
  N: 1, // North
  NNE: 2, // North-Northeast
  NE: 3, // Northeast
  ENE: 4, // East-Northeast
  E: 5 // East
} as const

export type LineType = (typeof LINE_TYPE)[keyof typeof LINE_TYPE]

/**
 * Line direction constants
 * See GW.h:214-215
 */
export const LINE_DIR = {
  UP: -1, // L_UP
  DN: 1 // L_DN
} as const

export type LineDir = (typeof LINE_DIR)[keyof typeof LINE_DIR]

/**
 * Line kind constants
 * See GW.h:218
 */
export const LINE_KIND = {
  NORMAL: 0, // L_NORMAL
  BOUNCE: 1, // L_BOUNCE
  GHOST: 2, // L_GHOST
  EXPLODE: 3 // L_EXPLODE
} as const

export type LineKind = (typeof LINE_KIND)[keyof typeof LINE_KIND]

/**
 * New type constants - combination of type and up_down
 * See GW.h:221
 */
export const NEW_TYPE = {
  S: 1, // NEW_S - South
  SSE: 2, // NEW_SSE - South-Southeast
  SE: 3, // NEW_SE - Southeast
  ESE: 4, // NEW_ESE - East-Southeast
  E: 5, // NEW_E - East
  ENE: 6, // NEW_ENE - East-Northeast
  NE: 7, // NEW_NE - Northeast
  NNE: 8 // NEW_NNE - North-Northeast
  // Note: No NEW_N (9) in the original
} as const

export type NewType = (typeof NEW_TYPE)[keyof typeof NEW_TYPE]

/**
 * Line/wall record
 * Based on linerec struct in GW.h:196-208
 *
 * The id field replaces C's pointer-based memory addressing
 * for linked list implementation in JavaScript
 */
export type LineRec = {
  /**
   * Unique identifier for this line (replaces C pointers)
   * When loading from planet files, IDs are generated as "line-0", "line-1", etc.
   * in the order they appear in the file
   */
  id: string
  /** x coordinate of left endpoint */
  startx: number
  /** y coordinate of left endpoint */
  starty: number
  /** the length (longest of x,y) */
  length: number
  /** x coordinate of right endpoint */
  endx: number
  /** y coordinate of right endpoint */
  endy: number
  /** 1 if down, -1 if up */
  up_down: LineDir
  /** direction of line (LINE_N through LINE_E) */
  type: LineType
  /** normal, bounce, phantom, etc */
  kind: LineKind
  /** start h-val of xor (optional - used for optimization) */
  h1?: number
  /** end h-val of xor (optional - used for optimization) */
  h2?: number
  /** new type including up-down */
  newtype: NewType
  /** ID of next line of this kind (replaces *next pointer) */
  nextId: string | null
  /** ID of next line with white-only drawing (replaces *nextwh pointer) */
  nextwhId: string | null
}

/**
 * Type guard to check if a line has XOR optimization values
 */
export function hasXorOptimization(
  line: LineRec
): line is LineRec & { h1: number; h2: number } {
  return line.h1 !== undefined && line.h2 !== undefined
}

/**
 * Helper to generate line IDs for planet loading.
 * Creates sequential IDs in the format "line-0", "line-1", etc.
 * @param index - The zero-based index of the line in the planet file
 */
export function generateLineId(index: number): string {
  return `line-${index}`
}
