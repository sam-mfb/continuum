import type { GameLoopFunction } from '../components/GameView'

export const testGameLoop: GameLoopFunction = (ctx, frame, env) => {
  // Display frame info
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '14px monospace'
  ctx.fillText(`Frame: ${frame.frameCount}`, 10, 30)
  ctx.fillText(`Time: ${(frame.totalTime / 1000).toFixed(1)}s`, 10, 50)

  // Display pressed keys in center
  const keysArray = Array.from(frame.keysDown)
  if (keysArray.length > 0) {
    ctx.font = '20px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Keys pressed:', env.width / 2, env.height / 2 - 30)
    ctx.font = '16px monospace'
    keysArray.forEach((key, index) => {
      ctx.fillText(key, env.width / 2, env.height / 2 + index * 20)
    })
    ctx.textAlign = 'left'
  } else {
    ctx.font = '16px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#666666'
    ctx.fillText('(Press any key)', env.width / 2, env.height / 2)
    ctx.textAlign = 'left'
  }

  // Show new key presses this frame
  if (frame.keysPressed.size > 0) {
    ctx.fillStyle = '#00FF00'
    ctx.font = '12px monospace'
    ctx.fillText(
      `New: ${Array.from(frame.keysPressed).join(', ')}`,
      10,
      env.height - 20
    )
  }
}
