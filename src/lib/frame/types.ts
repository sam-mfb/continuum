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

type DrawableType = 'line' | 'shape' | 'sprite'

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
  points: DrawableShapePoint[]
  strokeColor: DrawableColor
  strokeWidth: number
  fillColor: DrawableColor
}

type DrawablePoint = {
  x: number
  y: number
}

type DrawableShapePoint = DrawablePoint & { strokeAfter?: boolean }

type DrawableColor = string

export type SpriteRegistryId = string

export type DrawableSprite = DrawableBase & {
  id: string
  spriteId: SpriteRegistryId
  rotation: number
  topLeft: DrawablePoint
}

export type SpriteRegistry<TSpriteFormat> = {
  addSprite: (args: { id: SpriteRegistryId; path: string }) => void
  getSprite: (id: SpriteRegistryId) => TSpriteFormat
}
