import type { WhiteRec, JunctionRec } from '../types'
import { hashFigure } from './whitePatterns'

// Background patterns from Play.c:61-62
const backgr1 = 0xAAAAAAAA
const backgr2 = 0x55555555

/**
 * Checks if a white piece has any close neighbors.
 * @see Junctions.c:617-629 - no_close_wh()
 */
function noCloseWh(whites: WhiteRec[], index: number): boolean {
  const w1 = whites[index]
  
  // Check whites before this one
  for (let i = index - 1; i >= 0 && whites[i].x > w1.x - 3; i--) {
    const w2 = whites[i]
    if (w2.y < w1.y + 3 && w2.y > w1.y - 3) {
      return false
    }
  }
  
  // Check whites after this one
  for (let i = index + 1; i < whites.length && whites[i].x < w1.x + 3; i++) {
    const w2 = whites[i]
    if (w2.y < w1.y + 3 && w2.y > w1.y - 3) {
      return false
    }
  }
  
  return true
}

/**
 * Adds decorative 6x6 crosshatch patterns at junctions.
 * Converts solid white pieces to textured ones using XOR patterns
 * to make junction seams less visually obvious.
 * 
 * @see Junctions.c:569-614 - white_hash_merge()
 * @param whites Array of white pieces to potentially add hash patterns to
 * @param junctions Array of junction points where walls meet
 * @returns Updated white pieces with hash patterns where appropriate
 */
export function whiteHashMerge(
  whites: WhiteRec[],
  junctions: JunctionRec[]
): WhiteRec[] {
  const result = [...whites]
  const remainingJunctions = [...junctions]
  
  // Process each white piece
  for (let whIndex = 0; whIndex < result.length; whIndex++) {
    const wh = result[whIndex]
    
    // Skip if not a standard 6-height piece, has close neighbors, or is at edge
    if (wh.ht !== 6 || !noCloseWh(result, whIndex) || wh.x <= 8) {
      continue
    }
    
    // Find matching junction
    let junctionIndex = -1
    for (let j = 0; j < remainingJunctions.length; j++) {
      if (remainingJunctions[j].x === wh.x && remainingJunctions[j].y === wh.y) {
        junctionIndex = j
        break
      }
    }
    
    if (junctionIndex !== -1) {
      // Choose background pattern based on position
      const back = ((wh.x + wh.y) & 1) ? backgr2 : backgr1
      
      // Create new data with hash pattern
      const newData: number[] = []
      let rotatedBack = back
      
      for (let i = 0; i < 6; i++) {
        // Apply hash pattern: (back & (~data | hashFigure)) ^ hashFigure
        newData[i] = (rotatedBack & (~wh.data[i] | hashFigure[i])) ^ hashFigure[i]
        
        // Rotate left by 1 bit (simulate asm rol.w)
        rotatedBack = ((rotatedBack << 1) | (rotatedBack >>> 15)) & 0xFFFF
      }
      
      // Update white piece
      result[whIndex] = {
        ...wh,
        data: newData,
        hasj: true
      }
      
      // Remove processed junction
      remainingJunctions.splice(junctionIndex, 1)
    }
  }
  
  return result
}