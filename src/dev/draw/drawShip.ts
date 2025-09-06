const SHIP_HEIGHT = 32
const SHIP_COLOR = 'white'

/**
 * Draw the player's ship on the canvas
 * Ship is drawn as an equilateral triangle
 *
 * @param ctx - Canvas rendering context
 * @param x - X position of ship center
 * @param y - Y position of ship center
 * @param rotation - Ship rotation (0-31, where 0 is up, 8 is right, 16 is down, 24 is left)
 *
 * Math explanation from original code:
 * For an equilateral triangle with height h:
 * - Base width = 2h/√3
 * - Each half of base = h/√3
 */
export const drawShip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number
): void => {
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = SHIP_COLOR

  // Translate to ship position and rotate
  ctx.translate(x, y)
  // Convert rotation (0-31) to radians: rotation * (2π/32)
  ctx.rotate(rotation * (Math.PI / 16))

  // Calculate triangle points
  const halfBase = SHIP_HEIGHT / Math.sqrt(3)

  ctx.beginPath()
  // Top point (nose of ship)
  ctx.moveTo(0, -SHIP_HEIGHT / 2)
  // Bottom right
  ctx.lineTo(halfBase, SHIP_HEIGHT / 2)
  // Bottom left
  ctx.lineTo(-halfBase, SHIP_HEIGHT / 2)
  ctx.closePath()
  ctx.stroke()

  ctx.restore()
}
