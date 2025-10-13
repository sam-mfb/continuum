/**
 * Type representing the an animation frame of a given size
 * with specific objects inside it
 */
export type Frame = {
  width: number
  height: number
  drawables: Drawable[]
}

type Drawable = DrawableLine | DrawableRect | DrawableShape | DrawableSprite

type DrawableType = 'line' | 'rect' | 'shape' | 'sprite'

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

export type DrawableRect = DrawableBase & {
  type: 'rect'
  topLeft: DrawablePoint
  width: number
  height: number
  fillColor: DrawableColor
  fillPattern?: 'crosshatch'
  patternAlignment?: number
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
  type: 'sprite'
  id: string
  spriteId: SpriteRegistryId
  rotation: number
  topLeft: DrawablePoint
  colorOverride?: string
}

export type SpriteRegistry<TSpriteFormat> = {
  addSprite: (args: { id: SpriteRegistryId; path: string }) => void
  getSprite: (id: SpriteRegistryId) => TSpriteFormat
  loadSprites: () => Promise<void>
  unloadSprites: () => void
}
