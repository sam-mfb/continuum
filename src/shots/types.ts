export type ShotsState = {
  shipshots: ShotRec[]
  bunkshots: ShotRec[]
}

/**
 * Ship bullet or bunker shot
 *
 * See GW.h:229-237
 */
export type ShotRec = {
  id: string /* not in original*/
  /** current global x,y of shot */
  x: number
  y: number
  /** subpixel precision version */
  x8: number
  y8: number
  /** shot life (in frames) remaining) */
  lifecount: number
  /** vert and horiz speed *8 for precision */
  v: number
  h: number
  /** rotation of strafe (-1 if none) */
  strafedir: number
  /** cycles to go after bouncing */
  btime: number
  /** id of line that it hits (ref in original */
  hitlineId: string /* not in original (which used pointer) */
}
