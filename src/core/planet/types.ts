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
  wallsSorted: boolean // Debug flag: true if walls were sorted by startx after loading
}

export type Bunker = {
  x: number
  y: number
  rot: number
  rotcount?: number // Animation counter for rotating bunkers
  ranges: BunkerRange[]
  alive: boolean
  kind: BunkerKind
}

export enum BunkerKind {
  WALL = 0,
  DIFF = 1,
  GROUND = 2,
  FOLLOW = 3,
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
