/**
 * White wall shadow patterns from the original C code
 *
 * IMPORTANT: These patterns are 16-bit big-endian values from the 68K Mac.
 * Each value represents one row of a 16-pixel wide bitmap pattern.
 * The original Mac stored these as big-endian words in memory.
 *
 * When creating WhiteRec objects, these values are converted to byte arrays
 * with high byte first to maintain the original byte order for rendering.
 *
 * @see Junctions.c:98-116
 */

// Hash patterns for junctions (6x6 crosshatch)
export const hashFigure = [0x8000, 0x6000, 0x1800, 0x0600, 0x0180, 0x0040]

// Glitch fix patterns
export const neglitch = [0xefff, 0xcfff, 0x8fff, 0x0fff]
export const eneglitch1 = [0x07ff, 0x1fff, 0x7fff]
export const eneglitch2 = [0xff3f, 0xfc3f, 0xf03f, 0xc03f, 0x003f]
export const eseglitch = [0x3fff, 0xcfff, 0xf3ff, 0xfdff]

// Standard white piece patterns
export const generictop = [0xffff, 0x3fff, 0x0fff, 0x03ff, 0x00ff, 0x007f]
export const nnebot = [0x800f, 0xc01f, 0xf01f, 0xfc3f, 0xff3f, 0xffff]
export const nebot = [0x8001, 0xc003, 0xf007, 0xfc0f, 0xff1f, 0xffff]
export const eneleft = [0x8000, 0xc000, 0xf000, 0xfc01, 0xff07, 0xffdf]
export const eleft = [0xffff, 0xffff, 0xf000, 0xfc00, 0xff00, 0xff80]
export const eseright = [0xffff, 0x3fff, 0x8fff, 0xe3ff, 0xf8ff, 0xfe7f]
export const setop = [0xffff, 0xffff, 0xefff, 0xf3ff, 0xf8ff, 0xfc3f]
export const sebot = [0x87ff, 0xc3ff, 0xf1ff, 0xfcff, 0xff7f, 0xffff]
export const ssetop = [0xffff, 0xbfff, 0xcfff, 0xc3ff, 0xe0ff, 0xe03f]
export const ssebot = [0x80ff, 0xc07f, 0xf07f, 0xfc3f, 0xff3f, 0xffff]
export const sbot = [0x803f, 0xc03f, 0xf03f, 0xfc3f, 0xff3f, 0xffff]

// White pictures indexed by newtype
// Format: [start pattern, end pattern]
export const whitepicts: Array<[number[] | null, number[] | null]> = [
  [null, null], // 0 - unused
  [generictop, sbot], // 1 - S
  [ssetop, ssebot], // 2 - SSE
  [setop, sebot], // 3 - SE
  [null, eseright], // 4 - ESE
  [eleft, generictop], // 5 - E
  [eneleft, generictop], // 6 - ENE
  [nebot, generictop], // 7 - NE
  [nnebot, generictop] // 8 - NNE
]
