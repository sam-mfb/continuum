/**
 * @fileoverview Constants used by wall rendering functions
 */

// Clipping masks from orig/Sources/Junctions.c:25-27
export const LEFT_CLIP = 0x0000FFFF   // Clip to right 16 bits
export const RIGHT_CLIP = 0xFFFF0000  // Clip to left 16 bits
export const CENTER_CLIP = 0xFFFFFFFF // No clipping (all 32 bits)