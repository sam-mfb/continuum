/**
 * Wall unpacking utilities based on original Continuum source code
 * Reference: Main.c:749-818 (unpack_planet function)
 *
 * ## Overview
 *
 * The wall unpacking system allows walls to be created with minimal information
 * and have their endpoints and other properties calculated automatically.
 * This matches the original Continuum's planet file format.
 *
 * ## How It Works
 *
 * The unpacking formula from the original C code:
 * - Extracts `up_down` from the upper byte of `ud_and_t`
 * - Extracts `type` from the lower 3 bits
 * - Extracts `kind` from bits 3-4
 * - Forces NNE and ENE lines to have odd lengths
 * - Calculates endpoints using lookup tables (`xlength` and `ylength`)
 * - Calculates `newtype` based on `up_down` and `type`
 *
 * ## Usage Example
 *
 * ```typescript
 * import { createWall } from '@/walls/unpack'
 * import { NEW_TYPE, LINE_KIND } from '@/walls/types'
 *
 * // Create a wall going South (vertical down)
 * const southWall = createWall(50, 30, 25, NEW_TYPE.S, LINE_KIND.NORMAL, 0)
 *
 * // Create a wall going Northeast (diagonal up-right)
 * const neWall = createWall(190, 108, 25, NEW_TYPE.NE, LINE_KIND.NORMAL, 6)
 * ```
 */

import type { LineRec, LineType, LineDir, LineKind, NewType } from './types'
import { LINE_TYPE, LINE_DIR, LINE_KIND, NEW_TYPE } from './types'

/**
 * Lookup tables for line endpoint calculations
 * From Play.c:46-47 and used in Main.c:783-785
 * These are scaled by 2 for extra precision (one extra bit)
 */
const xlength = [0, 0, 1, 2, 2, 2]
const ylength = [0, 2, 2, 2, 1, 0]

/**
 * Minimal wall data needed for unpacking
 * This represents the bare minimum data stored in planet files
 */
export type PackedWall = {
  /** Starting x coordinate */
  startx: number
  /** Starting y coordinate */
  starty: number
  /** Length of the wall */
  length: number
  /** Combined up_down and type data (as stored in file) */
  ud_and_t: number
}

/**
 * Unpacks a wall from minimal data to full LineRec format
 * Based on the unpacking logic in Main.c:772-789
 *
 * @param packed - Minimal wall data
 * @param index - Index for generating wall ID
 * @returns Complete LineRec with calculated endpoints and newtype
 */
export function unpackWall(packed: PackedWall, index: number): LineRec {
  const { startx, starty, ud_and_t } = packed
  let { length } = packed

  // Extract up_down from upper byte (Main.c:778)
  const up_down = (ud_and_t >> 8) as LineDir

  // Extract type from lower 3 bits (Main.c:779)
  const type = (ud_and_t & 7) as LineType

  // Extract kind from bits 3-4 (Main.c:780)
  const kind = ((ud_and_t & 31) >> 3) as LineKind

  // Force NNE and ENE lines to have odd lengths (Main.c:781-782)
  if (type === LINE_TYPE.NNE || type === LINE_TYPE.ENE) {
    length |= 1
  }

  // Calculate endpoints using lookup tables (Main.c:783-785)
  const endx = startx + ((xlength[type]! * length) >> 1)
  const endy = starty + up_down * ((ylength[type]! * length) >> 1)

  // Calculate newtype (Main.c:786)
  // newtype consolidates up_down and type into 8 directional values:
  // S(1), SSE(2), SE(3), ESE(4), E(5), ENE(6), NE(7), NNE(8)
  const newtype = (up_down === LINE_DIR.UP ? 10 - type : type) as NewType

  return {
    id: `line-${index}`,
    startx,
    starty,
    length,
    endx,
    endy,
    up_down,
    type,
    kind,
    newtype,
    nextId: null,
    nextwhId: null
  }
}

/**
 * Creates a wall with minimal specification
 * Useful for test files and manual wall creation
 *
 * @param startx - Starting x coordinate
 * @param starty - Starting y coordinate
 * @param length - Wall length
 * @param direction - Direction as NewType (S, SSE, SE, ESE, E, ENE, NE, NNE)
 * @param kind - Wall kind (defaults to NORMAL)
 * @param index - Index for ID generation
 * @returns Complete LineRec
 */
export function createWall(
  startx: number,
  starty: number,
  length: number,
  direction: NewType,
  kind: LineKind = LINE_KIND.NORMAL,
  index: number = 0
): LineRec {
  // Convert newtype back to type and up_down
  let type: LineType
  let up_down: LineDir

  if (direction <= NEW_TYPE.E) {
    // South quadrant (S, SSE, SE, ESE, E)
    type = direction as LineType
    up_down = LINE_DIR.DN
  } else {
    // North quadrant (ENE, NE, NNE)
    type = (10 - direction) as LineType
    up_down = LINE_DIR.UP
  }

  // Pack into ud_and_t format
  const ud_and_t = (up_down << 8) | (kind << 3) | type

  return unpackWall({ startx, starty, length, ud_and_t }, index)
}

/**
 * Validates wall coordinates
 * Based on the validation in Main.c:787-788
 *
 * @param wall - Wall to validate
 * @returns true if wall is valid
 */
export function isValidWall(wall: LineRec): boolean {
  // In the original C code, type 0 meant invalid/uninitialized
  // Our TypeScript types start at 1 (N=1), so we check the valid range
  return (
    wall.type >= LINE_TYPE.N &&
    wall.type <= LINE_TYPE.E &&
    wall.endx <= 4000 &&
    wall.starty <= 4000
  )
}
