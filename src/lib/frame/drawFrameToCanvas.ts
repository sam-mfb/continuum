import type {
  DrawableLine,
  DrawableRect,
  DrawableShape,
  DrawableSprite,
  DrawablePixel,
  Frame,
  PatternTileCache,
  SpriteCanvasCache,
  SpriteRegistry
} from './types'

/**
 * Builds the sprite canvas cache that drawFrameToCanvas blits through.
 *
 * Create one alongside the canvas being drawn to and pass the same one every
 * frame; the caller owns it, so drawFrameToCanvas keeps no state of its own.
 */
export function createSpriteCanvasCache(): SpriteCanvasCache {
  return { cache: new WeakMap() }
}

/** Builds the crosshatch tile cache, caller-owned on the same terms. */
export function createPatternTileCache(): PatternTileCache {
  return { cache: new Map() }
}

export function drawFrameToCanvas(
  frame: Frame,
  canvas: CanvasRenderingContext2D,
  scale: number,
  spriteRegistry: SpriteRegistry<ImageData>,
  spriteCanvasCache: SpriteCanvasCache,
  patternTileCache: PatternTileCache,
  debug?: boolean
): void {
  // Sort drawables by z index (lower z draws first, so higher z appears on top)
  const sortedDrawables = [...frame.drawables].sort((a, b) => a.z - b.z)

  // Draw each drawable
  for (const drawable of sortedDrawables) {
    switch (drawable.type) {
      case 'line':
        drawLine(drawable, canvas, scale, debug ?? false)
        break
      case 'rect':
        drawRect(drawable, canvas, scale, patternTileCache, debug ?? false)
        break
      case 'shape':
        drawShape(drawable, canvas, scale, debug ?? false)
        break
      case 'sprite':
        drawSprite(
          drawable,
          canvas,
          scale,
          spriteRegistry,
          spriteCanvasCache,
          debug ?? false
        )
        break
      case 'pixel':
        drawPixel(drawable, canvas, scale, debug ?? false)
        break
    }
  }
}

function drawLine(
  line: DrawableLine,
  canvas: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
): void {
  canvas.save()

  canvas.globalAlpha = debug ? 0.7 * line.alpha : line.alpha
  canvas.strokeStyle = debug ? 'pink' : line.color
  canvas.lineWidth = line.width * scale

  canvas.beginPath()
  canvas.moveTo(line.start.x * scale, line.start.y * scale)
  canvas.lineTo(line.end.x * scale, line.end.y * scale)
  canvas.stroke()

  canvas.restore()
}

function drawRect(
  rect: DrawableRect,
  canvas: CanvasRenderingContext2D,
  scale: number,
  patternTileCache: PatternTileCache,
  debug: boolean
): void {
  canvas.save()

  canvas.globalAlpha = debug ? 0.7 * rect.alpha : rect.alpha

  if (rect.fillPattern === 'crosshatch') {
    const patternCanvas = getPatternTile(
      patternTileCache,
      rect.patternAlignment ?? 0,
      scale
    )
    const pattern = canvas.createPattern(patternCanvas, 'repeat')!
    canvas.fillStyle = pattern
  } else {
    canvas.fillStyle = debug ? 'cyan' : rect.fillColor
  }

  canvas.fillRect(
    rect.topLeft.x * scale,
    rect.topLeft.y * scale,
    rect.width * scale,
    rect.height * scale
  )

  canvas.restore()
}

function drawShape(
  shape: DrawableShape,
  canvas: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
): void {
  if (shape.points.length === 0) {
    return
  }

  canvas.save()

  canvas.globalAlpha = debug ? 0.7 * shape.alpha : shape.alpha

  // Draw the shape path for filling
  canvas.beginPath()
  const firstPoint = shape.points[0]
  if (!firstPoint) {
    return
  }
  canvas.moveTo(firstPoint.x * scale, firstPoint.y * scale)

  for (let i = 1; i < shape.points.length; i++) {
    const point = shape.points[i]
    if (!point) {
      continue
    }
    canvas.lineTo(point.x * scale, point.y * scale)
  }

  canvas.closePath()

  // Fill if fillColor is provided
  if (shape.fillColor) {
    canvas.fillStyle = debug ? 'yellow' : shape.fillColor
    canvas.fill()
  }

  // Stroke edges individually based on strokeAfter flags
  if (shape.strokeColor && shape.strokeWidth > 0) {
    canvas.strokeStyle = debug ? 'red' : shape.strokeColor
    canvas.lineWidth = shape.strokeWidth * scale

    for (let i = 0; i < shape.points.length; i++) {
      const point = shape.points[i]
      const nextPoint = shape.points[(i + 1) % shape.points.length]

      if (!point || !nextPoint) {
        continue
      }

      // Default to stroking if strokeAfter is not specified
      const shouldStroke = point.strokeAfter ?? true

      if (shouldStroke) {
        canvas.beginPath()
        canvas.moveTo(point.x * scale, point.y * scale)
        canvas.lineTo(nextPoint.x * scale, nextPoint.y * scale)
        canvas.stroke()
      }
    }
  }

  canvas.restore()
}

function drawSprite(
  sprite: DrawableSprite,
  canvas: CanvasRenderingContext2D,
  scale: number,
  spriteRegistry: SpriteRegistry<ImageData>,
  spriteCanvasCache: SpriteCanvasCache,
  debug: boolean
): void {
  const imageData = spriteRegistry.getSprite(sprite.spriteId)

  canvas.save()

  canvas.globalAlpha = debug ? 0.7 * sprite.alpha : sprite.alpha

  // Translate to the sprite position
  canvas.translate(sprite.topLeft.x * scale, sprite.topLeft.y * scale)

  // Apply rotation if needed
  if (sprite.rotation !== 0) {
    // Rotate around the center of the sprite
    const centerX = (imageData.width / 2) * scale
    const centerY = (imageData.height / 2) * scale
    canvas.translate(centerX, centerY)
    canvas.rotate(sprite.rotation)
    canvas.translate(-centerX, -centerY)
  }

  // Blit from the cached canvas for this sprite (and color override, e.g.
  // for shadows) - built once per sprite, not once per draw
  const spriteCanvas = getSpriteCanvas(
    spriteCanvasCache,
    imageData,
    sprite.colorOverride
  )

  // Draw the sprite with scaling
  canvas.drawImage(
    spriteCanvas,
    0,
    0,
    imageData.width * scale,
    imageData.height * scale
  )

  // Apply red tint in debug mode
  if (debug) {
    canvas.globalCompositeOperation = 'multiply'
    canvas.fillStyle = 'rgba(255, 100, 100, 1)'
    canvas.fillRect(0, 0, imageData.width * scale, imageData.height * scale)
    canvas.globalCompositeOperation = 'source-over'
  }

  canvas.restore()
}

function drawPixel(
  pixel: DrawablePixel,
  canvas: CanvasRenderingContext2D,
  scale: number,
  debug: boolean
): void {
  canvas.save()

  canvas.globalAlpha = debug ? 0.7 * pixel.alpha : pixel.alpha
  canvas.fillStyle = debug ? 'lime' : pixel.color

  // Draw a single pixel as a scaled rectangle
  canvas.fillRect(pixel.point.x * scale, pixel.point.y * scale, scale, scale)

  canvas.restore()
}

/**
 * Returns the scratch canvas holding this sprite, building it on first use.
 *
 * Sprites are blitted from a canvas rather than from their ImageData directly
 * (the 2D context can only putImageData at 1:1, ignoring scale and
 * transforms). Building that canvas per draw churns through canvas backing
 * stores - at 20fps, hundreds a second - which shows up as stalls mid-game,
 * so each one is built once and kept in the caller's cache.
 */
function getSpriteCanvas(
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

/**
 * Returns the crosshatch tile for this alignment and scale, building it on
 * first use. Cached for the same reason sprite canvases are.
 */
function getPatternTile(
  patternTileCache: PatternTileCache,
  alignment: number,
  scale: number
): HTMLCanvasElement {
  const key = `${alignment}-${scale}`
  const cached = patternTileCache.cache.get(key)
  if (cached) return cached

  // Build the tile at 1:1 first, then scale it up
  const unscaledCanvas = document.createElement('canvas')
  unscaledCanvas.width = 32
  unscaledCanvas.height = 2
  const unscaledCtx = unscaledCanvas.getContext('2d')!
  const patternData = unscaledCtx.createImageData(32, 2)

  // Pattern 0: 0xaaaaaaaa (binary: 10101010...) - alternating pixels horizontally
  // Pattern 1: 0x55555555 (binary: 01010101...) - inverse alternating pixels
  // The pattern alternates by scanline (row), creating a diagonal checkerboard
  const firstPattern = alignment === 0 ? 0xaaaaaaaa : 0x55555555
  const secondPattern = alignment === 0 ? 0x55555555 : 0xaaaaaaaa

  // Fill first row (32 pixels using firstPattern)
  for (let x = 0; x < 32; x++) {
    const bit = (firstPattern >>> (31 - x)) & 1
    const color = bit ? 0 : 255 // bit 1 = black, bit 0 = white
    const idx = x * 4
    patternData.data[idx] = color // R
    patternData.data[idx + 1] = color // G
    patternData.data[idx + 2] = color // B
    patternData.data[idx + 3] = 255 // A
  }

  // Fill second row (32 pixels using secondPattern)
  for (let x = 0; x < 32; x++) {
    const bit = (secondPattern >>> (31 - x)) & 1
    const color = bit ? 0 : 255 // bit 1 = black, bit 0 = white
    const idx = (32 + x) * 4 // Second row starts at pixel 32
    patternData.data[idx] = color // R
    patternData.data[idx + 1] = color // G
    patternData.data[idx + 2] = color // B
    patternData.data[idx + 3] = 255 // A
  }

  unscaledCtx.putImageData(patternData, 0, 0)

  const patternCanvas = document.createElement('canvas')
  patternCanvas.width = 32 * scale // Scale the pattern width
  patternCanvas.height = 2 * scale // Scale the pattern height
  const patternCtx = patternCanvas.getContext('2d')!
  patternCtx.imageSmoothingEnabled = false // Keep pixels crisp
  patternCtx.drawImage(unscaledCanvas, 0, 0, 32 * scale, 2 * scale)

  patternTileCache.cache.set(key, patternCanvas)
  return patternCanvas
}
