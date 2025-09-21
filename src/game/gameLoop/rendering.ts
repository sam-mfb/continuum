/**
 * Rendering Module
 *
 * Handles all rendering operations for the game including
 * terrain, sprites, effects, and UI elements
 */

import type { MonochromeBitmap } from '@lib/bitmap'
import type { SpriteServiceV2 } from '@core/sprites'
import type { RootState } from '../store'
import type { BunkerKind, ShardSprite, ShardSpriteSet } from '@core/figs/types'

import {
  fullFigure,
  flameOn,
  grayFigure,
  eraseFigure,
  shiftFigure
} from '@core/ship/render'
import {
  checkForBounce,
  checkFigure
} from '@core/ship'
import { SCENTER } from '@core/figs/types'
import {
  drawShipShot,
  drawStrafe,
  drawDotSafe
} from '@core/shots/render'
import {
  doBunks,
  drawCraters,
  drawFuels
} from '@core/planet/render'
import {
  drawExplosions
} from '@core/explosions/render'
import {
  clearShipDeathFlash
} from '@core/explosions'
import {
  updateSbar,
  sbarClear
} from '@core/status/render'
import {
  SCRWTH,
  VIEWHT
} from '@core/screen'
import {
  viewClear,
  viewWhite
} from '@core/screen/render'
import {
  whiteTerrain,
  blackTerrain
} from '@core/walls/render'
import {
  LINE_KIND
} from '@core/walls'
import {
  getAlignment,
  getBackgroundPattern
} from '@core/shared'
import { store } from '../store'
import { triggerShipDeath } from '../shipDeath'

export type RenderContext = {
  bitmap: MonochromeBitmap
  state: RootState
  spriteService: SpriteServiceV2
}

/**
 * Handle death flash effect
 */
const renderDeathFlash = (bitmap: MonochromeBitmap, state: RootState): MonochromeBitmap | null => {
  if (state.explosions.shipDeathFlash) {
    // Fill viewport with white (preserve status bar)
    bitmap = viewWhite()(bitmap)

    // Clear the flash for next frame
    store.dispatch(clearShipDeathFlash())

    // Return early - skip all other rendering
    return bitmap
  }
  return null
}

/**
 * Render background elements (craters and fuel cells)
 */
const renderBackground = (context: RenderContext): MonochromeBitmap => {
  let { bitmap } = context
  const { state, spriteService } = context

  // Derive on_right_side from state
  const on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH

  // Create crosshatch gray background
  bitmap = viewClear({
    screenX: state.screen.screenx,
    screenY: state.screen.screeny
  })(bitmap)

  // Draw craters
  const craterImages = {
    background1: spriteService.getCraterSprite({ variant: 'background1' }).uint8,
    background2: spriteService.getCraterSprite({ variant: 'background2' }).uint8
  }

  bitmap = drawCraters({
    craters: state.planet.craters,
    numcraters: state.planet.numcraters,
    scrnx: state.screen.screenx,
    scrny: state.screen.screeny,
    worldwidth: state.planet.worldwidth,
    on_right_side,
    craterImages
  })(bitmap)

  // Draw fuel cells
  const fuelSprites = {
    getFrame: (
      frame: number
    ): { images: { background1: Uint8Array; background2: Uint8Array } } => {
      const bg1 = spriteService.getFuelSprite(frame, {
        variant: 'background1'
      })
      const bg2 = spriteService.getFuelSprite(frame, {
        variant: 'background2'
      })
      return {
        images: {
          background1: bg1.uint8,
          background2: bg2.uint8
        }
      }
    },
    emptyCell: {
      images: {
        background1: spriteService.getFuelSprite(8, {
          variant: 'background1'
        }).uint8,
        background2: spriteService.getFuelSprite(8, {
          variant: 'background2'
        }).uint8
      }
    }
  }

  bitmap = drawFuels({
    fuels: state.planet.fuels,
    scrnx: state.screen.screenx,
    scrny: state.screen.screeny,
    fuelSprites
  })(bitmap)

  // Handle world wrapping for fuel cells
  if (on_right_side && state.planet.worldwrap) {
    bitmap = drawFuels({
      fuels: state.planet.fuels,
      scrnx: state.screen.screenx - state.planet.worldwidth,
      scrny: state.screen.screeny,
      fuelSprites
    })(bitmap)
  }

  return bitmap
}

/**
 * Render terrain (walls)
 */
const renderTerrain = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state } = context

  const viewport = {
    x: state.screen.screenx,
    y: state.screen.screeny,
    b: state.screen.screeny + VIEWHT,
    r: state.screen.screenx + SCRWTH
  }

  // Get ship sprite for collision detection
  const shipMaskSprite = context.spriteService.getShipSprite(
    state.ship.shiprot,
    { variant: 'mask' }
  )
  const shipMaskBitmap = shipMaskSprite.bitmap

  // Ship shadow (only if alive)
  if (state.ship.deadCount === 0) {
    const align0 = getAlignment({
      screenX: state.screen.screenx,
      screenY: state.screen.screeny,
      objectX: 0,
      objectY: 0
    })
    const align1 = getAlignment({
      screenX: state.screen.screenx,
      screenY: state.screen.screeny,
      objectX: 0,
      objectY: 1
    })
    const background: readonly [number, number] = [
      getBackgroundPattern(align0),
      getBackgroundPattern(align1)
    ]

    const SHADOW_OFFSET_X = 8
    const SHADOW_OFFSET_Y = 5

    bitmap = grayFigure({
      x: state.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: state.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap,
      background
    })(bitmap)
  }

  // White terrain - wall undersides/junctions
  bitmap = whiteTerrain({
    whites: state.walls.whites,
    junctions: state.walls.junctions,
    firstWhite: state.walls.firstWhite,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(bitmap)

  // Ghost walls
  bitmap = blackTerrain({
    thekind: LINE_KIND.GHOST,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(bitmap)

  // Erase ship area (only if alive)
  if (state.ship.deadCount === 0) {
    bitmap = eraseFigure({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      def: shipMaskBitmap
    })(bitmap)
  }

  // Bounce walls and collision detection
  if (state.ship.deadCount === 0) {
    bitmap = checkForBounce({
      screen: bitmap,
      store,
      shipDef: shipMaskBitmap,
      wallData: {
        kindPointers: state.walls.kindPointers,
        organizedWalls: state.walls.organizedWalls
      },
      viewport: viewport,
      worldwidth: state.planet.worldwidth
    })
  } else {
    // When dead, just draw bounce walls without collision
    bitmap = blackTerrain({
      thekind: LINE_KIND.BOUNCE,
      kindPointers: state.walls.kindPointers,
      organizedWalls: state.walls.organizedWalls,
      viewport: viewport,
      worldwidth: state.planet.worldwidth
    })(bitmap)
  }

  // Normal walls
  bitmap = blackTerrain({
    thekind: LINE_KIND.NORMAL,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(bitmap)

  return bitmap
}

/**
 * Render bunkers
 */
const renderBunkers = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state, spriteService } = context

  // Derive on_right_side from state
  const on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH

  const getBunkerSprite = (kind: BunkerKind, rotation: number): {
    def: Uint8Array
    mask: Uint8Array
    images: {
      background1: Uint8Array
      background2: Uint8Array
    }
  } => {
    const defSprite = spriteService.getBunkerSprite(kind, rotation, {
      variant: 'def'
    })
    const maskSprite = spriteService.getBunkerSprite(kind, rotation, {
      variant: 'mask'
    })
    const bg1Sprite = spriteService.getBunkerSprite(kind, rotation, {
      variant: 'background1'
    })
    const bg2Sprite = spriteService.getBunkerSprite(kind, rotation, {
      variant: 'background2'
    })

    return {
      def: defSprite.uint8,
      mask: maskSprite.uint8,
      images: {
        background1: bg1Sprite.uint8,
        background2: bg2Sprite.uint8
      }
    }
  }

  // First pass - normal position
  bitmap = doBunks({
    bunkrec: state.planet.bunkers,
    scrnx: state.screen.screenx,
    scrny: state.screen.screeny,
    getSprite: getBunkerSprite
  })(bitmap)

  // Second pass - wrapped position
  if (on_right_side && state.planet.worldwrap) {
    bitmap = doBunks({
      bunkrec: state.planet.bunkers,
      scrnx: state.screen.screenx - state.planet.worldwidth,
      scrny: state.screen.screeny,
      getSprite: getBunkerSprite
    })(bitmap)
  }

  return bitmap
}

/**
 * Render shots (bunker and ship shots)
 */
const renderShots = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state } = context

  // Draw bunker shots (before shield if not shielding, after if shielding)
  const drawBunkerShots = (): void => {
    for (const shot of state.shots.bunkshots) {
      const shouldRender =
        shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

      if (shouldRender) {
        const shotx = shot.x - state.screen.screenx
        const shoty = shot.y - state.screen.screeny

        if (
          shotx >= 0 &&
          shotx < SCRWTH - 1 &&
          shoty >= 0 &&
          shoty < VIEWHT - 1
        ) {
          bitmap = drawDotSafe(shotx, shoty, bitmap)
        }

        // Handle world wrapping
        if (
          state.planet.worldwrap &&
          state.screen.screenx > state.planet.worldwidth - SCRWTH
        ) {
          const wrappedShotx =
            shot.x + state.planet.worldwidth - state.screen.screenx

          if (
            wrappedShotx >= 0 &&
            wrappedShotx < SCRWTH - 1 &&
            shoty >= 0 &&
            shoty < VIEWHT - 1
          ) {
            bitmap = drawDotSafe(wrappedShotx, shoty, bitmap)
          }
        }
      }
    }
  }

  // Draw bunker shots before shield
  if (!state.ship.shielding) {
    drawBunkerShots()
  }

  // Draw ship shots
  for (const shot of state.shots.shipshots) {
    const shouldRender =
      shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

    if (shouldRender) {
      const shotx = shot.x - state.screen.screenx - 1
      const shoty = shot.y - state.screen.screeny - 1

      if (
        shotx >= 0 &&
        shotx < SCRWTH - 3 &&
        shoty >= 0 &&
        shoty < VIEWHT - 3
      ) {
        bitmap = drawShipShot({
          x: shotx,
          y: shoty
        })(bitmap)
      }

      // Handle world wrapping
      if (
        state.planet.worldwrap &&
        state.screen.screenx > state.planet.worldwidth - SCRWTH
      ) {
        const wrappedShotx =
          shot.x +
          state.planet.worldwidth -
          state.screen.screenx -
          1
        if (wrappedShotx >= 0 && wrappedShotx < SCRWTH - 3) {
          bitmap = drawShipShot({
            x: wrappedShotx,
            y: shoty
          })(bitmap)
        }
      }
    }
  }

  return bitmap
}

/**
 * Render ship and related effects
 */
const renderShip = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state, spriteService } = context

  if (state.ship.deadCount === 0) {
    const shipSprite = spriteService.getShipSprite(state.ship.shiprot, {
      variant: 'def'
    })
    const shipMaskSprite = spriteService.getShipSprite(
      state.ship.shiprot,
      { variant: 'mask' }
    )

    const shipDefBitmap = shipSprite.bitmap
    const shipMaskBitmap = shipMaskSprite.bitmap

    // Check for collision before drawing ship
    const collision = checkFigure(bitmap, {
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      height: 32,
      def: shipMaskBitmap
    })

    if (collision) {
      triggerShipDeath(store)
      // Ship is now dead, skip drawing
      return bitmap
    }

    const SHADOW_OFFSET_X = 8
    const SHADOW_OFFSET_Y = 5

    // Ship shadow
    bitmap = shiftFigure({
      x: state.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: state.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap
    })(bitmap)

    // Draw ship
    bitmap = fullFigure({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      def: shipDefBitmap,
      mask: shipMaskBitmap
    })(bitmap)

    // Draw shield if active
    if (state.ship.shielding) {
      const shieldSprite = spriteService.getShieldSprite()
      bitmap = eraseFigure({
        x: state.ship.shipx - SCENTER,
        y: state.ship.shipy - SCENTER,
        def: shieldSprite.bitmap
      })(bitmap)

      // Draw bunker shots after shield when shielding
      for (const shot of state.shots.bunkshots) {
        const shouldRender =
          shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

        if (shouldRender) {
          const shotx = shot.x - state.screen.screenx
          const shoty = shot.y - state.screen.screeny

          if (
            shotx >= 0 &&
            shotx < SCRWTH - 1 &&
            shoty >= 0 &&
            shoty < VIEWHT - 1
          ) {
            bitmap = drawDotSafe(shotx, shoty, bitmap)
          }

          if (
            state.planet.worldwrap &&
            state.screen.screenx > state.planet.worldwidth - SCRWTH
          ) {
            const wrappedShotx =
              shot.x + state.planet.worldwidth - state.screen.screenx

            if (
              wrappedShotx >= 0 &&
              wrappedShotx < SCRWTH - 1 &&
              shoty >= 0 &&
              shoty < VIEWHT - 1
            ) {
              bitmap = drawDotSafe(wrappedShotx, shoty, bitmap)
            }
          }
        }
      }
    }

    // Draw flame if thrusting
    if (state.ship.flaming) {
      const flameSprites = []
      for (let i = 0; i < 32; i++) {
        const flame = spriteService.getFlameSprite(i)
        flameSprites.push(flame.bitmap)
      }

      bitmap = flameOn({
        x: state.ship.shipx,
        y: state.ship.shipy,
        rot: state.ship.shiprot,
        flames: flameSprites
      })(bitmap)
    }
  }

  return bitmap
}

/**
 * Render effects (strafes and explosions)
 */
const renderEffects = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state, spriteService } = context

  // Draw strafes
  for (const strafe of state.shots.strafes) {
    if (strafe.lifecount > 0) {
      bitmap = drawStrafe({
        x: strafe.x,
        y: strafe.y,
        rot: strafe.rot,
        scrnx: state.screen.screenx,
        scrny: state.screen.screeny,
        worldwidth: state.planet.worldwidth
      })(bitmap)
    }
  }

  // Draw explosions
  if (
    state.explosions.sparksalive > 0 ||
    state.explosions.shards.some(s => s.lifecount > 0)
  ) {
    const shardImages = {
      kinds: {} as Record<number, Record<number, ShardSprite>>,
      getSprite: (kind: number, rotation: number) => {
        const def = spriteService.getShardSprite(kind, rotation, {
          variant: 'def'
        })
        const mask = spriteService.getShardSprite(kind, rotation, {
          variant: 'mask'
        })
        const bg1 = spriteService.getShardSprite(kind, rotation, {
          variant: 'background1'
        })
        const bg2 = spriteService.getShardSprite(kind, rotation, {
          variant: 'background2'
        })
        return {
          def: def.uint8,
          mask: mask.uint8,
          images: {
            background1: bg1.uint8,
            background2: bg2.uint8
          }
        }
      }
    } as ShardSpriteSet

    bitmap = drawExplosions({
      explosions: state.explosions,
      screenx: state.screen.screenx,
      screeny: state.screen.screeny,
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap,
      shardImages
    })(bitmap)
  }

  return bitmap
}

/**
 * Render status bar
 */
const renderStatusBar = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state, spriteService } = context

  // Clear with template
  const statusBarTemplate = spriteService.getStatusBarTemplate()
  bitmap = sbarClear({ statusBarTemplate })(bitmap)

  // Update with current values
  const statusData = {
    fuel: state.ship.fuel,
    lives: state.ship.lives,
    score: state.status.score,
    bonus: state.status.planetbonus,
    level: state.status.currentlevel,
    message: state.status.curmessage,
    spriteService
  }

  bitmap = updateSbar(statusData)(bitmap)

  return bitmap
}

/**
 * Main rendering function
 */
export const renderGame = (context: RenderContext): MonochromeBitmap => {
  let { bitmap, state } = context

  // Check for death flash
  const flashResult = renderDeathFlash(bitmap, state)
  if (flashResult) {
    return flashResult
  }

  // Render background
  bitmap = renderBackground({ ...context, bitmap })

  // Render status bar
  bitmap = renderStatusBar({ ...context, bitmap })

  // Render terrain
  bitmap = renderTerrain({ ...context, bitmap })

  // Render bunkers
  bitmap = renderBunkers({ ...context, bitmap })

  // Render shots
  bitmap = renderShots({ ...context, bitmap })

  // Render ship and effects
  bitmap = renderShip({ ...context, bitmap })

  // Render effects
  bitmap = renderEffects({ ...context, bitmap })

  return bitmap
}