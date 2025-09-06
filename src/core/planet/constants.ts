export const PLANET = {
  NUMLINES: 125,
  NUMBUNKERS: 25,
  NUMFUELS: 15,
  NUMPRECRATS: 25,
  NUMCRATERS: 50
}

// Fuel cell constants from GW.h
export const FUELCENTER = 16 // center of top from top left
export const CRATERCENTER = 16 // center of crater from top left

/**
 * Bunker center positions for different bunker types and rotations
 * From orig/Sources/Figs.c at xbcenter (line 103) and ybcenter (line 111)
 *
 * These arrays define the center point of each bunker sprite relative to
 * the top-left corner of the 48x48 sprite. The bunker's world position
 * represents where this center point should be placed.
 *
 * Index by: [bunkerKind][rotation]
 * - bunkerKind: 0=WALL, 1=DIFF, 2=GROUND, 3=FOLLOW, 4=GENERATOR
 * - rotation: 0-15 for static bunkers, 0-7 for animated bunkers
 */
export const xbcenter: number[][] = [
  [24, 24, 24, 23, 22, 22, 22, 24, 24, 24, 24, 25, 26, 26, 26, 24],
  [25, 22, 21, 14, 10, 13, 18, 22, 23, 26, 27, 34, 38, 35, 30, 26],
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24]
]

export const ybcenter: number[][] = [
  [26, 26, 26, 24, 24, 24, 24, 23, 22, 22, 22, 24, 24, 24, 24, 25],
  [38, 35, 30, 26, 25, 22, 21, 14, 10, 13, 18, 22, 23, 26, 27, 34],
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24],
  [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24]
]
