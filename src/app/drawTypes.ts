// Type definitions for drawing functions
// Based on the original Continuum game data structures

export type Bunker = {
  x: number
  y: number
  rot: number
  ranges: Array<{ low: number; high: number }>
  alive: boolean
  kind: number
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

export type BunkerAngles = {
  start: number
  end: number
}

export enum BunkerKind {
  NORMAL_SIT_ON_WALL = 0,
  DIFFERENT_AT_EACH_ORIENTATION = 1,
  NORMAL_SIT_ON_GROUND = 2,
  TRACKING = 3,
  GENERATOR = 4
}

export const BUNKER_COLORS: Record<BunkerKind, string> = {
  [BunkerKind.NORMAL_SIT_ON_WALL]: 'red',
  [BunkerKind.DIFFERENT_AT_EACH_ORIENTATION]: 'pink',
  [BunkerKind.NORMAL_SIT_ON_GROUND]: 'orange',
  [BunkerKind.TRACKING]: 'purple',
  [BunkerKind.GENERATOR]: 'gray'
}
