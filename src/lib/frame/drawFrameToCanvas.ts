import type {
  DrawableLine,
  DrawableShape,
  DrawableSprite,
  Frame,
  SpriteRegistry
} from './types'

export function drawFrameToCanvas(
  frame: Frame,
  canvas: CanvasRenderingContext2D,
  scale: number,
  spriteRegistry: SpriteRegistry<ImageData>,
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
      case 'shape':
        drawShape(drawable, canvas, scale, debug ?? false)
        break
      case 'sprite':
        drawSprite(drawable, canvas, scale, spriteRegistry, debug ?? false)
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

  // Create a temporary canvas to draw the ImageData
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.putImageData(imageData, 0, 0)

  // Draw the sprite with scaling
  canvas.drawImage(
    tempCanvas,
    0,
    0,
    imageData.width * scale,
    imageData.height * scale
  )

  // Apply color override (e.g., for shadows)
  if (sprite.colorOverride) {
    canvas.globalCompositeOperation = 'source-in'
    canvas.fillStyle = sprite.colorOverride
    canvas.fillRect(0, 0, imageData.width * scale, imageData.height * scale)
    canvas.globalCompositeOperation = 'source-over'
  }

  // Apply red tint in debug mode
  if (debug) {
    canvas.globalCompositeOperation = 'multiply'
    canvas.fillStyle = 'rgba(255, 100, 100, 1)'
    canvas.fillRect(0, 0, imageData.width * scale, imageData.height * scale)
    canvas.globalCompositeOperation = 'source-over'
  }

  canvas.restore()
}
