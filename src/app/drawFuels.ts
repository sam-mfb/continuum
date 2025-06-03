import type { Fuel } from './drawTypes'

const FUEL_RADIUS = 12
const FUEL_COLOR = 'white'

/**
 * Draw fuel cells on the canvas
 * Fuel cells are drawn as white filled circles
 */
export const drawFuels = (
  ctx: CanvasRenderingContext2D,
  fuels: Fuel[]
): void => {
  ctx.save()
  ctx.lineWidth = 1
  ctx.fillStyle = FUEL_COLOR

  fuels.forEach(fuel => {
    ctx.beginPath()
    ctx.arc(fuel.x, fuel.y, FUEL_RADIUS, 0, 2 * Math.PI)
    ctx.fill()
  })

  ctx.restore()
}
