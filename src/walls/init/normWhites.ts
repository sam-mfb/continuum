import type { LineRec, WhiteRec } from '../types'
import { NEW_TYPE } from '../constants'
import {
  whitepicts,
  neglitch,
  eneglitch1,
  eneglitch2,
  eseglitch
} from './whitePatterns'

/**
 * Adds a white piece to the array and maintains a running sentinel.
 * This mimics the C add_white function which sets wh->x = 20000 after each addition.
 * 
 * NOTE: This running sentinel is redundant in our implementation because:
 * 1. JavaScript arrays have proper bounds checking unlike C arrays
 * 2. The final sentinel padding is added by addSentinelWhites in initWhites
 * 3. We maintain this behavior solely for faithfulness to the original C code
 * 
 * @see Junctions.c:144-158 - add_white() function
 */
function addWhiteWithSentinel(
  whites: WhiteRec[],
  whiteIdCounter: number,
  x: number,
  y: number,
  ht: number,
  data: number[]
): void {
  // Add the actual white
  whites.push({
    id: `w${whiteIdCounter}`,
    x,
    y,
    hasj: false,
    ht,
    data: [...data] // Clone the pattern
  })
  
  // Add running sentinel (will be overwritten by next add or removed later)
  whites.push({
    id: `sentinel_temp`,
    x: 20000,
    y: 0,
    hasj: false,
    ht: 0,
    data: []
  })
}

/**
 * Generates standard white shadow pieces for each wall endpoint.
 * Also adds special glitch-fixing pieces for NE, ENE, and ESE walls.
 * Uses predefined bit patterns from whitepicts array.
 *
 * @see Junctions.c:245-279 - norm_whites()
 */
export function normWhites(walls: LineRec[]): WhiteRec[] {
  const whites: WhiteRec[] = []
  let whiteIdCounter = 0

  for (const wall of walls) {
    // Add white pieces for start and end points
    for (let i = 0; i < 2; i++) {
      const pattern = whitepicts[wall.newtype]?.[i]
      if (pattern) {
        addWhiteWithSentinel(
          whites,
          whiteIdCounter++,
          i ? wall.endx : wall.startx,
          i ? wall.endy : wall.starty,
          6,
          pattern
        )
      }
    }

    // Add special glitch-fixing pieces
    switch (wall.newtype) {
      case NEW_TYPE.NE:
        addWhiteWithSentinel(
          whites,
          whiteIdCounter++,
          wall.endx - 4,
          wall.endy + 2,
          4,
          neglitch
        )
        break

      case NEW_TYPE.ENE:
        addWhiteWithSentinel(
          whites,
          whiteIdCounter++,
          wall.startx + 16,
          wall.starty,
          3,
          eneglitch1
        )
        addWhiteWithSentinel(
          whites,
          whiteIdCounter++,
          wall.endx - 10,
          wall.endy + 1,
          5,
          eneglitch2
        )
        break

      case NEW_TYPE.ESE:
        addWhiteWithSentinel(
          whites,
          whiteIdCounter++,
          wall.endx - 7,
          wall.endy - 2,
          4,
          eseglitch
        )
        break
    }
  }

  // Remove all temporary sentinels (they all have id 'sentinel_temp')
  // The last one might still be there if we added any whites
  return whites.filter(w => w.id !== 'sentinel_temp')
}
