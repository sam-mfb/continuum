import type { LineKind, LineRec, LineType, LineDir } from '../shared/types/line'
import { LINE_TYPE, LINE_DIR, LINE_KIND, NEW_TYPE } from '../shared/types/line'

// Constants from the original code
const ROUNDRADIUS = 20 // From the original rounding logic (QuickEdit.c:917)
const SAFE_LINE_MIN_LENGTH = 26 // Minimum line length in safe mode (QuickEdit.c:809-810)

// From QuickEdit.c:756-759 - typetable[]
// Maps angle16 (0-15) to line types
const ANGLE_TO_TYPE: LineType[] = [
  LINE_TYPE.N, // 0 - North
  LINE_TYPE.NNE, // 1
  LINE_TYPE.NE, // 2
  LINE_TYPE.ENE, // 3
  LINE_TYPE.E, // 4 - East
  LINE_TYPE.ENE, // 5
  LINE_TYPE.NE, // 6
  LINE_TYPE.NNE, // 7
  LINE_TYPE.N, // 8 - North (wraps)
  LINE_TYPE.NNE, // 9
  LINE_TYPE.NE, // 10
  LINE_TYPE.ENE, // 11
  LINE_TYPE.E, // 12 - East (wraps)
  LINE_TYPE.ENE, // 13
  LINE_TYPE.NE, // 14
  LINE_TYPE.NNE // 15
]

// From QuickEdit.c:755 - rot2lens[]
// Maps angle16 to x/y multipliers for endpoint calculation
const ROT_TO_X_MULT = [0, 1, 2, 2, 2, 2, 2, 1, 0, -1, -2, -2, -2, -2, -2, -1, 0]
// Y multipliers derived from rot2lens[(angle16+12)&15] pattern (QuickEdit.c:814)
const ROT_TO_Y_MULT = [2, 2, 2, 1, 0, -1, -2, -2, -2, -2, -2, -1, 0, 1, 2, 2, 2]

type CreateLineOptions = {
  kind?: LineKind
  safeMode?: boolean // Enforce minimum length
  worldWidth?: number
  worldHeight?: number
}

/**
 * Creates a line from two points using the original Continuum constraints.
 * The line will be snapped to one of 8 directions and follow all original rules.
 * Based on linestuff() function from QuickEdit.c:761-856
 *
 * @param x1 Starting X coordinate
 * @param y1 Starting Y coordinate
 * @param x2 Ending X coordinate
 * @param y2 Ending Y coordinate
 * @param options Optional configuration
 * @returns A properly constrained LineRec or null if invalid
 */
export function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: CreateLineOptions = {}
): LineRec | null {
  const {
    kind = LINE_KIND.NORMAL,
    safeMode = false,
    worldWidth = Infinity,
    worldHeight = Infinity
  } = options

  // Calculate angle from start to end point
  const dx = x2 - x1
  const dy = y2 - y1

  // Convert to angle (0-360 degrees)
  let angle = (Math.atan2(-dy, dx) * 180) / Math.PI
  if (angle < 0) angle += 360

  // Snap to 16 directions then map to 8 line types
  // QuickEdit.c:803 - angle16 = (angle*2 + 22) / 45 & 15;
  const angle16 = Math.floor((angle * 2 + 22) / 45) & 15

  // Calculate length using Manhattan distance
  // QuickEdit.c:804-808
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  let length = Math.max(absDx, absDy)

  // Apply safe mode minimum length
  // QuickEdit.c:809-810 - if (safe_lines && length < 26) length = 26;
  if (safeMode && length < SAFE_LINE_MIN_LENGTH) {
    length = SAFE_LINE_MIN_LENGTH
  }

  // Force odd length for diagonal lines (NNE and ENE)
  // QuickEdit.c:811-812 - if (angle16 & 1) length |= 1;
  if (angle16 & 1) {
    length |= 1 // Make odd
  }

  // Calculate constrained endpoint using rotation multipliers
  // QuickEdit.c:813-814
  // endpt.h = startpt.h + length * rot2lens[angle16] / 2;
  // endpt.v = startpt.v + length * rot2lens[(angle16+12)&15] / 2;
  const endX = x1 + (length * ROT_TO_X_MULT[angle16]!) / 2
  const endY = y1 + (length * ROT_TO_Y_MULT[angle16]!) / 2

  // Check bounds
  // QuickEdit.c:815-816 - endinbounds check
  if (endX < 0 || endX >= worldWidth || endY < 0 || endY >= worldHeight) {
    return null // Out of bounds
  }

  // Determine line orientation (up/down)
  // QuickEdit.c:844-847
  // if (angle16 == 0 || (angle16 > 3 && angle16 < 9) || angle16 > 11)
  //   lp->up_down = L_DN;
  // else
  //   lp->up_down = L_UP;
  let upDown: LineDir
  if (angle16 === 0 || (angle16 > 3 && angle16 < 9) || angle16 > 11) {
    upDown = LINE_DIR.DN
  } else {
    upDown = LINE_DIR.UP
  }

  // Create line with proper orientation
  // QuickEdit.c:829-842 - Lines are stored left-to-right
  // if (angle16 > 0 && angle16 < 9) stores start->end
  // else stores end->start
  let lineRec: LineRec

  if (angle16 > 0 && angle16 < 9) {
    // Right-pointing line: store as-is
    lineRec = {
      id: '', // Will be assigned by caller
      startx: x1,
      starty: y1,
      endx: Math.floor(endX),
      endy: Math.floor(endY),
      length,
      type: ANGLE_TO_TYPE[angle16]!, // QuickEdit.c:848 - lp->type = typetable[angle16];
      kind, // QuickEdit.c:849 - lp->kind = linekind;
      up_down: upDown,
      h1: 0, // These are set during init_walls()
      h2: 0,
      newtype: NEW_TYPE.S, // Placeholder - will be computed during initWalls
      nextId: null,
      nextwhId: null
    }
  } else {
    // Left-pointing line: swap start and end
    lineRec = {
      id: '',
      startx: Math.floor(endX),
      starty: Math.floor(endY),
      endx: x1,
      endy: y1,
      length, // QuickEdit.c:843 - lp->length = length;
      type: ANGLE_TO_TYPE[angle16]!,
      kind,
      up_down: upDown,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S, // Placeholder - will be computed during initWalls
      nextId: null,
      nextwhId: null
    }
  }

  return lineRec
}

/**
 * Rounds a point to the nearest line endpoint within ROUNDRADIUS.
 * This is used in the editor for snapping to existing line endpoints.
 * Based on roundpoint() from QuickEdit.c:911-937
 *
 * @param x X coordinate to round
 * @param y Y coordinate to round
 * @param lines Existing lines to snap to
 * @returns Rounded coordinates or original if no snap point found
 */
export function roundPoint(
  x: number,
  y: number,
  lines: LineRec[]
): { x: number; y: number } {
  // QuickEdit.c:917 - dist = ROUNDRADIUS;
  let bestDist = ROUNDRADIUS * ROUNDRADIUS
  let bestX = x
  let bestY = y

  // QuickEdit.c:920-936 - Check all line endpoints
  for (const line of lines) {
    // Check both endpoints
    // QuickEdit.c:921 - for (i = 0; i<2; i++)
    const endpoints = [
      { x: line.startx, y: line.starty },
      { x: line.endx, y: line.endy }
    ]

    for (const endpoint of endpoints) {
      const dx = Math.abs(x - endpoint.x)
      const dy = Math.abs(y - endpoint.y)

      // QuickEdit.c:929 - if (dx < ROUNDRADIUS/4 && dy < ROUNDRADIUS/4
      if (dx < ROUNDRADIUS / 4 && dy < ROUNDRADIUS / 4) {
        // QuickEdit.c:930 - (d = dx*dx + dy*dy) < dist)
        const distSq = dx * dx + dy * dy
        if (distSq < bestDist) {
          // QuickEdit.c:932-934 - Update best point
          bestX = endpoint.x
          bestY = endpoint.y
          bestDist = distSq
        }
      }
    }
  }

  return { x: bestX, y: bestY }
}
