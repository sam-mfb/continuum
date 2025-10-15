import type { Frame } from '@/lib/frame/types'
import type { RootState } from '../store'
import type { SpriteService } from '@/core/sprites'
import type { FizzTransitionServiceFrame } from '@/core/transition'
import { LINE_KIND } from '@/core/shared'
import { SCRWTH, VIEWHT } from '@/core/screen'
import { drawWalls } from '@/render-modern/walls'
import { drawShip, drawShield } from '@/render-modern/ship'
import { drawCraters } from '@/render-modern/craters'
import { drawFuels } from '@/render-modern/fuel'
import { drawBunkers } from '@/render-modern/bunkers'
import { drawShards, drawSparks } from '@/render-modern/explosions'
import {
  drawStrafes,
  drawShipShots,
  drawBunkerShots
} from '@/render-modern/shots'
import { SCENTER } from '@/core/figs'
import { FIZZ_DURATION } from '@/core/transition'
import { viewClear } from '@/render-modern/viewClear'
import { drawStatusBar } from '@/render-modern/statusBar'

export type RenderContextNew = {
  frame: Frame
  state: RootState
  spriteService: SpriteService
  fizzTransitionServiceFrame: FizzTransitionServiceFrame
}

export const renderGameNew = (context: RenderContextNew): Frame => {
  let { frame, state, fizzTransitionServiceFrame } = context
  const viewport = {
    x: state.screen.screenx,
    y: state.screen.screeny,
    b: state.screen.screeny + VIEWHT,
    r: state.screen.screenx + SCRWTH
  }

  // Initialize fizz transition when we first enter fizz status
  // This needs to happen BEFORE we check for fizz phase rendering
  // so we can capture the current game frame
  if (
    state.transition.status === 'fizz' &&
    !fizzTransitionServiceFrame.isInitialized
  ) {
    // We need to render the full game scene first to get the "from" frame
    // Continue past this block to do normal rendering, then initialize at the end
  }

  // Handle fizz transition rendering
  if (
    state.transition.status === 'fizz' &&
    fizzTransitionServiceFrame.isInitialized
  ) {
    // Service returns complete frame with: from + fizz pixels + ship
    const fizzDrawables = fizzTransitionServiceFrame.getNextFrameDrawables()
    frame.drawables = fizzDrawables

    // Draw status bar on top
    frame = drawStatusBar({
      lives: state.ship.lives,
      score: state.status.score,
      fuel: state.ship.fuel,
      bonus: state.status.planetbonus,
      level: state.status.currentlevel,
      message: state.status.curmessage
    })(frame)

    return frame
  }

  // Handle starmap phase
  if (state.transition.status === 'starmap') {
    // Show all starmap pixels
    const starmapPixels = fizzTransitionServiceFrame.getAllStarmapPixels()
    frame.drawables = frame.drawables.concat(starmapPixels)

    // Draw ship on top if alive
    if (state.ship.deadCount === 0) {
      frame = drawShip({
        x: state.ship.shipx - SCENTER,
        y: state.ship.shipy - SCENTER,
        rotation: state.ship.shiprot,
        thrusting: false,
        inFizz: true
      })(frame)
    }

    // Draw status bar on top
    frame = drawStatusBar({
      lives: state.ship.lives,
      score: state.status.score,
      fuel: state.ship.fuel,
      bonus: state.status.planetbonus,
      level: state.status.currentlevel,
      message: state.status.curmessage
    })(frame)

    return frame
  }

  // Calculate if we're on the right side for world wrapping
  const on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH

  // 1. viewClear - Create background (crosshatch or solid gray)
  let newFrame = viewClear({
    screenX: state.screen.screenx,
    screenY: state.screen.screeny,
    solidBackground: state.app.solidBackground
  })(frame)

  // Draw walls
  newFrame = drawWalls({
    thekind: LINE_KIND.NORMAL,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth,
    altEndpoints: state.walls.altEndpoints
  })(newFrame)

  newFrame = drawWalls({
    thekind: LINE_KIND.BOUNCE,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth,
    altEndpoints: state.walls.altEndpoints
  })(newFrame)

  newFrame = drawWalls({
    thekind: LINE_KIND.GHOST,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth,
    altEndpoints: state.walls.altEndpoints
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

  // Draw bunker shots BEFORE ship if NOT shielding (from rendering.ts line 335-373)
  if (!state.ship.shielding) {
    newFrame = drawBunkerShots({
      shots: state.shots.bunkshots,
      screenX: state.screen.screenx,
      screenY: state.screen.screeny,
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap
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

  // Draw shield if active (from rendering.ts line 392-400)
  if (state.ship.shielding) {
    newFrame = drawShield({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER
    })(newFrame)
  }

  // Draw bunker shots AFTER ship/shield if shielding (from rendering.ts line 401-437)
  if (state.ship.shielding) {
    newFrame = drawBunkerShots({
      shots: state.shots.bunkshots,
      screenX: state.screen.screenx,
      screenY: state.screen.screeny,
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap
    })(newFrame)
  }

  // Draw ship shots (from rendering.ts line 439-475)
  newFrame = drawShipShots({
    shots: state.shots.shipshots,
    screenX: state.screen.screenx,
    screenY: state.screen.screeny,
    worldwidth: state.planet.worldwidth,
    worldwrap: state.planet.worldwrap
  })(newFrame)

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

  // Draw explosions - sparks (from rendering.ts line 507-546)
  if (state.explosions.sparksalive > 0) {
    newFrame = drawSparks({
      sparks: state.explosions.sparks,
      sparksalive: state.explosions.sparksalive,
      totalsparks: state.explosions.totalsparks,
      screenX: state.screen.screenx,
      screenY: state.screen.screeny,
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap
    })(newFrame)
  }

  // Draw status bar (renders on top of everything)
  newFrame = drawStatusBar({
    lives: state.ship.lives,
    score: state.status.score,
    fuel: state.ship.fuel,
    bonus: state.status.planetbonus,
    level: state.status.currentlevel,
    message: state.status.curmessage
  })(newFrame)

  // Initialize fizz transition if we just entered fizz status
  // This happens AFTER normal rendering so we have the complete "from" frame
  if (
    state.transition.status === 'fizz' &&
    !fizzTransitionServiceFrame.isInitialized
  ) {
    const shipInfo =
      state.ship.deadCount === 0
        ? {
            x: state.ship.shipx - SCENTER,
            y: state.ship.shipy - SCENTER,
            rotation: state.ship.shiprot
          }
        : null

    fizzTransitionServiceFrame.initialize(
      newFrame, // Use the fully rendered frame as "from"
      shipInfo, // Ship position for SHIP_FIZZ z-order
      150, // Star count
      FIZZ_DURATION // Duration in frames
    )

    // Return the first fizz frame
    const fizzDrawables = fizzTransitionServiceFrame.getNextFrameDrawables()
    return {
      width: newFrame.width,
      height: newFrame.height,
      drawables: fizzDrawables
    }
  }

  return newFrame
}
