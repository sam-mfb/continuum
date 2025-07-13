// Import and re-export line types from shared module
import type {
  LineRec,
  LineType,
  LineKind,
  LineDir,
  NewType
} from '../shared/types/line'

export type {
  LineRec,
  LineType,
  LineKind,
  LineDir,
  NewType
}

export {
  LINE_TYPE,
  LINE_KIND,
  LINE_DIR,
  NEW_TYPE,
  hasXorOptimization,
  generateLineId
} from '../shared/types/line'

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
