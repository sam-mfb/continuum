import type { LineRec, WhiteRec } from '../types'
import { WALLS } from '../constants'
import {
  nepatch,
  enepatch,
  epatch,
  sepatch,
  ssepatch,
  npatch
} from './patchPatterns'

/**
 * Calculates junction patches for a pair of close walls.
 * Contains the giant switch statement (64 possible combinations) that handles
 * each type of wall junction differently.
 *
 * @see Junctions.c:334-565 - one_close()
 * @param wall1 First wall in the close pair
 * @param wall2 Second wall in the close pair
 * @returns Patches to fill gaps and h1/h2 updates for optimization
 */
export function oneClose(
  wall1: LineRec,
  wall2: LineRec
): {
  patches: WhiteRec[]
  wall1Updates: { h1?: number; h2?: number }
  wall2Updates: { h1?: number; h2?: number }
} {
  const patches: WhiteRec[] = []
  const wall1Updates: { h1?: number; h2?: number } = {}
  const wall2Updates: { h1?: number; h2?: number } = {}
  let whiteIdCounter = 1000 // Start at 1000 to avoid conflicts

  // Determine which endpoints are close
  const THRESHOLD = WALLS.JUNCTION_THRESHOLD
  let closeEndpoints: Array<[number, number]> = [] // [wall1 endpoint, wall2 endpoint]

  for (let i = 0; i < 2; i++) {
    const x1 = i ? wall1.endx : wall1.startx
    const y1 = i ? wall1.endy : wall1.starty

    for (let j = 0; j < 2; j++) {
      const x2 = j ? wall2.endx : wall2.startx
      const y2 = j ? wall2.endy : wall2.starty

      // Check if within threshold (with -3 offset like original)
      if (
        x1 > x2 - THRESHOLD &&
        y1 > y2 - THRESHOLD &&
        x1 < x2 + THRESHOLD &&
        y1 < y2 + THRESHOLD
      ) {
        closeEndpoints.push([i, j])
      }
    }
  }

  // Process each close endpoint pair
  for (const [n, m] of closeEndpoints) {
    // Calculate directions based on newtype and endpoint
    let dir1 = 9 - wall1.newtype
    if (n) dir1 = (dir1 + 8) & 15

    let dir2 = 9 - wall2.newtype
    if (m) dir2 = (dir2 + 8) & 15

    // Skip if same direction
    if (dir1 === dir2) continue

    // Helper function to add a white piece
    const addWhite = (
      x: number,
      y: number,
      ht: number,
      data: number[]
    ): void => {
      patches.push({
        id: `p${whiteIdCounter++}`,
        x,
        y,
        hasj: false,
        ht,
        data: [...data]
      })
    }

    // Giant switch statement
    let i: number, j: number
    const length1 = wall1.endx - wall1.startx

    switch (dir1) {
      case 0:
        switch (dir2) {
          case 15:
          case 1:
            i = 21
            break
          case 2:
            i = 10
            break
          case 3:
          case 14:
            i = 6
            break
          default:
            continue
        }
        j = wall1.h2
        if (length1 - i > j) continue

        // Add or replace white
        addWhite(wall1.endx, wall1.endy - i, i, npatch)
        wall1Updates.h2 = length1 - i
        break

      case 1:
        break

      case 2:
        switch (dir2) {
          case 0:
            i = 3
            break
          case 1:
            i = 6
            break
          case 3:
            i = 4
            break
          case 14:
            i = 1
            break
          case 15:
            i = 2
            break
          default:
            continue
        }
        for (j = 0; j < 4 * i; j += 4) {
          if (wall1.h1 < 5 + j) {
            addWhite(wall1.startx + 3 + j, wall1.starty - 4 - j, 4, nepatch)
          }
        }
        i--
        j = 5 + 4 * i
        if (wall1.h1 < j) {
          wall1Updates.h1 = j
        }
        break

      case 3:
      case 4:
      case 5:
        break

      case 6:
        if (dir2 === 7) {
          i = 11
        } else if (dir2 > 7 && dir2 < 12) {
          i = 5
        } else {
          continue
        }
        if (wall1.h1 >= 6 + i) continue

        addWhite(wall1.startx + 6, wall1.starty + 6, i, sepatch)
        wall1Updates.h1 = 6 + i
        break

      case 7:
        if (dir2 === 6 || dir2 === 8) {
          i = 16
        } else if (dir2 === 9) {
          i = 8
        } else if (dir2 > 9 && dir2 < 12) {
          i = 6
        } else {
          continue
        }
        if (wall1.h1 >= 6 + i) continue

        addWhite(wall1.startx + 3, wall1.starty + 6, i, ssepatch)
        wall1Updates.h1 = 6 + i
        break

      case 8:
        switch (dir2) {
          case 6:
          case 11:
            i = 5
            break
          case 10:
            i = 10
            break
          case 9:
          case 7:
            i = 20
            break
          default:
            continue
        }
        if (i + 6 < wall1.h1) continue

        addWhite(wall1.startx, wall1.starty + 6, i, npatch)
        wall1Updates.h1 = i + 6
        break

      case 9:
        break

      case 10: {
        let i10: number
        switch (dir2) {
          case 6:
          case 7:
          case 8:
            i10 = dir2 - 5
            break
          case 9:
            i10 = 6
            break
          case 11:
            i10 = 4
            break
          default:
            continue
        }
        for (j = 0; j < 4 * i10; j += 4) {
          if (wall1.h2 > length1 - 9 - j) {
            addWhite(wall1.endx - 7 - j, wall1.endy + 6 + j, 4, nepatch)
          }
        }
        i10--
        j = length1 - 9 - 4 * i10
        if (wall1.h2 > j) {
          wall1Updates.h2 = j
        }

        // Execute case 11 logic with the i10 value
        const i11 = i10
        for (j = 0; j < 8 * i11; j += 8) {
          if (wall1.h2 >= length1 - 11 - j) {
            addWhite(
              wall1.endx - 18 - j,
              wall1.endy + 6 + (j >> 1),
              4,
              enepatch
            )
            addWhite(wall1.endx - 8 - j, wall1.endy + 6 + (j >> 1), 4, enepatch)
          }
        }
        j = length1 - 11 - 8 * i11
        if (wall1.h2 > j) {
          wall1Updates.h2 = j
        }
        break
      }

      case 11: {
        let i11: number
        if (dir2 === 9) {
          i11 = 2
        } else if (dir2 === 10) {
          i11 = 4
        } else {
          continue
        }
        for (j = 0; j < 8 * i11; j += 8) {
          if (wall1.h2 >= length1 - 11 - j) {
            addWhite(
              wall1.endx - 18 - j,
              wall1.endy + 6 + (j >> 1),
              4,
              enepatch
            )
            addWhite(wall1.endx - 8 - j, wall1.endy + 6 + (j >> 1), 4, enepatch)
          }
        }
        j = length1 - 11 - 8 * i11
        if (wall1.h2 > j) {
          wall1Updates.h2 = j
        }
        break
      }

      case 12:
        if (dir2 > 8 && dir2 < 12 && wall1.h2 === length1) {
          addWhite(wall1.endx - 14, wall1.endy + 2, 4, epatch)
          wall1Updates.h2 = length1 - 14
        }
        break

      case 13:
        break

      case 14:
        if (dir2 === 15) {
          i = 10
        } else if (dir2 < 4 || dir2 === 13) {
          i = 5
        } else {
          continue
        }
        j = wall1.h2
        if (j <= length1 - i) continue

        addWhite(wall1.endx - i, wall1.endy - i, i, sepatch)
        wall1Updates.h2 = length1 - i
        break

      case 15:
        switch (dir2) {
          case 0:
            i = 17
            break
          case 1:
          case 14:
            i = 11
            break
          case 2:
          case 3:
            i = 5
            break
          default:
            continue
        }
        j = wall1.h2
        if (j <= length1 - i) continue

        addWhite(wall1.endx - (i >> 1), wall1.endy - i, i, ssepatch)
        wall1Updates.h2 = length1 - i
        break

      default:
        break
    }
  }

  return { patches, wall1Updates, wall2Updates }
}
