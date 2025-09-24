import type { GameLoopFunction } from '../components/GameView'

export const testGameLoop: GameLoopFunction = (ctx, frame, _keys, env) => {
  // Simple test pattern - draw a circle that moves based on time
  const centerX = env.width / 2
  const centerY = env.height / 2
  const radius = 50
  const angle = frame.totalTime * 0.001 // Rotate based on time

  // Draw rotating circle
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(
    centerX + Math.cos(angle) * 100,
    centerY + Math.sin(angle) * 100,
    radius,
    0,
    Math.PI * 2
  )
  ctx.stroke()

  // Draw center crosshair
  ctx.strokeStyle = '#666666'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(centerX - 20, centerY)
  ctx.lineTo(centerX + 20, centerY)
  ctx.moveTo(centerX, centerY - 20)
  ctx.lineTo(centerX, centerY + 20)
  ctx.stroke()

  // Draw a simple message
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Test Pattern', centerX, centerY)
  ctx.textAlign = 'left'
}
