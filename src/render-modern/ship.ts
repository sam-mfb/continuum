import { SBARHT } from '@/core/screen'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'

const SHADOW_OFFSET_X = 8
const SHADOW_OFFSET_Y = 5

export function drawShip(deps: {
  x: number
  y: number
  rotation: number
}): (frame: Frame) => Frame {
  const { x, y, rotation } = deps

  const spriteId = `ship-${rotation > 9 ? rotation : '0' + rotation}`

  const adjustedY = y + SBARHT

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    newFrame.drawables.push({
      id: spriteId,
      type: 'sprite',
      spriteId,
      z: Z.SHIP,
      alpha: 1,
      topLeft: { x, y: adjustedY },
      rotation: 0
    })

    newFrame.drawables.push({
      id: spriteId,
      type: 'sprite',
      spriteId,
      z: Z.SHADOW,
      alpha: 1,
      topLeft: { x: x + SHADOW_OFFSET_X, y: adjustedY + SHADOW_OFFSET_Y },
      rotation: 0,
      colorOverride: 'black'
    })

    return newFrame
  }
}
