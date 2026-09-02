/**
 * Type representing the an animation frame of a given size
 * with specific objects inside it
 */
export type Frame = {
  width: number
  height: number
  drawables: Drawable[]
}

export type Drawable =
  | DrawableLine
  | DrawableRect
  | DrawableShape
  | DrawableSprite
  | DrawablePixel
  | DrawableBitmap

type DrawableType = 'line' | 'rect' | 'shape' | 'sprite' | 'pixel' | 'bitmap'

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

export type DrawablePixel = DrawableBase & {
  type: 'pixel'
  point: DrawablePoint
  color: DrawableColor
}

/**
 * A block of pixels blitted in one operation - for layers that cover a large
 * area and change every frame, where a drawable per pixel would not be
 * affordable (the fizz dissolve). Transparent pixels let lower layers show
 * through. The renderer reads the pixel data on every draw, so the owner may
 * keep mutating the same ImageData between frames.
 */
export type DrawableBitmap = DrawableBase & {
  type: 'bitmap'
  topLeft: DrawablePoint
  imageData: ImageData
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
