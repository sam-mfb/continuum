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
 * Collision radius constants
 * From orig/Sources/GW.h (lines 89-90)
 */
export const BRADIUS = 19 /* approx. radius of bunker for collision detection */

/**
 * Strafe constants
 * From orig/Sources/GW.h (lines 64, 124)
 */
export const NUMSTRAFES = 5 /* max strafes at once */
export const STRAFE_LIFE = 4 /* cycles strafes live */

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

/**
 * Bounce vectors for wall normal calculations
 * From orig/Sources/Play.c (line 289-290)
 *
 * These vectors represent the outward normal vectors for walls at 16 different angles.
 * Used in bounce physics calculations to reflect shot velocity.
 * The values are not unit vectors - they're scaled for integer math efficiency.
 *
 * To get the normal vector for a wall:
 * - x component: BOUNCE_VECS[strafedir]
 * - y component: BOUNCE_VECS[(strafedir + 12) & 15]
 * The y component is shifted by 12 (which is 270 degrees in the 16-direction system)
 * to get the perpendicular component.
 */
export const BOUNCE_VECS = [
  0, 18, 34, 44, 48, 44, 34, 18, 0, -18, -34, -44, -48, -44, -34, -18
] as const

/**
 * Strafe direction lookup tables
 * From orig/Sources/Terrain.c (lines 233-240)
 *
 * Used by getstrafedir() to determine sprite rotation based on:
 * - Wall slope and orientation
 * - Whether shot approaches from above or below
 * - Whether wall is bounce or standard type
 *
 * Index: [from_above][wall_slope + 5]
 * wall_slope ranges from -5 to 5 for different wall angles
 * -1 means no strafe effect for that angle
 */
export const bouncedirtable: number[][] = [
  [8, 7, 6, 5, -1, -1, -1, 11, 10, 9, 8], // From below
  [0, 15, 14, 13, -1, -1, -1, 3, 2, 1, 0] // From above
]

export const stdirtable: number[][] = [
  [8, 7, 6, 5, -1, -1, -1, -1, -1, 9, 8], // From below
  [-1, -1, -1, -1, -1, -1, -1, 3, 2, 1, -1] // From above
]
