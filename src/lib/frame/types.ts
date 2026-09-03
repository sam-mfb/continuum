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

type DrawableType = 'line' | 'rect' | 'shape' | 'sprite' | 'pixel'

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

/**
 * Sprite canvases the renderer blits from, built once per sprite.
 *
 * Keyed by the registry's ImageData so entries are collectable once sprites
 * are unloaded; the inner key is the color override (shadows tint a copy).
 *
 * Owned by whoever calls drawFrameToCanvas - create one alongside the canvas
 * being drawn to (see createSpriteCanvasCache) and pass the same one every
 * frame, so the draw function itself holds no state.
 */
export type SpriteCanvasCache = {
  cache: WeakMap<ImageData, Map<string, HTMLCanvasElement>>
}

/**
 * Crosshatch tiles the renderer fills from, keyed by alignment and scale.
 * Caller-owned on the same terms as SpriteCanvasCache.
 */
export type PatternTileCache = {
  cache: Map<string, HTMLCanvasElement>
}
