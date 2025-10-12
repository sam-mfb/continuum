import type { Frame } from '@/lib/frame/types'
import type { RootState } from '../store'
import type { SpriteService } from '@/core/sprites'
import type { FizzTransitionService } from '@/core/transition'
import { LINE_KIND } from '@/core/shared'
import { SCRWTH, VIEWHT } from '@/core/screen'
import { blackTerrain } from '@/render-modern/walls'

export type RenderContextNew = {
  frame: Frame
  state: RootState
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
}

export const renderGameNew = (context: RenderContextNew): Frame => {
  let { frame, state } = context
  const viewport = {
    x: state.screen.screenx,
    y: state.screen.screeny,
    b: state.screen.screeny + VIEWHT,
    r: state.screen.screenx + SCRWTH
  }
  const newFrame = blackTerrain({
    thekind: LINE_KIND.NORMAL,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(frame)
  return newFrame
}
