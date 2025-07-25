import type { LineRec } from '../shared/types/line'

export type PlanetState = {
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
  lines: LineRec[]
  bunkers: Bunker[]
  fuels: Fuel[]
  craters: Crater[]
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
