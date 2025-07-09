/**
 * White wall shadow patterns from the original C code
 * @see Junctions.c:98-116
 */

// Hash patterns for junctions (6x6 crosshatch)
export const hashFigure = [0x8000, 0x6000, 0x1800, 0x0600, 0x0180, 0x0040]

// Glitch fix patterns
export const neglitch = [0xEFFF, 0xCFFF, 0x8FFF, 0x0FFF]
export const eneglitch1 = [0x07FF, 0x1FFF, 0x7FFF]
export const eneglitch2 = [0xFF3F, 0xFC3F, 0xF03F, 0xC03F, 0x003F]
export const eseglitch = [0x3FFF, 0xCFFF, 0xF3FF, 0xFDFF]

// Standard white piece patterns
export const generictop = [0xFFFF, 0x3FFF, 0x0FFF, 0x03FF, 0x00FF, 0x007F]
export const nnebot = [0x800F, 0xC01F, 0xF01F, 0xFC3F, 0xFF3F, 0xFFFF]
export const nebot = [0x8001, 0xC003, 0xF007, 0xFC0F, 0xFF1F, 0xFFFF]
export const eneleft = [0x8000, 0xC000, 0xF000, 0xFC01, 0xFF07, 0xFFDF]
export const eleft = [0xFFFF, 0xFFFF, 0xF000, 0xFC00, 0xFF00, 0xFF80]
export const eseright = [0xFFFF, 0x3FFF, 0x8FFF, 0xE3FF, 0xF8FF, 0xFE7F]
export const setop = [0xFFFF, 0xFFFF, 0xEFFF, 0xF3FF, 0xF8FF, 0xFC3F]
export const sebot = [0x87FF, 0xC3FF, 0xF1FF, 0xFCFF, 0xFF7F, 0xFFFF]
export const ssetop = [0xFFFF, 0xBFFF, 0xCFFF, 0xC3FF, 0xE0FF, 0xE03F]
export const ssebot = [0x80FF, 0xC07F, 0xF07F, 0xFC3F, 0xFF3F, 0xFFFF]
export const sbot = [0x803F, 0xC03F, 0xF03F, 0xFC3F, 0xFF3F, 0xFFFF]

// White pictures indexed by newtype
// Format: [start pattern, end pattern]
export const whitepicts: Array<[number[] | null, number[] | null]> = [
  [null, null],           // 0 - unused
  [generictop, sbot],     // 1 - S
  [ssetop, ssebot],       // 2 - SSE
  [setop, sebot],         // 3 - SE
  [null, eseright],       // 4 - ESE
  [eleft, generictop],    // 5 - E
  [eneleft, generictop],  // 6 - ENE
  [nebot, generictop],    // 7 - NE
  [nnebot, generictop]    // 8 - NNE
]