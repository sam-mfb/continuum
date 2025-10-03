import type { Collision } from './constants'

/** type representing values of Collision **/
export type CollisionType = (typeof Collision)[keyof typeof Collision]

/** Coordinate map of collisions in x,y cordinate **/
export type CollisionMap = CollisionType[][]

/** a point that can collide **/
export type CollisionPoint = { x: number; y: number; collision: CollisionType }

/** an item (collection of points) that can collide */
export type CollisionItem = CollisionPoint[]

/** a line that can collided */
export type CollisionLine = {
  startPoint: CollisionPoint
  endPoint: CollisionPoint
  collision: CollisionType
  width: number
}

export type CollisionService = {
  /** resets the collision map to its initialized value **/
  reset: () => void

  /** add a point to the map with a given collision value **/
  addPoint: (point: CollisionPoint) => void

  /** add an item to the map with a given collision value **/
  addItem: (item: CollisionItem) => void

  /** ad a line to the map with a given collision value **/
  //addLine: (line: CollisionLine) => void

  /** returns collision value for a given point */
  checkPoint: (point: CollisionPoint) => CollisionType

  /**
   * returns the high priority collision of the object
   * where priority is LETHAL, BOUNCE, NONE
   *
   * so if any pixel returns LETHAL this function will
   * return lethal, etc.
   */
  checkItem: (item: CollisionItem) => CollisionType
}
