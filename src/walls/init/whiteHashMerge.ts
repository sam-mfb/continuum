import type { WhiteRec, JunctionRec } from '../types'
import { hashFigure } from './whitePatterns'
import { patternToByteArray } from './utils'

// Background patterns from Play.c:61-62
const backgr1 = 0xaaaaaaaa
const backgr2 = 0x55555555

/**
 * Checks if a white piece has any close neighbors.
 * @see Junctions.c:617-629 - no_close_wh()
 */
function noCloseWh(whites: WhiteRec[], index: number): boolean {
  const w1 = whites[index]
  if (!w1) return true

  // Check whites before this one
  for (let i = index - 1; i >= 0; i--) {
    const w2 = whites[i]
    if (!w2) continue
    if (w2.x <= w1.x - 3) break
    if (w2.y < w1.y + 3 && w2.y > w1.y - 3) {
      return false
    }
  }

  // Check whites after this one
  for (let i = index + 1; i < whites.length; i++) {
    const w2 = whites[i]
    if (!w2) continue
    if (w2.x >= w1.x + 3) break
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
 * @param worldWidth Width of the game world (default 512)
 * @returns Updated white pieces with hash patterns where appropriate
 */
export function whiteHashMerge(
  whites: WhiteRec[],
  junctions: JunctionRec[],
  worldWidth: number = 512
): WhiteRec[] {
  const result = [...whites]
  const remainingJunctions = [...junctions]

  // Process each white piece
  for (let whIndex = 0; whIndex < result.length; whIndex++) {
    const wh = result[whIndex]
    if (!wh) continue

    // Skip if not a standard 6-height piece, has close neighbors, or is at edge
    // C code: wh->x < worldwidth - 8 && wh->x > 8
    if (
      wh.ht !== 6 ||
      !noCloseWh(result, whIndex) ||
      wh.x <= 8 ||
      wh.x >= worldWidth - 8
    ) {
      continue
    }

    // Find EXACT matching junction (not within tolerance)
    let junctionIndex = -1
    for (let j = 0; j < remainingJunctions.length; j++) {
      const junction = remainingJunctions[j]
      if (junction && junction.x === wh.x && junction.y === wh.y) {
        junctionIndex = j
        break
      }
    }

    if (junctionIndex !== -1) {
      // Choose background pattern based on position
      const back = (wh.x + wh.y) & 1 ? backgr2 : backgr1

      // First, reconstruct 16-bit values from byte pairs
      // NOTE: Data is stored as big-endian bytes, so high byte comes first
      const data16bit: number[] = []
      for (let i = 0; i < 6; i++) {
        const highByte = wh.data[i * 2] ?? 0
        const lowByte = wh.data[i * 2 + 1] ?? 0
        data16bit[i] = (highByte << 8) | lowByte
      }

      // Apply hash pattern using 16-bit operations
      const newData16bit: number[] = []
      let rotatedBack = back & 0xffff

      for (let i = 0; i < 6; i++) {
        // Apply hash pattern: (back & (~data | hashFigure)) ^ hashFigure
        const dataValue = data16bit[i] ?? 0
        const hashValue = hashFigure[i] ?? 0
        newData16bit[i] = (rotatedBack & (~dataValue | hashValue)) ^ hashValue

        // Rotate left by 1 bit (simulate asm rol.w)
        rotatedBack = ((rotatedBack << 1) | (rotatedBack >>> 15)) & 0xffff
      }

      // Convert back to byte array
      const newData = patternToByteArray(newData16bit)

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
