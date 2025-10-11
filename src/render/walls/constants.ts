/**
 * @fileoverview Constants used by wall rendering functions
 */

// Clipping masks from orig/Sources/Junctions.c:25-27
export const LEFT_CLIP = 0x0000ffff // Clip to right 16 bits
export const RIGHT_CLIP = 0xffff0000 // Clip to left 16 bits
export const CENTER_CLIP = 0xffffffff // No clipping (all 32 bits)
