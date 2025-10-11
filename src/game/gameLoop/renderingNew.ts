import type { Frame } from '@/lib/frame/types'
import type { RootState } from '../store'
import type { SpriteService } from '@/core/sprites'
import type { FizzTransitionService } from '@/core/transition'
import { nanoid } from '@reduxjs/toolkit'

export type RenderContextNew = {
  frame: Frame
  state: RootState
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
}

export const renderGameNew = (context: RenderContextNew): Frame => {
  let { frame } = context
  const newFrame: Frame = {
    width: frame.width,
    height: frame.height,
    drawables: [
      {
        id: nanoid(),
        z: 1,
        alpha: 0.5,
        type: 'line',
        start: {
          x: 0,
          y: 0
        },
        end: {
          x: 650,
          y: 650
        },
        width: 2,
        color: 'yellow'
      }
    ]
  }
  return newFrame
}
