import type { ControlMatrix } from '@/core/controls'
import type { FrameInfo, MonochromeBitmap } from '@/lib/bitmap'

export type GameRenderLoop = (
  frame: FrameInfo,
  controls: ControlMatrix
) => MonochromeBitmap
