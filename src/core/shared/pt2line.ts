/**
 * @fileoverview Port of pt2line() from orig/Sources/Utils.c:106-151
 * Calculates the squared distance from a point to a line segment
 */

import type { LineRec } from './types/line'
import { LINE_TYPE } from './types/line'
import type { Point } from './pt2xy'
import { pt2xy } from './pt2xy'
import { idiv } from '@lib/integer-math'

/**
 * Slope table from orig/Sources/Play.c:43
 * slopes2[LINE_E+1]={0, 0, 4, 2, 1, 0} - slopes of lines * 2
 * Indexed by line type (1-5)
 */
const slopes2: Record<number, number> = {
  0: 0, // Not used (type 0 doesn't exist)
  1: 0, // LINE_N (vertical)
  2: 4, // LINE_NNE
  3: 2, // LINE_NE  
  4: 1, // LINE_ENE
  5: 0  // LINE_E (horizontal)
}

/**
 * Calculate squared distance from a point to a line segment
 * @see orig/Sources/Utils.c:106-151 pt2line()
 * 
 * @param thept The point to measure from
 * @param line The line segment to measure to
 * @returns The squared distance (10000 for far away points, actual squared distance otherwise)
 */
export function pt2line(thept: Point, line: LineRec): number {
  // Utils.c:114-118 - Early bounds check to prevent arithmetic overflow
  const minY = Math.min(line.starty, line.endy)
  const maxY = Math.max(line.starty, line.endy)
  
  if (thept.h < line.startx - 50 ||
      thept.h > line.endx + 50 ||
      thept.v < minY - 50 ||
      thept.v > maxY + 50) {
    return 10000 // Help keep the arithmetic from overflowing
  }
  
  // Utils.c:120-128 - Special case for vertical lines
  if (line.type === LINE_TYPE.N) {
    if (thept.v < line.starty) {
      // Point is above the line start - distance to start point + 10
      return pt2xy(thept, line.startx, line.starty) + 10
    } else if (thept.v > line.endy) {
      // Point is below the line end - distance to end point + 10  
      return pt2xy(thept, line.endx, line.endy) + 10
    }
    // Point is horizontally aligned with vertical line
    const dx = thept.h - line.startx
    return dx * dx
  }
  
  // Utils.c:129-130 - Zero length line
  if (line.length === 0) {
    return pt2xy(thept, line.startx, line.starty)
  }
  
  // Utils.c:132-142 - General case using slope calculations
  const m2 = slopes2[line.type]! * line.up_down
  const g = line.endx - line.startx
  const h = line.endy - line.starty
  
  // Utils.c:136-138 - Complex perpendicular distance calculation
  // This finds the perpendicular projection of the point onto the line
  // NOTE: Must use integer arithmetic to match original C code
  const term1 = (m2 * (line.startx - thept.h)) >> 1 // Integer division by 2 using right shift
  const numerator = h * (term1 - line.starty + thept.v)
  const term2 = (h * m2) >> 1 // Integer division by 2 using right shift
  const denominator = g + term2
  const dx = denominator === 0 ? 0 : idiv(numerator, denominator) // Integer division
  
  // Utils.c:139-142 - Calculate dy based on line type
  let dy: number
  if (line.type === LINE_TYPE.E) {
    // Horizontal line - dy is just vertical distance
    dy = thept.v - line.starty
  } else {
    // Other lines - calculate based on dx and slope
    dy = idiv(dx * -g, h) // Integer division
  }
  
  // Utils.c:144-150 - Check if perpendicular point is within line segment
  const x1 = thept.h + dx
  if (x1 < line.startx) {
    // Projection is before line start - distance to start point + 10
    return pt2xy(thept, line.startx, line.starty) + 10
  } else if (x1 > line.endx) {
    // Projection is after line end - distance to end point + 10
    return pt2xy(thept, line.endx, line.endy) + 10
  } else {
    // Projection is within line segment - return perpendicular distance
    return dx * dx + dy * dy
  }
}