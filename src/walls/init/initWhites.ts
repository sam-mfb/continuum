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
  junctions: JunctionRec[]
): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
} {
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
  const merged: WhiteRec[] = []
  let i = 0

  while (i < whites.length) {
    const current = whites[i]
    if (!current) {
      i++
      continue
    }

    // Check if we can merge with next white
    if (i + 1 < whites.length) {
      const next = whites[i + 1]

      if (
        next &&
        current.x === next.x &&
        current.y === next.y &&
        current.ht === 6 &&
        next.ht === 6 &&
        current.data &&
        next.data
      ) {
        // Merge the two whites by ANDing their data
        const mergedData: number[] = []
        for (let j = 0; j < 6; j++) {
          mergedData[j] = (current.data[j] ?? 0) & (next.data[j] ?? 0)
        }

        merged.push({
          id: current.id, // Keep first id
          x: current.x,
          y: current.y,
          hasj: current.hasj || next.hasj,
          ht: 6,
          data: mergedData
        })

        i += 2 // Skip both whites
        continue
      }
    }

    // No merge, just add current
    merged.push(current)
    i++
  }

  return merged
}
