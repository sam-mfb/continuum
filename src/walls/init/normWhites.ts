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
        whites.push({
          id: `w${whiteIdCounter++}`,
          x: i ? wall.endx : wall.startx,
          y: i ? wall.endy : wall.starty,
          hasj: false,
          ht: 6,
          data: [...pattern] // Clone the pattern
        })
      }
    }
    
    // Add special glitch-fixing pieces
    switch (wall.newtype) {
      case NEW_TYPE.NE:
        whites.push({
          id: `w${whiteIdCounter++}`,
          x: wall.endx - 4,
          y: wall.endy + 2,
          hasj: false,
          ht: 4,
          data: [...neglitch]
        })
        break
        
      case NEW_TYPE.ENE:
        whites.push({
          id: `w${whiteIdCounter++}`,
          x: wall.startx + 16,
          y: wall.starty,
          hasj: false,
          ht: 3,
          data: [...eneglitch1]
        })
        whites.push({
          id: `w${whiteIdCounter++}`,
          x: wall.endx - 10,
          y: wall.endy + 1,
          hasj: false,
          ht: 5,
          data: [...eneglitch2]
        })
        break
        
      case NEW_TYPE.ESE:
        whites.push({
          id: `w${whiteIdCounter++}`,
          x: wall.endx - 7,
          y: wall.endy - 2,
          hasj: false,
          ht: 4,
          data: [...eseglitch]
        })
        break
    }
  }
  
  return whites
}