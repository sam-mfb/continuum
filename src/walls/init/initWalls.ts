import type { LineRec, JunctionRec, LineKind, WallsState } from '../types'
import { initWhites } from './initWhites'
import { LINE_KIND, NEW_TYPE } from '../constants'

/**
 * Main initialization entry point for the wall system.
 * Orchestrates the entire wall initialization process.
 *
 * @see Junctions.c:34-96 - init_walls()
 */
export function initWalls(walls: LineRec[]): WallsState {
  // Step 1: Organize walls by kind
  const { organizedWalls, kindPointers } = organizeWallsByKind(walls)

  // Step 2: Find first white walls (NNE walls)
  const { firstWhiteId, updatedWalls: wallsWithWhiteLinks } = findFirstWhiteWalls(walls)

  // Step 3: Detect wall junctions - use walls array since we only need endpoint info
  const junctions = detectWallJunctions(walls)

  // Step 4: Initialize whites - pass the walls with white links
  const { whites, updatedWalls } = initWhites(
    Object.values(wallsWithWhiteLinks),
    junctions,
    firstWhiteId
  )

  // Merge the organized walls with the white links to maintain consistency
  const finalOrganizedWalls: Record<string, LineRec> = {}
  for (const [id, wall] of Object.entries(organizedWalls)) {
    const wallWithLinks = wallsWithWhiteLinks[id]
    if (wallWithLinks) {
      finalOrganizedWalls[id] = {
        ...wall,
        nextwhId: wallWithLinks.nextwhId
      }
    } else {
      finalOrganizedWalls[id] = wall
    }
  }

  return {
    organizedWalls: finalOrganizedWalls,
    kindPointers,
    firstWhite: firstWhiteId,
    junctions,
    whites,
    updatedWalls
  }
}

/**
 * Organizes walls into linked lists by their kind (normal, bouncing, phantom).
 * Creates kindptrs array that points to the first wall of each kind.
 *
 * @see Junctions.c:43-53 - Loop that builds linked lists by kind
 */
export function organizeWallsByKind(walls: LineRec[]): {
  organizedWalls: Record<string, LineRec>
  kindPointers: Record<LineKind, string | null>
} {
  const organizedWalls: Record<string, LineRec> = {}
  const kindPointers: Partial<Record<LineKind, string | null>> = {}

  // Initialize all kind pointers to null (matching C code)
  for (let kind = LINE_KIND.NORMAL; kind < LINE_KIND.NUMKINDS; kind++) {
    kindPointers[kind] = null
  }

  // Copy walls to organized structure
  for (const wall of walls) {
    organizedWalls[wall.id] = { ...wall }
  }

  // Build linked lists by kind
  for (let kind = LINE_KIND.NORMAL; kind < LINE_KIND.NUMKINDS; kind++) {
    let lastId: string | null = null

    for (const wall of walls) {
      if (wall.kind === kind) {
        if (!kindPointers[kind]) {
          kindPointers[kind] = wall.id
        }
        if (lastId) {
          const lastWall = organizedWalls[lastId]
          if (lastWall) {
            lastWall.nextId = wall.id
          }
        }
        lastId = wall.id
      }
    }

    // Terminate the linked list
    if (lastId) {
      const lastWall = organizedWalls[lastId]
      if (lastWall) {
        lastWall.nextId = null
      }
    }
  }

  return {
    organizedWalls,
    kindPointers: kindPointers as Record<LineKind, string | null>
  }
}

/**
 * Finds all NNE walls and creates a linked list for special white-only drawing.
 *
 * @see Junctions.c:54-61 - Loop that builds firstwhite list
 */
export function findFirstWhiteWalls(walls: LineRec[]): {
  firstWhiteId: string
  updatedWalls: Record<string, LineRec>
} {
  let firstWhiteId = ''
  let lastWhiteId: string | null = null
  
  // Create a copy of walls as a record for immutability
  const updatedWalls: Record<string, LineRec> = {}
  for (const wall of walls) {
    updatedWalls[wall.id] = { ...wall }
  }

  // Find all NNE walls and link them
  for (const wall of walls) {
    if (wall.newtype === NEW_TYPE.NNE) {
      if (!firstWhiteId) {
        firstWhiteId = wall.id
      }
      if (lastWhiteId) {
        // Update the nextwhId in our copy
        const lastWall = updatedWalls[lastWhiteId]
        if (lastWall) {
          lastWall.nextwhId = wall.id
        }
      }
      lastWhiteId = wall.id
    }
  }

  // Terminate the linked list
  if (lastWhiteId) {
    const lastWall = updatedWalls[lastWhiteId]
    if (lastWall) {
      lastWall.nextwhId = null
    }
  }

  return {
    firstWhiteId,
    updatedWalls
  }
}

/**
 * Detects all wall junctions (unique wall endpoints).
 * Creates a junction for each wall endpoint, but merges endpoints
 * within 3 pixels of each other to avoid duplicates.
 * Sorts junctions by x-coordinate for efficient rendering.
 *
 * @see Junctions.c:63-93 - Junction detection and sorting
 */
export function detectWallJunctions(walls: LineRec[]): JunctionRec[] {
  const junctions: JunctionRec[] = []

  // Check each wall endpoint
  for (const wall of walls) {
    for (let i = 0; i < 2; i++) {
      const x = i ? wall.endx : wall.startx
      const y = i ? wall.endy : wall.starty

      // Check if this point is already in junctions (within threshold)
      // Exact C logic: j->x <= x+3 && j->x >= x-3 && j->y <= y+3 && j->y >= y-3
      let found = false
      for (const junction of junctions) {
        if (
          junction.x <= x + 3 &&
          junction.x >= x - 3 &&
          junction.y <= y + 3 &&
          junction.y >= y - 3
        ) {
          found = true
          break
        }
      }

      // Add new junction if not found
      if (!found) {
        junctions.push({ x, y })
      }
    }
  }

  // Sort junctions by x coordinate (insertion sort like original)
  for (let i = 1; i < junctions.length; i++) {
    const temp = junctions[i]
    if (!temp) continue
    let j = i - 1

    while (j >= 0) {
      const junction = junctions[j]
      if (!junction || junction.x <= temp.x) {
        break
      }
      junctions[j + 1] = junction
      j--
    }

    junctions[j + 1] = temp
  }

  return junctions
}
