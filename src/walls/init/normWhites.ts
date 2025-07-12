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
 * The sentinel gets overwritten by the next add_white call, except for the last one
 * which remains and gets overwritten by the final sentinel padding in init_whites.
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
  // This overwrites any previous sentinel at this position
  const currentIndex = whites.length > 0 ? whites.length - 1 : 0
  
  // If there's a sentinel at current position, overwrite it
  if (whites[currentIndex]?.id === 'sentinel_running') {
    whites[currentIndex] = {
      id: `w${whiteIdCounter}`,
      x,
      y,
      hasj: false,
      ht,
      data: [...data] // Clone the pattern
    }
  } else {
    // First white, just push
    whites.push({
      id: `w${whiteIdCounter}`,
      x,
      y,
      hasj: false,
      ht,
      data: [...data] // Clone the pattern
    })
  }
  
  // Always add sentinel at next position (mimics wh++; wh->x = 20000)
  whites.push({
    id: `sentinel_running`,
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
  let numWhites = 0

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
        numWhites++
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
        numWhites++
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
        numWhites++
        addWhiteWithSentinel(
          whites,
          whiteIdCounter++,
          wall.endx - 10,
          wall.endy + 1,
          5,
          eneglitch2
        )
        numWhites++
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
        numWhites++
        break
    }
  }

  // Return only the actual whites, not including the final running sentinel
  // This matches the C behavior where operations use numwhites count
  return whites.slice(0, numWhites)
}
