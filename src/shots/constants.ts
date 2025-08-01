export const SHOT = {
  shotvecs: [
    0, 14, 27, 40, 51, 60, 67, 71, 72, 71, 67, 60, 51, 40, 27, 14, 0, -14, -27,
    -40, -51, -60, -67, -71, -72, -71, -67, -60, -51, -40, -27, -14
  ],
  NUMBULLETS: 6 /* number of ship's shots at once	*/,
  NUMSHOTS: 20 /* number of bunker shots at once	*/,
  SHOOTMARG: 300 /* distance from screen bunkers fire*/,
  SHOTLEN: 35 /* cycles bullets keep going		*/,
  BUNKSHLEN: 30 /* cycles bunk shots keep going	*/
} as const

/**
 * Bunker shot start positions for different bunker types and rotations
 * From orig/Sources/Figs.c at xbshotstart (line 87) and ybshotstart (line 95)
 *
 * These arrays define the offset from the bunker center where shots are fired.
 * This creates the effect of shots coming from the bunker's "barrel" or
 * firing position rather than its center.
 *
 * Index by: [bunkerKind][rotation]
 * - bunkerKind: 0=WALL, 1=DIFF, 2=GROUND, 3=FOLLOW, 4=GENERATOR
 * - rotation: 0-15 for static bunkers, 0-7 for animated bunkers
 */
export const xbshotstart: number[][] = [
  [2, 13, 18, 22, 24, 21, 16, 10, -2, -13, -18, -22, -24, -21, -16, -10],
  [0, 3, 15, 31, 24, 31, 17, 3, 0, -3, -15, -31, -24, -31, -17, -3],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [-4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]

export const ybshotstart: number[][] = [
  [-24, -21, -16, -10, 2, 13, 18, 22, 24, 21, 16, 10, -2, -13, -18, -22],
  [-24, -31, -17, -3, 0, 3, 15, 31, 24, 31, 17, 3, 0, -3, -15, -31],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [-3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3, -3],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]
