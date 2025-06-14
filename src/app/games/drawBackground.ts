import { SCRWTH, VIEWHT } from '@/screen/constants'

/**
 * Draw a grid background to help visualize movement and world boundaries
 * @param ctx - Canvas rendering context
 * @param screenx - X position of viewport in world
 * @param screeny - Y position of viewport in world
 * @param worldwidth - Width of the world
 * @param worldheight - Height of the world
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  screenx: number,
  screeny: number,
  worldwidth: number,
  worldheight: number
): void {
  ctx.save()

  // Clear background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, SCRWTH, VIEWHT)

  // Set grid style
  ctx.strokeStyle = '#333333' // Light gray
  ctx.lineWidth = 1

  // Grid spacing
  const gridSize = 50

  // Calculate grid offset based on screen position
  const offsetX = -(screenx % gridSize)
  const offsetY = -(screeny % gridSize)

  // Draw vertical lines
  for (let x = offsetX; x <= SCRWTH; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEWHT)
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = offsetY; y <= VIEWHT; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(SCRWTH, y)
    ctx.stroke()
  }

  // Draw world boundaries if visible
  ctx.strokeStyle = '#ff0000' // Red for world boundaries
  ctx.lineWidth = 2

  // Left boundary
  if (screenx <= 0) {
    const x = -screenx
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEWHT)
    ctx.stroke()
  }

  // Right boundary
  if (screenx + SCRWTH >= worldwidth) {
    const x = worldwidth - screenx
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, VIEWHT)
    ctx.stroke()
  }

  // Top boundary
  if (screeny <= 0) {
    const y = -screeny
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(SCRWTH, y)
    ctx.stroke()
  }

  // Bottom boundary
  if (screeny + VIEWHT >= worldheight) {
    const y = worldheight - screeny
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(SCRWTH, y)
    ctx.stroke()
  }

  // Draw coordinate info
  ctx.fillStyle = '#666666'
  ctx.font = '12px monospace'
  ctx.fillText(
    `Screen: (${Math.round(screenx)}, ${Math.round(screeny)})`,
    10,
    20
  )
  ctx.fillText(`World: ${worldwidth}x${worldheight}`, 10, 35)

  ctx.restore()
}
