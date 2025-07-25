// From orig/Sources/Assembly Macros.h

/**
 * Conditionally negates a value based on another value's sign
 * If y is negative (<= 0), negates x; otherwise leaves x unchanged
 *
 * From: orig/Sources/Assembly Macros.h:14-18
 *
 * Original assembly:
 * ```asm
 * #define NEGIFNEG(x, y)      \
 *     tst.w   y               \
 *     bgt.s   @_1             \
 *     neg.w   x               \
 * @_1:
 * ```
 *
 * Assembly explanation:
 * - tst.w y: Test word at y (sets condition codes based on value)
 * - bgt.s @_1: Branch if greater than zero to label @_1 (skip negation)
 * - neg.w x: Negate word at x (two's complement)
 * - @_1: Label for branch target (end of macro)
 *
 * @param x - The value to conditionally negate
 * @param y - The value whose sign determines negation
 * @returns The value x, possibly negated
 */
export function negIfNeg(x: number, y: number): number {
  if (y <= 0) {
    return -x
  }
  return x
}

/**
 * Finds the word-aligned address for a pixel at (x, y)
 * Word alignment means address is on a 2-byte boundary
 *
 * From: orig/Sources/Assembly Macros.h:33-41
 *
 * Original assembly:
 * ```asm
 * #define FIND_WADDRESS(thex, they)       \
 *     movea.l back_screen(A5), A0        \
 *     move.w  thex, D0                   \
 *     asr.w   #3, D0                     \
 *     bclr.l  #0, D0                     \
 *     adda.w  D0, A0                     \
 *     move.w  they, D0                   \
 *     asl.w   #6, D0                     \
 *     adda.w  D0, A0
 * ```
 *
 * Assembly explanation:
 * - movea.l back_screen(A5), A0: Load back screen base address into A0
 * - move.w thex, D0: Load x coordinate into D0
 * - asr.w #3, D0: Arithmetic shift right by 3 (divide by 8 for byte offset)
 * - bclr.l #0, D0: Clear bit 0 to ensure word alignment (2-byte boundary)
 * - adda.w D0, A0: Add x byte offset to base address
 * - move.w they, D0: Load y coordinate into D0
 * - asl.w #6, D0: Arithmetic shift left by 6 (multiply by 64 for row offset)
 * - adda.w D0, A0: Add y row offset to get final address
 *
 * NOTE: This returns a byte offset, not a memory address. When reading/writing
 * 16-bit words at this offset, use DataView or the BigEnd utility to handle
 * the big-endian byte order correctly (original Mac was big-endian).
 *
 * @param backScreen - Base address of the back screen buffer (usually 0)
 * @param x - X coordinate in pixels
 * @param y - Y coordinate in pixels
 * @returns Byte offset in the bitmap for the word-aligned pixel address
 */
export function findWAddress(backScreen: number, x: number, y: number): number {
  // Convert x to byte offset, then word-align by clearing bit 0
  const byteOffset = (x >> 3) & ~1
  // Each row is 64 bytes (y << 6)
  const rowOffset = y << 6
  return backScreen + byteOffset + rowOffset
}

/**
 * Finds the byte-aligned address for a pixel at (x, y)
 *
 * From: orig/Sources/Assembly Macros.h:43-50
 *
 * Original assembly:
 * ```asm
 * #define FIND_BADDRESS(thex, they)       \
 *     movea.l back_screen(A5), A0        \
 *     move.w  thex, D0                   \
 *     asr.w   #3, D0                     \
 *     adda.w  D0, A0                     \
 *     move.w  they, D0                   \
 *     asl.w   #6, D0                     \
 *     adda.w  D0, A0
 * ```
 *
 * Assembly explanation:
 * - movea.l back_screen(A5), A0: Load back screen base address into A0
 * - move.w thex, D0: Load x coordinate into D0
 * - asr.w #3, D0: Arithmetic shift right by 3 (divide by 8 for byte offset)
 * - adda.w D0, A0: Add x byte offset to base address
 * - move.w they, D0: Load y coordinate into D0
 * - asl.w #6, D0: Arithmetic shift left by 6 (multiply by 64 for row offset)
 * - adda.w D0, A0: Add y row offset to get final address
 *
 * @param backScreen - Base address of the back screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Memory address for the pixel
 */
export function findBAddress(backScreen: number, x: number, y: number): number {
  // Convert x to byte offset
  const byteOffset = x >> 3
  // Each row is 64 bytes (y << 6)
  const rowOffset = y << 6
  return backScreen + byteOffset + rowOffset
}

/**
 * JSR (Jump to Subroutine) wrapper for findWAddress
 * In the original assembly, this would call find_waddr and move result to A0
 *
 * From: orig/Sources/Assembly Macros.h:23-25
 *
 * Original assembly:
 * ```asm
 * #define JSR_WADDRESS            \
 *     jsr find_waddr              \
 *     move.l  D0, A0
 * ```
 *
 * Assembly explanation:
 * - jsr find_waddr: Jump to subroutine find_waddr (function call)
 * - move.l D0, A0: Move long (32-bit) result from D0 register to A0 register
 *
 * NOTE: When using this address to read/write 16-bit words, remember to handle
 * big-endian byte order (use DataView or BigEnd utility).
 *
 * @param backScreen - Base address of the back screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Byte offset for the pixel (word-aligned)
 */
export function jsrWAddress(backScreen: number, x: number, y: number): number {
  return findWAddress(backScreen, x, y)
}

/**
 * JSR (Jump to Subroutine) wrapper for findBAddress
 * In the original assembly, this would call find_baddr and move result to A0
 *
 * From: orig/Sources/Assembly Macros.h:27-29
 *
 * Original assembly:
 * ```asm
 * #define JSR_BADDRESS            \
 *     jsr find_baddr              \
 *     move.l  D0, A0
 * ```
 *
 * Assembly explanation:
 * - jsr find_baddr: Jump to subroutine find_baddr (function call)
 * - move.l D0, A0: Move long (32-bit) result from D0 register to A0 register
 *
 * @param backScreen - Base address of the back screen buffer
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Memory address for the pixel (byte-aligned)
 */
export function jsrBAddress(backScreen: number, x: number, y: number): number {
  return findBAddress(backScreen, x, y)
}
