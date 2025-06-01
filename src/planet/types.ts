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

export type Line = {
  startx: number
  endx: number
  starty: number
  endy: number
  length: number
  up_down: number
  type: number
  kind: number
  newType: number
}

export type Bunker = {
  x: number
  y: number
  rot: number
  ranges: BunkerRange[]
  alive: boolean
  kind: number
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
