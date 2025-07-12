import type { LINE_TYPE, LINE_KIND, LINE_DIR, NEW_TYPE } from './constants'

/**
 * Type for LINE_TYPE values
 */
export type LineType = (typeof LINE_TYPE)[keyof typeof LINE_TYPE]

/**
 * Type for LINE_KIND values
 */
export type LineKind = (typeof LINE_KIND)[keyof typeof LINE_KIND]

/**
 * Type for LINE_DIR values
 */
export type LineDir = (typeof LINE_DIR)[keyof typeof LINE_DIR]

/**
 * Type for NEW_TYPE values
 */
export type NewType = (typeof NEW_TYPE)[keyof typeof NEW_TYPE]

/**
 * Line/wall record
 *
 * See GW.h:196-208
 */
export type LineRec = {
  /** Unique identifier for this line */
  id: string
  /** x coordinate of left endpoint */
  startx: number
  /** y coordinate of left endpoint */
  starty: number
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
  /** start h-val of xor */
  h1: number
  /** end h-val of xor */
  h2: number
  /** new type including up-down */
  newtype: NewType
  /** length of the line (calculated via Pythagorean theorem) */
  length: number
  /** ID of next line of this kind */
  nextId: string | null
  /** ID of next line with white-only drawing */
  nextwhId: string | null
}

/**
 * White shadow piece record
 *
 * See Junctions.c
 */
export type WhiteRec = {
  /** Unique identifier for this white piece */
  id: string
  /** x position */
  x: number
  /** y position */
  y: number
  /** has junction flag */
  hasj: boolean
  /** height */
  ht: number
  /** white piece bit pattern data */
  data: number[]
}

/**
 * Junction record - where walls meet
 *
 * See Junctions.c
 */
export type JunctionRec = {
  /** x position */
  x: number
  /** y position */
  y: number
}

/**
 * Wall system state
 *
 * Uses ID-based lookups instead of arrays to simulate the original's
 * linked list structure efficiently in JavaScript
 */
export type WallsState = {
  /** Map of line ID to line record for O(1) lookup */
  organizedWalls: Record<string, LineRec>
  /** Map of wall kind to first line ID of that kind */
  kindPointers: Record<LineKind, string | null>
  /** ID of first white-only drawing line */
  firstWhite: string
  /** Array of wall junctions (no IDs needed) */
  junctions: JunctionRec[]
  /** Map of white ID to white record for O(1) lookup */
  whites: WhiteRec[]
  /** Walls with updated h1/h2 optimization values */
  updatedWalls: LineRec[]
}

// Re-export MonochromeBitmap from bitmap module
export type { MonochromeBitmap } from '../bitmap/types'

/**
 * Line data for directional drawing functions
 */
export type LineData = {
  startx: number
  starty: number
  endx: number
  endy: number
}
