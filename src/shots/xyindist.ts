import { build68kArch } from '@/asm/emulator'

/**
 * Check if a point is within a circular distance (general case)
 * Based on orig/Sources/Play.c:1182-1212
 * 
 * XYINDIST: Returns TRUE iff x^2 + y^2 < dist^2 (comment says <, but code does <=)
 * 
 * This is the general distance check function that:
 * 1. First does a bounding box check for early rejection
 * 2. Then does the actual distance calculation
 * 
 * @param x - X distance from center
 * @param y - Y distance from center  
 * @param dist - Maximum distance (radius)
 * @returns True if point is within distance, false otherwise
 */
export function xyindist(x: number, y: number, dist: number): boolean {
  // Create 68K emulator instance
  const asm = build68kArch()
  
  // move.w dist(A6), D0
  asm.instructions.move_w('D0', dist)
  
  // cmp.w x(A6), D0
  // blt.s @false - branches if D0 < x (unsigned comparison for positive values)
  if ((asm.D0 & 0xffff) < (x & 0xffff)) {
    return false
  }
  
  // cmp.w y(A6), D0
  // blt.s @false - branches if D0 < y (unsigned comparison for positive values)
  if ((asm.D0 & 0xffff) < (y & 0xffff)) {
    return false
  }
  
  // neg.w D0 - negate D0 in place
  asm.instructions.neg_w('D0')
  
  // cmp.w x(A6), D0
  // bgt.s @false - branches if D0 > x (signed comparison)
  // After neg, D0 contains -dist as a signed 32-bit value
  const negDist = (asm.D0 << 16) >> 16 // Sign extend for comparison
  const xSigned = (x << 16) >> 16
  if (negDist > xSigned) {
    return false
  }
  
  // cmp.w y(A6), D0
  // bgt.s @false - branches if D0 > y (signed comparison)
  const ySigned = (y << 16) >> 16
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