// Re-export line constants from shared module
export { LINE_TYPE, LINE_KIND, NEW_TYPE, LINE_DIR } from '../shared/types/line'

// Wall-specific extension to LINE_KIND (not in shared module)
import { LINE_KIND as SHARED_LINE_KIND } from '../shared/types/line'
export const LINE_KIND_EXT = {
  ...SHARED_LINE_KIND,
  NUMKINDS: 4
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
