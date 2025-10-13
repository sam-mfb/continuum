import type { Frame } from '@/lib/frame/types'
import type { RootState } from '../store'
import type { SpriteService } from '@/core/sprites'
import type { FizzTransitionService } from '@/core/transition'
import { LINE_KIND } from '@/core/shared'
import { SCRWTH, VIEWHT } from '@/core/screen'
import { blackTerrain } from '@/render-modern/walls'
import { drawShip } from '@/render-modern/ship'
import { drawCraters } from '@/render-modern/craters'
import { drawFuels } from '@/render-modern/fuel'
import { drawBunkers } from '@/render-modern/bunkers'
import { drawShards } from '@/render-modern/explosions'
import { drawStrafes } from '@/render-modern/shots'
import { SCENTER } from '@/core/figs'

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

  // Calculate if we're on the right side for world wrapping
  const on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH

  // Draw walls
  let newFrame = blackTerrain({
    thekind: LINE_KIND.NORMAL,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(frame)

  newFrame = blackTerrain({
    thekind: LINE_KIND.BOUNCE,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(newFrame)

  newFrame = blackTerrain({
    thekind: LINE_KIND.GHOST,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(newFrame)

  // Draw craters
  newFrame = drawCraters({
    craters: state.planet.craters,
    numcraters: state.planet.numcraters,
    screenX: state.screen.screenx,
    screenY: state.screen.screeny,
    worldwidth: state.planet.worldwidth
  })(newFrame)

  // Draw fuel cells
  newFrame = drawFuels({
    fuels: state.planet.fuels,
    screenX: state.screen.screenx,
    screenY: state.screen.screeny
  })(newFrame)

  // Handle world wrapping for fuel
  if (on_right_side && state.planet.worldwrap) {
    newFrame = drawFuels({
      fuels: state.planet.fuels,
      screenX: state.screen.screenx - state.planet.worldwidth,
      screenY: state.screen.screeny
    })(newFrame)
  }

  // Draw bunkers
  newFrame = drawBunkers({
    bunkers: state.planet.bunkers,
    screenX: state.screen.screenx,
    screenY: state.screen.screeny,
    viewport: viewport
  })(newFrame)

  // Handle world wrapping for bunkers
  if (on_right_side && state.planet.worldwrap) {
    newFrame = drawBunkers({
      bunkers: state.planet.bunkers,
      screenX: state.screen.screenx - state.planet.worldwidth,
      screenY: state.screen.screeny,
      viewport: viewport
    })(newFrame)
  }

  // Draw ship
  if (state.ship.deadCount === 0) {
    newFrame = drawShip({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      rotation: state.ship.shiprot,
      thrusting: state.ship.flaming
    })(newFrame)
  }

  // Draw strafes (from rendering.ts line 493-505)
  newFrame = drawStrafes({
    strafes: state.shots.strafes,
    screenX: state.screen.screenx,
    screenY: state.screen.screeny,
    worldwidth: state.planet.worldwidth,
    worldwrap: state.planet.worldwrap
  })(newFrame)

  // Draw explosions - shards (from rendering.ts line 507-546)
  if (state.explosions.shards.some(s => s.lifecount > 0)) {
    newFrame = drawShards({
      shards: state.explosions.shards,
      screenX: state.screen.screenx,
      screenY: state.screen.screeny,
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap
    })(newFrame)
  }

  return newFrame
}
