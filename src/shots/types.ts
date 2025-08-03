export type ShotsState = {
  shipshots: ShotRec[]
  bunkshots: ShotRec[]
  strafes: StrafeRec[]
}

/**
 * Ship bullet or bunker shot
 *
 * See GW.h:229-237
 */
export type ShotRec = {
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

/**
 * Strafe record structure
 * From orig/Sources/GW.h at straferec (line not specified in original)
 */
export type StrafeRec = {
  x: number
  y: number
  lifecount: number
  rot: number
}
