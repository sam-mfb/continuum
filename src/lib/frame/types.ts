/**
 * Type representing the an animation frame of a given size
 * with specific objects inside it
 */
export type Frame = {
  width: number
  height: number
  drawables: Drawable[]
}

type Drawable = DrawableLine | DrawableShape

type DrawableType = 'line' | 'shape'

type DrawableBase = {
  id: string
  z: number
  type: DrawableType
  alpha: number
}

export type DrawableLine = DrawableBase & {
  type: 'line'
  start: DrawablePoint
  end: DrawablePoint
  width: number
  color: DrawableColor
}

export type DrawableShape = DrawableBase & {
  type: 'shape'
  points: DrawablePoint[]
  strokeColor: DrawableColor
  strokeWidth: number
  fillColor: DrawableColor
}

type DrawablePoint = {
  x: number
  y: number
}

type DrawableColor = string
