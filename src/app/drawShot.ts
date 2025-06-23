const SHOT_SIZE = 3
const SHOT_COLOR = 'white'

/**
 * Draw a bullet/shot on the canvas
 * Based on the original game's 3x3 pixel squares
 *
 * @param ctx - Canvas rendering context
 * @param x - X position of shot center
 * @param y - Y position of shot center
 */
export const drawShot = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void => {
  ctx.fillStyle = SHOT_COLOR
  // Draw 3x3 square centered at x,y
  // Offset by 1 to center (3x3 has center at offset 1)
  ctx.fillRect(x - 1, y - 1, SHOT_SIZE, SHOT_SIZE)
}
