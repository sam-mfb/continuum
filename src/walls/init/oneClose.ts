import type { LineRec, WhiteRec } from '../types'
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
 * @param endpoint1 Which endpoint of wall1 is close (0=start, 1=end)
 * @param endpoint2 Which endpoint of wall2 is close (0=start, 1=end)
 * @returns Patches to fill gaps and h1/h2 updates for optimization
 */
export function oneClose(
  wall1: LineRec,
  wall2: LineRec,
  endpoint1: number,
  endpoint2: number,
  whites: WhiteRec[]
): {
  newWhites: WhiteRec[]
  wall1Updates: { h1?: number; h2?: number }
  wall2Updates: { h1?: number; h2?: number }
} {
  const wall1Updates: { h1?: number; h2?: number } = {}
  const wall2Updates: { h1?: number; h2?: number } = {}
  let whiteIdCounter = 1000 // Start at 1000 to avoid conflicts
  let currentWhites = [...whites]

  // Calculate directions based on newtype and endpoint
  let dir1 = 9 - wall1.newtype
  if (endpoint1) dir1 = (dir1 + 8) & 15

  let dir2 = 9 - wall2.newtype
  if (endpoint2) dir2 = (dir2 + 8) & 15

  // Skip if same direction
  if (dir1 === dir2) return { newWhites: currentWhites, wall1Updates, wall2Updates }

  const addWhite = (x: number, y: number, ht: number, data: number[]): void => {
    currentWhites.push({
      id: `p${whiteIdCounter++}`,
      x,
      y,
      hasj: false,
      ht,
      data: [...data]
    })
  }

  const replaceWhite = (
    targetX: number,
    targetY: number,
    ht: number,
    data: number[]
  ) => {
    const index = currentWhites.findIndex(
      wh => wh.x === targetX && wh.y === targetY && wh.ht < ht
    )
    if (index !== -1) {
      replaceWhite2(targetX, targetY, targetX, targetY, ht, data)
    } else {
      addWhite(targetX, targetY, ht, data)
    }
  }

  const replaceWhite2 = (
    targetX: number,
    targetY: number,
    x: number,
    y: number,
    ht: number,
    data: number[]
  ) => {
    // C code: for (wh=whites; wh < whites + numwhites && (wh->y != targety || wh->x != targetx || wh->ht >= ht); wh++);
    const index = currentWhites.findIndex(
      wh => wh.x === targetX && wh.y === targetY && wh.ht < ht
    )

    if (index !== -1) {
      const oldWhite = currentWhites[index]
      if (oldWhite) {
        const newWhite: WhiteRec = {
          id: oldWhite.id,
          x,
          y,
          ht,
          data: [...data],
          hasj: oldWhite.hasj
        }
        currentWhites = [
          ...currentWhites.slice(0, index),
          newWhite,
          ...currentWhites.slice(index + 1)
        ]
      }
    } else {
      addWhite(x, y, ht, data)
    }
  }

  const addWhite2 = (
    _dummyX: number,
    _dummyY: number,
    x: number,
    y: number,
    ht: number,
    data: number[]
  ) => {
    addWhite(x, y, ht, data)
  }

  // Giant switch statement
  let i: number, j: number
  const length1 = wall1.length

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
          return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      j = wall1.h2
      if (length1 - i > j)
        return { newWhites: currentWhites, wall1Updates, wall2Updates }

      // C code: (*(j < line->length ? replace_white_2 : add_white_2))
      if (j < length1) {
        replaceWhite2(
          wall1.startx,
          wall1.starty + j,
          wall1.endx,
          wall1.endy - i,
          i,
          npatch
        )
      } else {
        addWhite2(
          wall1.startx,
          wall1.starty + j,
          wall1.endx,
          wall1.endy - i,
          i,
          npatch
        )
      }
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
          return { newWhites: currentWhites, wall1Updates, wall2Updates }
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
        return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      if (wall1.h1 >= 6 + i)
        return { newWhites: currentWhites, wall1Updates, wall2Updates }

      // C code: (*(line->h1 > 6 ? replace_white : add_white))
      if (wall1.h1 > 6) {
        replaceWhite(wall1.startx + 6, wall1.starty + 6, i, sepatch)
      } else {
        addWhite(wall1.startx + 6, wall1.starty + 6, i, sepatch)
      }
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
        return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      if (wall1.h1 >= 6 + i)
        return { newWhites: currentWhites, wall1Updates, wall2Updates }

      if (wall1.h1 > 6) {
        replaceWhite(wall1.startx + 3, wall1.starty + 6, i, ssepatch)
      } else {
        addWhite(wall1.startx + 3, wall1.starty + 6, i, ssepatch)
      }
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
          return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      if (i + 6 < wall1.h1)
        return { newWhites: currentWhites, wall1Updates, wall2Updates }

      if (wall1.h1 > 6) {
        replaceWhite(wall1.startx, wall1.starty + 6, i, npatch)
      } else {
        addWhite(wall1.startx, wall1.starty + 6, i, npatch)
      }
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
          return { newWhites: currentWhites, wall1Updates, wall2Updates }
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

      // Fall through to case 11 - but case 11 calculates its own i value
      // based on dir2, not reusing i10
      let i11: number | undefined
      if (dir2 === 9) {
        i11 = 2
      } else if ((dir2 as number) === 10) {
        i11 = 4
      }
      if (i11 === undefined) {
        break // No case 11 logic for other dir2 values
      }
      for (j = 0; j < 8 * i11; j += 8) {
        if (wall1.h2 >= length1 - 11 - j) {
          addWhite(wall1.endx - 18 - j, wall1.endy + 6 + (j >> 1), 4, enepatch)
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
        return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      for (j = 0; j < 8 * i11; j += 8) {
        if (wall1.h2 >= length1 - 11 - j) {
          addWhite(wall1.endx - 18 - j, wall1.endy + 6 + (j >> 1), 4, enepatch)
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
        return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      j = wall1.h2
      if (j <= length1 - i)
        return { newWhites: currentWhites, wall1Updates, wall2Updates }

      if (j < length1) {
        replaceWhite2(
          wall1.startx + j,
          wall1.starty + j,
          wall1.endx - i,
          wall1.endy - i,
          i,
          sepatch
        )
      } else {
        addWhite2(
          wall1.startx + j,
          wall1.starty + j,
          wall1.endx - i,
          wall1.endy - i,
          i,
          sepatch
        )
      }
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
          return { newWhites: currentWhites, wall1Updates, wall2Updates }
      }
      j = wall1.h2
      if (j <= length1 - i)
        return { newWhites: currentWhites, wall1Updates, wall2Updates }

      if (j < length1) {
        replaceWhite2(
          wall1.startx + (j >> 1),
          wall1.starty + j,
          wall1.endx - (i >> 1),
          wall1.endy - i,
          i,
          ssepatch
        )
      } else {
        addWhite2(
          wall1.startx + (j >> 1),
          wall1.starty + j,
          wall1.endx - (i >> 1),
          wall1.endy - i,
          i,
          ssepatch
        )
      }
      wall1Updates.h2 = length1 - i
      break

    default:
      break
  }

  return { newWhites: currentWhites, wall1Updates, wall2Updates }
}
