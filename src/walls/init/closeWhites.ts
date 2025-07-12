import type { LineRec, WhiteRec } from '../types'
import { oneClose } from './oneClose'
import { simpleh1, simpleh2 } from './closeConstants'
import { WALLS } from '../constants'

/**
 * Main orchestrator for finding close walls and calculating junction patches.
 * Sets initial h1/h2 optimization values and processes all wall pairs.
 *
 * @see Junctions.c:286-322 - close_whites()
 */
export function closeWhites(walls: LineRec[]): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
} {
  // Step 1: Set initial h1/h2 optimization values
  const wallsWithInitialOpt = setInitialOptimization(walls)

  // Step 2: Find pairs of walls that are close to each other
  const wallPairs = findCloseWallPairs(wallsWithInitialOpt)

  // Step 3: Process each close wall pair to generate patches
  const { patches, wallUpdates } = processCloseWalls(wallPairs, oneClose)

  // Step 4: Apply any additional h1/h2 updates from close processing
  const updatedWalls = updateWallOptimization(wallsWithInitialOpt, wallUpdates)

  return {
    whites: patches,
    updatedWalls
  }
}

/**
 * Finds pairs of walls that come within 3 pixels of each other.
 * Uses optimization to skip walls that are too far apart in x-coordinate.
 *
 * @see Junctions.c:302-321 - Wall pair detection loops
 */
export function findCloseWallPairs(
  walls: LineRec[]
): Array<[LineRec, LineRec, number, number]> {
  const pairs: Array<[LineRec, LineRec, number, number]> = []
  const THRESHOLD = WALLS.JUNCTION_THRESHOLD

  // The C code processes walls in their original order, not sorted
  // It uses a sliding "first" pointer that advances based on endx
  let firstIdx = 0

  for (let lineIdx = 0; lineIdx < walls.length; lineIdx++) {
    const line = walls[lineIdx]
    if (!line) continue

    // Move firstIdx forward while walls are too far left
    // C: while (first->endx < line->startx - 3)
    while (firstIdx < walls.length) {
      const first = walls[firstIdx]
      if (!first || first.endx >= line.startx - THRESHOLD) {
        break
      }
      firstIdx++
    }

    // Check both endpoints of line
    for (let i = 0; i < 2; i++) {
      const x1 = i ? line.endx : line.startx
      const y1 = i ? line.endy : line.starty

      // Check against all walls starting from firstIdx
      // C: for (line2=first; line2->startx < x1 + 3; line2++)
      for (let line2Idx = firstIdx; line2Idx < walls.length; line2Idx++) {
        const line2 = walls[line2Idx]
        if (!line2 || line2.startx >= x1 + THRESHOLD) {
          break
        }

        // Check both endpoints of line2
        for (let j = 0; j < 2; j++) {
          // C code: x2 = (j ? line2->endx : line2->startx) - 3
          const x2 = (j ? line2.endx : line2.startx) - THRESHOLD
          const y2 = (j ? line2.endy : line2.starty) - THRESHOLD

          // C code: if (x1 > x2 && y1 > y2 && x1 < x2 + 6 && y1 < y2 + 6)
          if (
            x1 > x2 &&
            y1 > y2 &&
            x1 < x2 + 6 &&
            y1 < y2 + 6
          ) {
            pairs.push([line, line2, i, j])
          }
        }
      }
    }
  }

  return pairs
}

/**
 * Processes each close wall pair to generate junction patches.
 * Calls the provided oneClose function for each pair and collects the results.
 *
 * @see Junctions.c:318 - one_close() calls
 * @param wallPairs Array of wall pairs that are close to each other
 * @param oneCloseFn Function to calculate patches for a single wall pair
 */
export function processCloseWalls(
  wallPairs: Array<[LineRec, LineRec, number, number]>,
  oneCloseFn: (
    wall1: LineRec,
    wall2: LineRec,
    endpoint1: number,
    endpoint2: number
  ) => {
    patches: WhiteRec[]
    wall1Updates: { h1?: number; h2?: number }
    wall2Updates: { h1?: number; h2?: number }
  }
): {
  patches: WhiteRec[]
  wallUpdates: Array<{ wallId: string; h1?: number; h2?: number }>
} {
  const patches: WhiteRec[] = []
  const wallUpdates: Array<{ wallId: string; h1?: number; h2?: number }> = []

  for (const [wall1, wall2, endpoint1, endpoint2] of wallPairs) {
    const result = oneCloseFn(wall1, wall2, endpoint1, endpoint2)

    // Collect patches
    patches.push(...result.patches)

    // Collect wall updates
    if (Object.keys(result.wall1Updates).length > 0) {
      wallUpdates.push({
        wallId: wall1.id,
        ...result.wall1Updates
      })
    }

    if (Object.keys(result.wall2Updates).length > 0) {
      wallUpdates.push({
        wallId: wall2.id,
        ...result.wall2Updates
      })
    }
  }

  return { patches, wallUpdates }
}

/**
 * Sets initial h1/h2 optimization values on walls based on their type.
 * These values indicate safe regions for combined white+black drawing.
 *
 * @see Junctions.c:297-300 - Initial h1/h2 assignment in close_whites()
 */
export function setInitialOptimization(walls: LineRec[]): LineRec[] {
  return walls.map(wall => {
    // Calculate the actual length of the wall using Pythagorean theorem
    const dx = wall.endx - wall.startx
    const dy = wall.endy - wall.starty
    const length = Math.sqrt(dx * dx + dy * dy)
    
    return {
      ...wall,
      h1: simpleh1[wall.newtype] ?? 0,
      h2: length + (simpleh2[wall.newtype] ?? 0) // length + adjustment
    }
  })
}

/**
 * Applies h1/h2 optimization updates to walls.
 * Only applies the specific updates passed, does not set initial values.
 *
 * @see Junctions.c:297-300 - h1/h2 updates from one_close()
 */
export function updateWallOptimization(
  walls: LineRec[],
  updates: Array<{ wallId: string; h1?: number; h2?: number }>
): LineRec[] {
  // Create a map for efficient lookups
  const wallMap = new Map(walls.map(w => [w.id, { ...w }]))

  // Apply only the specific updates
  for (const update of updates) {
    const wall = wallMap.get(update.wallId)
    if (wall) {
      if (update.h1 !== undefined) wall.h1 = update.h1
      if (update.h2 !== undefined) wall.h2 = update.h2
    }
  }

  return Array.from(wallMap.values())
}
