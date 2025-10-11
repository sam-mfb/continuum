import type { DrawableLine, DrawableShape, Frame } from './types'

export function drawFrameToCanvas(
  frame: Frame,
  canvas: CanvasRenderingContext2D
): void {
  // Sort drawables by z index (lower z draws first, so higher z appears on top)
  const sortedDrawables = [...frame.drawables].sort((a, b) => a.z - b.z)

  // Draw each drawable
  for (const drawable of sortedDrawables) {
    if (drawable.type === 'line') {
      drawLine(drawable, canvas)
    } else if (drawable.type === 'shape') {
      drawShape(drawable, canvas)
    }
  }
}

function drawLine(line: DrawableLine, canvas: CanvasRenderingContext2D): void {
  canvas.save()

  canvas.globalAlpha = line.alpha
  canvas.strokeStyle = line.color
  canvas.lineWidth = line.width

  canvas.beginPath()
  canvas.moveTo(line.start.x, line.start.y)
  canvas.lineTo(line.end.x, line.end.y)
  canvas.stroke()

  canvas.restore()
}

function drawShape(
  shape: DrawableShape,
  canvas: CanvasRenderingContext2D
): void {
  if (shape.points.length === 0) {
    return
  }

  canvas.save()

  canvas.globalAlpha = shape.alpha

  // Draw the shape path
  canvas.beginPath()
  const firstPoint = shape.points[0]
  if (!firstPoint) {
    return
  }
  canvas.moveTo(firstPoint.x, firstPoint.y)

  for (let i = 1; i < shape.points.length; i++) {
    const point = shape.points[i]
    if (!point) {
      continue
    }
    canvas.lineTo(point.x, point.y)
  }

  canvas.closePath()

  // Fill if fillColor is provided
  if (shape.fillColor) {
    canvas.fillStyle = shape.fillColor
    canvas.fill()
  }

  // Stroke if strokeColor and strokeWidth are provided
  if (shape.strokeColor && shape.strokeWidth > 0) {
    canvas.strokeStyle = shape.strokeColor
    canvas.lineWidth = shape.strokeWidth
    canvas.stroke()
  }

  canvas.restore()
}
