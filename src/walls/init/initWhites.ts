import type { LineRec, JunctionRec, WhiteRec } from '../types'
import { normWhites } from './normWhites'
import { closeWhites } from './closeWhites'
import { whiteHashMerge } from './whiteHashMerge'

/**
 * Main orchestrator for white shadow piece generation.
 * Calls sub-functions to generate, sort, merge, and add hash patterns to whites.
 *
 * @see Junctions.c:199-242 - init_whites()
 */
export function initWhites(
  walls: LineRec[],
  junctions: JunctionRec[],
  firstWhiteId: string
): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
} {
  // TODO: Use firstWhiteId when implementing the full white initialization logic
  // For now, suppress the unused variable warning
  void firstWhiteId
  
  // Step 1: Generate normal white pieces
  let whites = normWhites(walls)

  // Step 2: Find close walls and generate patches
  const { whites: patches, updatedWalls } = closeWhites(walls)
  whites = [...whites, ...patches]

  // Step 3: Sort whites by x-coordinate
  whites = sortWhitesByX(whites)

  // Step 4: Merge overlapping whites
  whites = mergeOverlappingWhites(whites)

  // Step 5: Add hash patterns at junctions
  whites = whiteHashMerge(whites, junctions)

  return {
    whites,
    updatedWalls
  }
}

/**
 * Sorts white pieces by x-coordinate, then by y-coordinate for equal x values.
 * Uses insertion sort algorithm from original code.
 *
 * @see Junctions.c:212-222 - Insertion sort of whites
 */
export function sortWhitesByX(whites: WhiteRec[]): WhiteRec[] {
  // Insertion sort like the original
  const sorted = [...whites]

  for (let i = 1; i < sorted.length; i++) {
    const temp = sorted[i]
    if (!temp) continue
    let j = i - 1

    // Move elements that are greater than temp
    while (j >= 0) {
      const element = sorted[j]
      if (!element) break
      if (element.x < temp.x || (element.x === temp.x && element.y <= temp.y)) {
        break
      }
      sorted[j + 1] = element
      j--
    }

    sorted[j + 1] = temp
  }

  return sorted
}

/**
 * Merges overlapping white pieces that are at the same position.
 * Combines their bit patterns using AND operation.
 *
 * @see Junctions.c:227-240 - Merge whites together
 */
export function mergeOverlappingWhites(whites: WhiteRec[]): WhiteRec[] {
  // Create a deep copy of the array so we can modify in-place
  const result = whites.map(w => ({ ...w, data: [...(w.data ?? [])] }))
  let i = 0

  while (i < result.length - 1) {
    const current = result[i]
    const next = result[i + 1]

    if (
      current &&
      next &&
      current.x === next.x &&
      current.y === next.y &&
      current.ht === 6 &&
      next.ht === 6
    ) {
      // Merge data by AND-ing
      for (let j = 0; j < 6; j++) {
        current.data[j] = (current.data[j] ?? 0) & (next.data[j] ?? 0)
      }

      // Remove the merged element (like C code shifting array left)
      result.splice(i + 1, 1)

      // Don't increment i to check for multiple consecutive merges
      // This allows merging 3+ whites at the same position
    } else {
      i++
    }
  }

  return result
}
