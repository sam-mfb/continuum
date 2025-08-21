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
  /**
   * Flag indicating the shot just died this frame and needs final render.
   * 
   * This is needed because the original C code rendered shots in the same
   * loop iteration where lifecount dropped to 0. Our Redux architecture
   * separates state updates from rendering, so we need to preserve the
   * "just died" state for one frame to match the original's visual behavior.
   * 
   * Shots should be rendered when:
   * - lifecount > 0 (normal active shot), OR
   * - justDied === true && strafedir < 0 (final frame, no strafe replacement)
   * 
   * We don't render justDied shots with strafedir >= 0 because those are
   * replaced by strafe visual effects.
   */
  justDied: boolean
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
