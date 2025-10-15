import { SBARHT } from '@/core/screen'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'

const SHADOW_OFFSET_X = 8
const SHADOW_OFFSET_Y = 5

const FCENTER = 12

// From orig/Sources/Draw.c:467-469
const flamexdisp = [
  0, -1, -3, -4, -7, -8, -9, -9, -10, -9, -9, -8, -7, -4, -3, -1, 0, 1, 3, 4, 7,
  8, 9, 9, 10, 9, 9, 8, 7, 4, 3, 1
]

export function drawShip(deps: {
  x: number
  y: number
  rotation: number
  thrusting: boolean
  inFizz?: boolean
}): (frame: Frame) => Frame {
  const { x, y, rotation, thrusting, inFizz } = deps

  const shipSpriteId = `ship-${rotation > 9 ? rotation : '0' + rotation}`
  const flameSpriteId = `flame-${rotation > 9 ? rotation : '0' + rotation}`

  const adjustedY = y + SBARHT

  // Use higher z-order during fizz/starmap transitions
  const shipZ = inFizz ? Z.SHIP_FIZZ : Z.SHIP
  const shadowZ = Z.SHADOW

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    newFrame.drawables.push({
      id: shipSpriteId,
      type: 'sprite',
      spriteId: shipSpriteId,
      z: shipZ,
      alpha: 1,
      topLeft: { x, y: adjustedY },
      rotation: 0
    })

    newFrame.drawables.push({
      id: `shadow-${shipSpriteId}`,
      type: 'sprite',
      spriteId: shipSpriteId,
      z: shadowZ,
      alpha: 1,
      topLeft: { x: x + SHADOW_OFFSET_X, y: adjustedY + SHADOW_OFFSET_Y },
      rotation: 0,
      colorOverride: 'black'
    })

    // x += flamexdisp[rot] - FCENTER
    const flameX = x + flamexdisp[rotation]! + FCENTER

    // y += flamexdisp[(rot+(32-8)) & 31] - FCENTER
    // Note: (32-8) = 24, and we need to mask with 31 to keep in bounds
    const flameY = adjustedY + flamexdisp[(rotation + 24) & 31]! + FCENTER

    if (thrusting) {
      newFrame.drawables.push({
        id: flameSpriteId,
        type: 'sprite',
        spriteId: flameSpriteId,
        z: shipZ,
        alpha: 1,
        topLeft: { x: flameX, y: flameY },
        rotation: 0
      })
    }

    return newFrame
  }
}

/**
 * Draw shield sprite around ship
 * Based on erase_figure() in orig/Sources/Draw.c:67-97
 */
export function drawShield(deps: {
  x: number
  y: number
}): (frame: Frame) => Frame {
  const { x, y } = deps

  const adjustedY = y + SBARHT

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    newFrame.drawables.push({
      id: 'shield',
      type: 'sprite',
      spriteId: 'shield',
      z: Z.SHIELD,
      alpha: 1,
      topLeft: { x, y: adjustedY },
      rotation: 0
    })

    return newFrame
  }
}
