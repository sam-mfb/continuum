import type { LineRec, NewType, LineType, LineDir, LineKind } from '../shared/types/line'
import type { PackedLine } from './packLine'
import { LINE_TYPE, LINE_DIR } from '../shared/types/line'
import { generateLineId } from '../shared/types/line'

/**
 * Unpacks a line from the minimal storage format to a complete LineRec
 * by calculating endpoints and other derived fields.
 * 
 * Based on unpack_planet() from Main.c and parsePlanet.ts
 * 
 * This includes:
 * - Calculating endpoints using xlength/ylength tables
 * - Forcing odd lengths for NNE and ENE lines
 * - Computing the newtype field
 * 
 * @param packed The packed line data (as stored in planet files)
 * @param id Optional ID for the line (will be generated if not provided)
 * @returns A complete LineRec ready for rendering
 */
export function unpackLine(packed: PackedLine, id?: string): LineRec {
  // Lookup tables from parsePlanet.ts:87-88
  // These are rough sine/cosine values for the 5 line angles
  // multiplied by 2 for extra precision
  const ylength = [0, 2, 2, 2, 1, 0]
  const xlength = [0, 0, 1, 2, 2, 2]
  
  let { startx, starty, length, type, up_down, kind } = packed
  
  // Force NNE and ENE lines to have odd lengths
  // parsePlanet.ts:94-96 / Main.c:788-789
  if (type === LINE_TYPE.NNE || type === LINE_TYPE.ENE) {
    length |= 1 // Sets least significant bit, making it odd
  }
  
  // Calculate endpoints using the lookup tables
  // parsePlanet.ts:89-90 / Main.c:785-786
  const endx = startx + ((xlength[type]! * length) >> 1)
  const endy = starty + up_down * ((ylength[type]! * length) >> 1)
  
  // Calculate newtype which consolidates up_down and type
  // parsePlanet.ts:101
  // This gives directions: S, SSE, SE, ESE, E, ENE, NE, NNE
  const newtype = (up_down === LINE_DIR.UP ? 10 - type : type) as NewType
  
  return {
    id: id || generateLineId(0), // Generate ID if not provided
    startx,
    starty,
    endx,
    endy,
    length,
    type: type as LineType,
    up_down: up_down as LineDir,
    kind: kind as LineKind,
    newtype,
    h1: 0, // These are set during init_walls()
    h2: 0,
    nextId: null,
    nextwhId: null
  }
}

/**
 * Unpacks multiple lines at once
 * 
 * @param packedLines Array of packed lines
 * @param startId Starting index for ID generation
 * @returns Array of complete LineRec objects
 */
export function unpackLines(packedLines: PackedLine[], startId: number = 0): LineRec[] {
  return packedLines.map((packed, index) => 
    unpackLine(packed, generateLineId(startId + index))
  )
}