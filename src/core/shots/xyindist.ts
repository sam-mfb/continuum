import { build68kArch } from '@lib/asm'

/**
 * Check if a point is within a circular distance (general case)
 * Based on orig/Sources/Play.c:1182-1212
 *
 * IMPORTANT DISCREPANCY:
 * The original C comment says "Returns TRUE iff x^2 + y^2 < dist^2" (strictly less than)
 * However, the actual assembly implementation returns TRUE when x² + y² <= dist² (less than or equal)
 *
 * ANALYSIS OF ORIGINAL ASSEMBLY:
 * 1. Bounding box checks (lines 1188-1196):
 *    - `cmp.w x(A6), D0; blt.s @false` - branches only if dist < x (not dist <= x)
 *    - For x=10, dist=10: comparison yields 10-10=0, blt doesn't branch (0 is not < 0)
 *    - Same for y and negative bounds
 *    - Therefore points exactly at ±dist pass the bounding box check
 *
 * 2. Distance calculation (lines 1198-1205):
 *    - After squaring values with muls and adding with add.w
 *    - `cmp.w D0, D1` compares dist² (D0) with x²+y² (D1)
 *    - `bgt.s @false` branches if D1 > D0 (sum > dist²)
 *    - Returns TRUE when D1 <= D0 (sum <= dist²)
 *
 * 3. Boundary examples:
 *    - xyindist(10, 0, 10): 100 <= 100 = TRUE
 *    - xyindist(6, 8, 10): 100 <= 100 = TRUE (exactly on circle)
 *    - xyindist(7, 7, 10): 98 <= 100 = TRUE (inside circle)
 *    - xyindist(8, 7, 10): 113 <= 100 = FALSE (outside circle)
 *
 * WHY THIS DOESN'T MATTER FOR THE GAME:
 * - In practice, game objects are never positioned exactly at boundary distances
 * - The difference only affects points exactly on the circle perimeter
 * - For SKILLBRADIUS=30 bunker destruction, bunkers at exactly 30 pixels will be destroyed
 *
 * This implementation matches the actual assembly behavior (<=), not the comment (<).
 *
 * @param x - X distance from center
 * @param y - Y distance from center
 * @param dist - Maximum distance (radius)
 * @returns True if point is within or on the distance boundary, false if outside
 */
export function xyindist(x: number, y: number, dist: number): boolean {
  // Create 68K emulator instance
  const asm = build68kArch()

  // move.w dist(A6), D0
  asm.instructions.move_w('D0', dist)

  // cmp.w x(A6), D0
  // blt.s @false - branches if D0 < x (SIGNED comparison)
  // Need to sign-extend both values for proper signed comparison
  const d0Signed = (asm.D0 << 16) >> 16
  const xSigned = (x << 16) >> 16
  if (d0Signed < xSigned) {
    return false
  }

  // cmp.w y(A6), D0
  // blt.s @false - branches if D0 < y (SIGNED comparison)
  const ySigned = (y << 16) >> 16
  if (d0Signed < ySigned) {
    return false
  }

  // neg.w D0 - negate D0 in place
  asm.instructions.neg_w('D0')

  // cmp.w x(A6), D0
  // bgt.s @false - branches if D0 > x (signed comparison)
  // After neg, D0 contains -dist as a signed 32-bit value
  const negDist = (asm.D0 << 16) >> 16 // Sign extend for comparison
  // xSigned already computed above
  if (negDist > xSigned) {
    return false
  }

  // cmp.w y(A6), D0
  // bgt.s @false - branches if D0 > y (signed comparison)
  // ySigned already computed above
  if (negDist > ySigned) {
    return false
  }

  // move.w x(A6), D1
  asm.instructions.move_w('D1', x)

  // move.w y(A6), D2
  asm.instructions.move_w('D2', y)

  // muls D0, D0 - squares D0 (which contains -dist from neg.w)
  // Result: (-dist) * (-dist) = dist²
  asm.instructions.muls('D0', 'D0')

  // muls D1, D1 - squares x
  asm.instructions.muls('D1', 'D1')

  // muls D2, D2 - squares y
  asm.instructions.muls('D2', 'D2')

  // add.w D2, D1 - add y² to x² (only affects lower 16 bits)
  asm.instructions.add_w('D2', 'D1')

  // cmp.w D0, D1 - compare dist² with x²+y²
  asm.instructions.cmp_w('D0', 'D1')

  // bgt.s @false - branch if greater than
  if (asm.instructions.bgt()) {
    return false
  }

  // move.w #1, D0
  return true
}
