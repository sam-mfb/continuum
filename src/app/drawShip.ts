const SHIP_HEIGHT = 32
const SHIP_COLOR = 'white'

/**
 * Draw the player's ship on the canvas
 * Ship is drawn as an equilateral triangle pointing upward
 *
 * Math explanation from original code:
 * For an equilateral triangle with height h:
 * - Base width = 2h/√3
 * - Each half of base = h/√3
 */
export const drawShip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void => {
  console.log(x, y)

  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = SHIP_COLOR

  // Calculate triangle points
  const halfBase = SHIP_HEIGHT / Math.sqrt(3)

  ctx.beginPath()
  // Top point
  ctx.moveTo(x, y - SHIP_HEIGHT / 2)
  // Bottom right
  ctx.lineTo(x + halfBase, y + SHIP_HEIGHT / 2)
  // Bottom left
  ctx.lineTo(x - halfBase, y + SHIP_HEIGHT / 2)
  // Back to top
  ctx.lineTo(x, y - SHIP_HEIGHT / 2)
  ctx.stroke()

  ctx.restore()
}
