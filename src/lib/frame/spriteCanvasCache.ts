/**
 * @fileoverview Cache of the scratch canvases sprites are blitted from.
 *
 * Sprites are blitted from a canvas rather than from their ImageData directly
 * (the 2D context can only putImageData at 1:1, ignoring scale and
 * transforms). Building that canvas per draw churns through canvas backing
 * stores - at 20fps, hundreds a second - which shows up as stalls mid-game,
 * so each one is built once and kept here.
 */

/**
 * Sprite canvases the renderer blits from, built once per sprite.
 *
 * Keyed by the registry's ImageData so entries are collectable once sprites
 * are unloaded; the inner key is the color override (shadows tint a copy).
 *
 * Owned by whoever calls drawFrameToCanvas - create one alongside the canvas
 * being drawn to and pass the same one every frame, so the draw function
 * itself holds no state.
 */
export type SpriteCanvasCache = {
  cache: WeakMap<ImageData, Map<string, HTMLCanvasElement>>
}

export function createSpriteCanvasCache(): SpriteCanvasCache {
  return { cache: new WeakMap() }
}

/** Returns the canvas holding this sprite, building it on first use. */
export function getSpriteCanvas(
  spriteCanvasCache: SpriteCanvasCache,
  imageData: ImageData,
  colorOverride: string | undefined
): HTMLCanvasElement {
  let byColor = spriteCanvasCache.cache.get(imageData)
  if (!byColor) {
    byColor = new Map()
    spriteCanvasCache.cache.set(imageData, byColor)
  }

  const key = colorOverride ?? ''
  const cached = byColor.get(key)
  if (cached) return cached

  const spriteCanvas = document.createElement('canvas')
  spriteCanvas.width = imageData.width
  spriteCanvas.height = imageData.height
  const spriteCtx = spriteCanvas.getContext('2d')!
  spriteCtx.putImageData(imageData, 0, 0)

  if (colorOverride) {
    spriteCtx.globalCompositeOperation = 'source-in'
    spriteCtx.fillStyle = colorOverride
    spriteCtx.fillRect(0, 0, imageData.width, imageData.height)
  }

  byColor.set(key, spriteCanvas)
  return spriteCanvas
}
