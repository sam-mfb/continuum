import { build68kArch } from '@/asm/emulator'

/**
 * Check if a point is within a circular distance (optimized for bounded input)
 * Based on orig/Sources/Play.c:1215-1233
 * 
 * XYINDISTANCE: like XYINDIST, but assumes x,y in 2dist X 2dist rect
 * 
 * This assumption allows for optimization by skipping the bounding box check.
 * IMPORTANT: Caller must ensure |x| < dist and |y| < dist before calling this function
 * 
 * @param x - X distance from center (must be within [-dist, dist])
 * @param y - Y distance from center (must be within [-dist, dist])
 * @param dist - Maximum distance (radius)
 * @returns True if point is within distance, false otherwise
 */
export function xyindistance(x: number, y: number, dist: number): boolean {
  // Create 68K emulator instance
  const asm = build68kArch()
  
  // Convert to signed 16-bit to match 68k word operations
  const x16 = (x << 16) >> 16
  const y16 = (y << 16) >> 16
  const dist16 = (dist << 16) >> 16
  
  // move.w dist(A6), D2
  asm.D2 = dist16
  
  // move.w x(A6), D1
  asm.D1 = x16
  
  // move.w y(A6), D0
  asm.D0 = y16
  
  // muls D0, D0 - signed multiply y * y
  asm.D0 = asm.D0 * asm.D0
  
  // muls D1, D1 - signed multiply x * x
  asm.D1 = asm.D1 * asm.D1
  
  // muls D2, D2 - signed multiply dist * dist
  asm.D2 = asm.D2 * asm.D2
  
  // add.w D0, D1 - add y² to x²
  asm.D1 = (asm.D1 + asm.D0) & 0xffff
  
  // moveq #FALSE, D0
  asm.D0 = 0 // FALSE
  
  // cmp.w D2, D1 - compare dist² with x²+y²
  // bgt.s @false - branch if D1 > D2
  if (asm.D1 > (asm.D2 & 0xffff)) {
    // @false - return FALSE (already set)
    return false
  }
  
  // moveq #TRUE, D0
  return true
}