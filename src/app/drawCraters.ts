import type { Crater } from './drawTypes'

const CRATER_RADIUS = 6
const CRATER_COLOR = 'gray'

/**
 * Draw craters on the canvas
 * Craters are drawn as gray filled circles
 */
export const drawCraters = (
  ctx: CanvasRenderingContext2D,
  craters: Crater[]
): void => {
  ctx.save()
  ctx.lineWidth = 1
  ctx.fillStyle = CRATER_COLOR

  craters.forEach(crater => {
    ctx.beginPath()
    ctx.arc(crater.x, crater.y, CRATER_RADIUS, 0, 2 * Math.PI)
    ctx.fill()
  })

  ctx.restore()
}
