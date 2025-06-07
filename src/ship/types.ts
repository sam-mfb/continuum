export type Ship = {
  init_ship: () => void
  ship_control: () => void
  move_ship: () => void
  gray_figure: () => void
  check_for_bounce: () => void
  check_figure: () => void
  kill_ship: () => void
  shift_figure: () => void
  full_figure: () => void
  erase_figure: () => void
  flame_on: () => void
}

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
  /** used for sound */
  thrusting: boolean
  firing: boolean
  bouncing: boolean
  refueling: boolean
  shielding: boolean
  dx: number
  dy: number
  cartooning: boolean
  // ship position relative to planet
  globalx: number
  globaly: number
  // ship position relative to screen
  shipx: number
  shipy: number
  // "left over" subpixel velocity from last move
  xslow: number
  yslow: number
}
