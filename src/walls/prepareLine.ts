import type { LineRec, NewType } from '../shared/types/line'
import { LINE_TYPE, LINE_DIR } from '../shared/types/line'

/**
 * Prepares a line for rendering by applying the same transformations
 * that parsePlanet.ts does when loading lines from planet files.
 * 
 * Based on parsePlanet.ts:86-101
 * 
 * This includes:
 * - Calculating endpoints using xlength/ylength tables
 * - Forcing odd lengths for NNE and ENE lines
 * - Computing the newtype field
 * 
 * @param line The line to prepare (will be mutated)
 * @returns The prepared line
 */
export function prepareLine(line: LineRec): LineRec {
  // Lookup tables from parsePlanet.ts:87-88
  // These are rough sine/cosine values for the 5 line angles
  // multiplied by 2 for extra precision
  const ylength = [0, 2, 2, 2, 1, 0]
  const xlength = [0, 0, 1, 2, 2, 2]
  
  // Force NNE and ENE lines to have odd lengths
  // parsePlanet.ts:94-96
  if (line.type === LINE_TYPE.NNE || line.type === LINE_TYPE.ENE) {
    line.length |= 1 // Sets least significant bit, making it odd
  }
  
  // Calculate endpoints using the lookup tables
  // parsePlanet.ts:89-90
  const typeIndex = line.type as number
  line.endx = line.startx + ((xlength[typeIndex]! * line.length) >> 1)
  line.endy = line.starty + line.up_down * ((ylength[typeIndex]! * line.length) >> 1)
  
  // Calculate newtype which consolidates up_down and type
  // parsePlanet.ts:101
  // This gives directions: S, SSE, SE, ESE, E, ENE, NE, NNE
  line.newtype = (line.up_down === LINE_DIR.UP ? 10 - line.type : line.type) as NewType
  
  return line
}

/**
 * Helper function to prepare multiple lines at once
 * 
 * @param lines Array of lines to prepare
 * @returns Array of prepared lines
 */
export function prepareLines(lines: LineRec[]): LineRec[] {
  return lines.map(line => prepareLine({ ...line }))
}