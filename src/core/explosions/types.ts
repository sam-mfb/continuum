export type ExplosionsState = {
  shards: ShardRec[]
  sparks: SparkRec[]
  totalsparks: number
  sparksalive: number
  // White screen flash on ship death (orig: set_screen in Terrain.c:413)
  // Note it needs to be set to one more than what is desired because the
  // first one gets consume in the final "death frame" of the ship
  shipDeathFlashFrames: number
}

/**
 * Shard (debris) record for explosions
 *
 * See GW.h:270-277
 */
export type ShardRec = {
  /** global x, y of center */
  x: number
  y: number
  /** vertical and horizontal speed * 8 */
  h: number
  v: number
  /** current rotation * 16 (0-255) */
  rot16: number
  /** added to rot16 every cycle */
  rotspeed: number
  /** countdown to disappearance */
  lifecount: number
  /** which image (bunker type it came from) */
  kind: number
}

/**
 * Spark (particle) record for explosions
 *
 * Note: Original game reused ShotRec for sparks, but we use a dedicated
 * type for clarity. The fields map to the ShotRec fields used for sparks.
 */
export type SparkRec = {
  /** current global x,y of spark */
  x: number
  y: number
  /** subpixel precision version */
  x8: number
  y8: number
  /** spark life (in frames) remaining */
  lifecount: number
  /** vert and horiz speed *8 for precision */
  v: number
  h: number
}
