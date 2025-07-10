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

  // Sort walls by startx for optimization
  const sortedWalls = [...walls].sort((a, b) => a.startx - b.startx)

  // Use a sliding window approach like the original
  let firstIdx = 0

  for (let i = 0; i < sortedWalls.length; i++) {
    const wall1 = sortedWalls[i]
    if (!wall1) continue

    // Move firstIdx forward while walls are too far left
    while (firstIdx < sortedWalls.length) {
      const firstWall = sortedWalls[firstIdx]
      if (!firstWall || firstWall.endx >= wall1.startx - THRESHOLD) {
        break
      }
      firstIdx++
    }

    // Check both endpoints of wall1
    for (let endpoint1 = 0; endpoint1 < 2; endpoint1++) {
      const x1 = endpoint1 ? wall1.endx : wall1.startx
      const y1 = endpoint1 ? wall1.endy : wall1.starty

      // Check against all walls in range
      for (let j = firstIdx; j < sortedWalls.length; j++) {
        const wallToCheck = sortedWalls[j]
        if (!wallToCheck || wallToCheck.startx >= x1 + THRESHOLD) {
          break
        }

        // The C code naturally avoids some duplicates by only checking walls
        // later in the array. To avoid duplicates, only process pairs where
        // wall2 comes after wall1 in the original ordering, or if they're the
        // same wall but endpoint2 > endpoint1
        if (i > j) continue // Skip if wall2 comes before wall1

        const wall2 = sortedWalls[j]
        if (!wall2) continue

        // Check both endpoints of wall2
        for (let endpoint2 = 0; endpoint2 < 2; endpoint2++) {
          // Skip if same wall and endpoint2 <= endpoint1
          if (i === j && endpoint2 <= endpoint1) continue

          const x2 = endpoint2 ? wall2.endx : wall2.startx
          const y2 = endpoint2 ? wall2.endy : wall2.starty

          // C code offsets by -3 then checks 6x6 box
          if (
            x1 > x2 - THRESHOLD &&
            y1 > y2 - THRESHOLD &&
            x1 < x2 + THRESHOLD &&
            y1 < y2 + THRESHOLD
          ) {
            pairs.push([wall1, wall2, endpoint1, endpoint2])
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
  return walls.map(wall => ({
    ...wall,
    h1: simpleh1[wall.newtype] ?? 0,
    h2: wall.endx - wall.startx + (simpleh2[wall.newtype] ?? 0) // length + adjustment
  }))
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
