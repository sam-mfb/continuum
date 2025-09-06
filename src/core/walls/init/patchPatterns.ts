/**
 * Patch patterns for closing gaps between walls
 *
 * IMPORTANT: These patterns are 16-bit big-endian values from the 68K Mac.
 * Each value represents one row of a 16-pixel wide bitmap pattern.
 * The original Mac stored these as big-endian words in memory.
 *
 * When creating WhiteRec objects, these values are converted to byte arrays
 * with high byte first to maintain the original byte order for rendering.
 *
 * @see Junctions.c:325-332
 */

export const nepatch = [0xe000, 0xc001, 0x8003, 0x0007]
export const enepatch = [0xfc00, 0xf003, 0xc00f, 0x003f]
export const epatch = [0x0003, 0x0003, 0x0003, 0x0003]
export const sepatch = [
  0x07ff, 0x83ff, 0xc1ff, 0xe0ff, 0xf07f, 0xf83f, 0xfc1f, 0xfe0f, 0xff07,
  0xff83, 0xffc1
]
export const ssepatch = [
  0x00ff, 0x00ff, 0x807f, 0x807f, 0xc03f, 0xc03f, 0xe01f, 0xe01f, 0xf00f,
  0xf00f, 0xf807, 0xf807, 0xfc03, 0xfc03, 0xfe01, 0xfe01, 0xff00, 0xff00
]

// Number of elements in the npatch array
export const NUM_NPATCH_VALUES = 22

// Initialize npatch array (NUM_NPATCH_VALUES elements all set to 0x003F)
export const npatch = new Array(NUM_NPATCH_VALUES).fill(0x003f)
