import { build68kArch } from '@/asm/emulator'

/**
 * Check if a point is within a circular distance (general case)
 * Based on orig/Sources/Play.c:1182-1212
 * 
 * XYINDIST: Returns TRUE iff x^2 + y^2 < dist^2
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
  
  // Convert to signed 16-bit to match 68k word operations
  const x16 = (x << 16) >> 16
  const y16 = (y << 16) >> 16
  const dist16 = (dist << 16) >> 16
  
  // move.w dist(A6), D0
  asm.D0 = dist16
  
  // cmp.w x(A6), D0
  // blt.s @false
  if (asm.D0 < x16) {
    return false // @false: move.w #0, D0
  }
  
  // cmp.w y(A6), D0
  // blt.s @false
  if (asm.D0 < y16) {
    return false
  }
  
  // neg.w D0
  asm.D0 = -asm.D0 & 0xffff
  
  // cmp.w x(A6), D0
  // bgt.s @false
  if (asm.D0 > x16) {
    return false
  }
  
  // cmp.w y(A6), D0
  // bgt.s @false
  if (asm.D0 > y16) {
    return false
  }
  
  // move.w x(A6), D1
  asm.D1 = x16
  
  // move.w y(A6), D2
  asm.D2 = y16
  
  // muls D0, D0 - signed multiply D0 * D0 (D0 currently contains -dist)
  asm.D0 = asm.D0 * asm.D0  // (-dist) * (-dist) = dist²
  
  // muls D1, D1 - signed multiply x * x
  asm.D1 = asm.D1 * asm.D1
  
  // muls D2, D2 - signed multiply y * y
  asm.D2 = asm.D2 * asm.D2
  
  // add.w D2, D1 - add y² to x²
  asm.D1 = (asm.D1 + asm.D2) & 0xffff
  
  // cmp.w D0, D1 - compare dist² with x²+y²
  // bgt.s @false - branch if D1 > D0
  if (asm.D1 > (asm.D0 & 0xffff)) {
    return false // @false: move.w #0, D0
  }
  
  // move.w #1, D0
  return true
}