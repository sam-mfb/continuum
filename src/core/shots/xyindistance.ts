import { build68kArch } from '@lib/asm'

/**
 * Check if a point is within a circular distance (optimized for bounded input)
 * Based on orig/Sources/Play.c:1215-1233
 *
 * XYINDISTANCE: like XYINDIST, but assumes x,y in 2dist X 2dist rect
 *
 * This assumption allows for optimization by skipping the bounding box check.
 * IMPORTANT: Caller must ensure |x| < dist and |y| < dist before calling this function
 *
 * Like xyindist, the actual behavior is x² + y² <= dist² (not strictly less than)
 *
 * @param x - X distance from center (must be within [-dist, dist])
 * @param y - Y distance from center (must be within [-dist, dist])
 * @param dist - Maximum distance (radius)
 * @returns True if point is within or on distance boundary, false if outside
 */
export function xyindistance(x: number, y: number, dist: number): boolean {
  // Create 68K emulator instance
  const asm = build68kArch()

  // move.w dist(A6), D2
  asm.instructions.move_w('D2', dist)

  // move.w x(A6), D1
  asm.instructions.move_w('D1', x)

  // move.w y(A6), D0
  asm.instructions.move_w('D0', y)

  // muls D0, D0 - signed multiply y * y
  asm.instructions.muls('D0', 'D0')

  // muls D1, D1 - signed multiply x * x
  asm.instructions.muls('D1', 'D1')

  // muls D2, D2 - signed multiply dist * dist
  asm.instructions.muls('D2', 'D2')

  // add.w D0, D1 - add y² to x² (only affects lower 16 bits)
  asm.instructions.add_w('D0', 'D1')

  // moveq #FALSE, D0
  asm.D0 = 0 // FALSE

  // cmp.w D2, D1 - compare dist² with x²+y²
  asm.instructions.cmp_w('D2', 'D1')

  // bgt.s @false - branch if greater than
  if (asm.instructions.bgt()) {
    // @false - return FALSE
    return false
  }

  // moveq #TRUE, D0
  return true
}
