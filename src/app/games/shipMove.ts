import type { GameLoopFunction } from '../components/GameView'
import { drawShip } from '../drawShip'

export const shipMoveGameLoop: GameLoopFunction = (ctx, _frame, env) => {
  // Draw the ship at the bottom, middle of the screen
  const shipX = env.width / 2
  const shipY = env.height - 40 // Position near bottom with some margin
  
  drawShip(ctx, shipX, shipY)
}