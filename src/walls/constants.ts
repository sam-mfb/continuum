/**
 * Wall direction types
 * See GW.h:211
 */
export const LINE_TYPE = {
  N: 1,
  NNE: 2,
  NE: 3,
  ENE: 4,
  E: 5
} as const

/**
 * Wall kinds
 * See GW.h:218
 */
export const LINE_KIND = {
  NORMAL: 0,
  BOUNCE: 1,
  GHOST: 2,
  EXPLODE: 3,
  NUMKINDS: 4
} as const

/**
 * Combined wall type (direction + up/down)
 * See GW.h:221
 */
export const NEW_TYPE = {
  S: 1,
  SSE: 2,
  SE: 3,
  ESE: 4,
  E: 5,
  ENE: 6,
  NE: 7,
  NNE: 8
} as const

/**
 * Up/down direction constants
 * See GW.h:214-215
 */
export const LINE_DIR = {
  UP: -1,
  DN: 1
} as const

/**
 * Wall system constants
 * See GW.h:57
 */
export const WALLS = {
  /** Maximum number of terrain lines */
  MAXLINES: 125,
  /** Estimated max white pieces (not in original, based on usage) */
  MAXWHITES: 500,
  /** Estimated max junctions (not in original, based on usage) */
  MAXJUNCTIONS: 250,
  /** Junction detection threshold in pixels */
  JUNCTION_THRESHOLD: 3,
  /** Size of crosshatch pattern at junctions */
  HASH_SIZE: 6
} as const
