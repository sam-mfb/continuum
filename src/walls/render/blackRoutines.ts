/**
 * @fileoverview Corresponds to black_routines array from orig/Sources/Walls.c:1264
 */

import { southBlack } from './directional/southBlack'
import { sseBlack } from './directional/sseBlack'
import { seBlack } from './directional/seBlack'
import { eseBlack } from './directional/eseBlack'
import { eastBlack } from './directional/eastBlack'
import { eneBlack } from './directional/eneBlack'
import { neBlack } from './directional/neBlack'
import { nneBlack } from './directional/nneBlack'

/**
 * Array of black drawing functions indexed by direction
 * @see orig/Sources/Walls.c:1264 black_routines[]
 *
 * Original C definition:
 * void (*black_routines[9]) () =
 * {   NULL,
 *     south_black,
 *     sse_black,
 *     se_black,
 *     ese_black,
 *     east_black,
 *     ene_black,
 *     ne_black,
 *     nne_black};
 */
export const blackRoutines = [
  null, // Index 0: NULL in original
  southBlack, // Index 1: south_black
  sseBlack, // Index 2: sse_black
  seBlack, // Index 3: se_black
  eseBlack, // Index 4: ese_black
  eastBlack, // Index 5: east_black
  eneBlack, // Index 6: ene_black
  neBlack, // Index 7: ne_black
  nneBlack // Index 8: nne_black
]
