export type Planet = {
  worldwidth: number
  worldheight: number
  worldwrap: boolean
  shootslow: number
  xstart: number
  ystart: number
  planetbonus: number
  gravx: number
  gravy: number
  numcraters: number
  lines: Line[]
  bunkers: Bunker[]
  fuels: Fuel[]
  craters: Crater[]
}

enum LineKind {
  NORMAL = 1,
  BOUNCE = 2,
  PHANTOM = 3,
  EXPLODE = 4
}

export enum LineType {
  N = 1, // North
  NNE = 2, // North-Northeast
  NE = 3, // Northeast
  ENE = 4, // East-Northeast
  E = 5 // East
}

export enum LineDirection {
  S = 1, // South (type 1, up_down = 1)
  SSE = 2, // South-Southeast (type 2, up_down = 1)
  SE = 3, // Southeast (type 3, up_down = 1)
  ESE = 4, // East-Southeast (type 4, up_down = 1)
  E = 5, // East (type 5, either up_down)
  ENE = 6, // East-Northeast (type 4, up_down = -1)
  NE = 7, // Northeast (type 3, up_down = -1)
  NNE = 8, // North-Northeast (type 2, up_down = -1)
  N = 9 // North (type 1, up_down = -1)
}

export type Line = {
  startx: number
  endx: number
  starty: number
  endy: number
  length: number
  up_down: number
  type: LineType
  kind: LineKind
  newType: LineDirection
}

export type Bunker = {
  x: number
  y: number
  rot: number
  ranges: BunkerRange[]
  alive: boolean
  kind: BunkerKind
}

export enum BunkerKind {
  NORMAL_SIT_ON_WALL = 0,
  DIFFERENT_AT_EACH_ORIENTATION = 1,
  NORMAL_SIT_ON_GROUND = 2,
  TRACKING = 3,
  GENERATOR = 4
}

export type BunkerRange = {
  low: number
  high: number
}

export type Fuel = {
  x: number
  y: number
  alive: boolean
  currentfig: number
  figcount: number
}

export type Crater = {
  x: number
  y: number
}
