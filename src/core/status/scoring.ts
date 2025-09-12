/**
 * @fileoverview Scoring constants and utilities
 * Based on score values from orig/Sources/Play.c:354-355
 */

import { BunkerKind } from '@core/figs/types'

// Score values for bunker destruction (Play.c:354)
// static int kindscores[5] = {100, 0, 100, 400, 500}
const BUNKER_KIND_SCORES = [
  100, // WALLBUNK (0)
  0, // DIFFBUNK (1) - uses special scoring
  100, // GROUNDBUNK (2)
  400, // FOLLOWBUNK (3)
  500 // GENERATORBUNK (4)
] as const

// Score values for difficult bunkers by rotation (Play.c:355)
// diffscores[4] = {10, 200, 300, 200}
const DIFFBUNK_SCORES = [
  10, // rot & 3 == 0
  200, // rot & 3 == 1
  300, // rot & 3 == 2 (the hard one that takes 3 hits)
  200 // rot & 3 == 3
] as const

// Score for fuel collection (GW.h:145)
export const SCORE_FUEL = 15

/**
 * Get the score value for destroying a bunker
 * Based on Play.c:365-366
 * score_plus(bp->kind == DIFFBUNK ? diffscores[bp->rot & 3] : kindscores[bp->kind])
 */
export function getBunkerScore(kind: BunkerKind, rot: number): number {
  if (kind === BunkerKind.DIFF) {
    return DIFFBUNK_SCORES[rot & 3]!
  }
  return BUNKER_KIND_SCORES[kind] ?? 0
}
