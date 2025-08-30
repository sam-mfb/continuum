export enum ShipControl {
  LEFT = 0,
  RIGHT,
  THRUST,
  SHIELD,
  FIRE
}

export type ShipState = {
  /** between 0 and 31 */
  shiprot: number
  fuel: number
  /** used for animation */
  flaming: boolean
  flameBlink: number
  /** used for sound */
  thrusting: boolean
  firing: boolean
  bouncing: boolean
  refueling: boolean
  shielding: boolean
  dx: number
  dy: number
  cartooning: boolean
  // ship position relative to screen
  shipx: number
  shipy: number
  // "left over" subpixel velocity from last move
  xslow: number
  yslow: number
  // Last safe position before bouncing
  unbouncex: number
  unbouncey: number
}
