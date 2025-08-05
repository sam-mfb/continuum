/**
 * Explosion constants from GW.h
 */

// Shard constants
export const NUMSHARDS = 15 // maximum # of concurrent shards
export const EXPLSHARDS = 5 // number of shards in bunker death
export const SH_DISTRIB = 20 // size of shard starting area
export const SH_LIFE = 25 // cycles shard stays alive
export const SH_ADDLIFE = 15 // added cycles shard stays alive
export const SH_SPEED = 32 // speed factor of shard (*256)
export const SH_ADDSPEED = 16 // possible amount over above
export const SH_SLOW = 5 // slow factor (0=stop, 1=1/2...)
export const SH_SPIN2 = 64 // max speed of shard spin (*2*16)
export const SHARDHT = 8 // height of shard sprites (assumed)

// Spark constants
export const NUMSPARKS = 100 // number of sparks in explosions
export const SHIPSPARKS = NUMSPARKS // number of sparks in ship blowup
export const EXPLSPARKS = 20 // number of sparks in bunker death
export const SPARKLIFE = 10 // minimum life of bunker spark
export const SPADDLIFE = 20 // possible longer than SPARKLIFE
export const SH_SPARKLIFE = 35 // minimum life of ship spark
export const SH_SPADDLIFE = 20 // possible longer than SPARKLIFE
export const SP_SPEED16 = 8 // base speed factor of bunker spark (*16)
export const SH_SP_SPEED16 = 50 // speed factor of ship spark (*16)

// Gravity for explosions
export const EXPLGRAV = 5 // gravity factor for shards

// Shot vectors for explosion directions (from Play.c)
export const shotvecs = [
  0, 14, 27, 40, 51, 60, 67, 71, 72, 71, 67, 60, 51, 40, 27, 14, 0, -14, -27,
  -40, -51, -60, -67, -71, -72, -71, -67, -60, -51, -40, -27, -14
]
