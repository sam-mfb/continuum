import type { DrawableLine, DrawableShape, Frame } from './types'

export function drawFrameToCanvas(
  frame: Frame,
  canvas: CanvasRenderingContext2D,
  scale: number,
  debug?: boolean
): void {
  // Sort drawables by z index (lower z draws first, so higher z appears on top)
  const sortedDrawables = [...frame.drawables].sort((a, b) => a.z - b.z)

  // Draw each drawable
  for (const drawable of sortedDrawables) {
    if (drawable.type === 'line') {
      drawLine(drawable, canvas, scale, debug ?? false)
    } else if (drawable.type === 'shape') {
      drawShape(drawable, canvas, scale, debug ?? false)
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
