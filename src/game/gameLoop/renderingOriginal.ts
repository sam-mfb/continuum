/**
 * Rendering Module
 *
 * Handles all rendering operations for the game including
 * terrain, sprites, effects, and UI elements
 */

import type { MonochromeBitmap } from '@lib/bitmap'
import type { SpriteService } from '@core/sprites'
import type { RootState, GameStore } from '../store'
import type { BunkerKind, ShardSprite, ShardSpriteSet } from '@core/figs'
import type { FizzTransitionService } from '@core/transition'

import {
  fullFigure,
  flameOn,
  grayFigure,
  eraseFigure,
  shiftFigure
} from '@render/ship'
import { checkForBounce, checkFigure } from '@core/ship'
import { SCENTER } from '@core/figs'
import { drawShipShot, drawStrafe, drawDotSafe } from '@render/shots'
import { doBunks, drawCraters, drawFuels } from '@render/planet'
import { drawExplosions } from '@render/explosions'
import { updateSbar, sbarClear } from '@render/status'
import { SCRWTH, VIEWHT } from '@core/screen'
import { viewClear, viewWhite } from '@render/screen'
import { whiteTerrain, blackTerrain } from '@core/walls/render'
import { LINE_KIND } from '@core/walls'
import { getAlignment, getBackgroundPattern } from '@core/shared'
import { triggerShipDeath } from '../shipDeath'
import { FIZZ_DURATION } from '@core/transition'
import { starBackground } from '@core/transition/render'

export type RenderOriginalContext = {
  bitmap: MonochromeBitmap
  state: RootState
  spriteService: SpriteService
  // we currently have a dependency on the store at the rendering phase because collision detections are
  // handled through rendering (checkFigure(), specifically). that means handling ship deaths and ship
  // bounces currently have to take place in the rendering stage
  store: GameStore
  fizzTransitionService: FizzTransitionService
}

/**
 * Main rendering function - matches exact order from main branch gameLoop.ts
 */
export const renderGameOriginal = (
  context: RenderOriginalContext
): MonochromeBitmap => {
  let { bitmap, state, spriteService, store, fizzTransitionService } = context

  // Helper to add status bar to bitmap - used for fizz/starmap phases
  const addStatusBar = (bmp: MonochromeBitmap): MonochromeBitmap => {
    const statusBarTemplate = spriteService.getStatusBarTemplate()
    let result = sbarClear({ statusBarTemplate })(bmp)
    result = updateSbar({
      fuel: state.ship.fuel,
      lives: state.ship.lives,
      score: state.status.score,
      bonus: state.status.planetbonus,
      level: state.status.currentlevel,
      message: state.status.curmessage,
      spriteService
    })(result)
    return result
  }

  // Check if we're in fizz or starmap phase - skip normal rendering
  if (
    (state.transition.status === 'fizz' ||
      state.transition.status === 'starmap') &&
    fizzTransitionService.isInitialized
  ) {
    // Handle fizz phase
    if (state.transition.status === 'fizz') {
      if (fizzTransitionService.isComplete) {
        // Fizz animation complete but not yet transitioned to starmap
        const images = fizzTransitionService.getImages()
        return images.to ? addStatusBar(images.to) : bitmap
      } else {
        // Fizz animation in progress - fizz frames already have status bar from source
        const fizzFrame = fizzTransitionService.nextFrame()
        return fizzFrame
      }
    }

    // Handle starmap phase - show target bitmap
    if (state.transition.status === 'starmap') {
      // Check if we're about to transition to next level
      // Show starmap (target bitmap)
      const images = fizzTransitionService.getImages()
      return images.to ? addStatusBar(images.to) : bitmap
    }
  }

  // Check for death flash
  if (state.explosions.shipDeathFlashFrames) {
    bitmap = viewWhite()(bitmap)
    return bitmap
  }

  // Calculate viewport and common variables
  const viewport = {
    x: state.screen.screenx,
    y: state.screen.screeny,
    b: state.screen.screeny + VIEWHT,
    r: state.screen.screenx + SCRWTH
  }

  const on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH

  // Get ship sprites
  const shipSprite = spriteService.getShipSprite(state.ship.shiprot, {
    variant: 'def'
  })
  const shipMaskSprite = spriteService.getShipSprite(state.ship.shiprot, {
    variant: 'mask'
  })
  const shipDefBitmap = shipSprite.bitmap
  const shipMaskBitmap = shipMaskSprite.bitmap

  const SHADOW_OFFSET_X = 8
  const SHADOW_OFFSET_Y = 5

  // Start with the actual bitmap
  let renderedBitmap = bitmap

  // 1. viewClear - Create crosshatch gray background
  renderedBitmap = viewClear({
    screenX: state.screen.screenx,
    screenY: state.screen.screeny
  })(renderedBitmap)

  // 2. draw_craters
  const craterImages = {
    background1: spriteService.getCraterSprite({ variant: 'background1' })
      .uint8,
    background2: spriteService.getCraterSprite({ variant: 'background2' }).uint8
  }

  renderedBitmap = drawCraters({
    craters: state.planet.craters,
    numcraters: state.planet.numcraters,
    scrnx: state.screen.screenx,
    scrny: state.screen.screeny,
    worldwidth: state.planet.worldwidth,
    on_right_side,
    craterImages
  })(renderedBitmap)

  // 3. do_fuels
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

  renderedBitmap = drawFuels({
    fuels: state.planet.fuels,
    scrnx: state.screen.screenx,
    scrny: state.screen.screeny,
    fuelSprites
  })(renderedBitmap)

  // Handle world wrapping for fuel cells
  if (on_right_side && state.planet.worldwrap) {
    renderedBitmap = drawFuels({
      fuels: state.planet.fuels,
      scrnx: state.screen.screenx - state.planet.worldwidth,
      scrny: state.screen.screeny,
      fuelSprites
    })(renderedBitmap)
  }

  // 4. Status bar
  const statusBarTemplate = spriteService.getStatusBarTemplate()
  renderedBitmap = sbarClear({ statusBarTemplate })(renderedBitmap)

  const statusData = {
    fuel: state.ship.fuel,
    lives: state.ship.lives,
    score: state.status.score,
    bonus: state.status.planetbonus,
    level: state.status.currentlevel,
    message: state.status.curmessage,
    spriteService
  }

  renderedBitmap = updateSbar(statusData)(renderedBitmap)

  // 5. gray_figure - ship shadow background (only if ship is alive)
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

    renderedBitmap = grayFigure({
      x: state.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: state.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap,
      background
    })(renderedBitmap)
  }

  // 6. white_terrain - wall undersides/junctions
  renderedBitmap = whiteTerrain({
    whites: state.walls.whites,
    junctions: state.walls.junctions,
    firstWhite: state.walls.firstWhite,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(renderedBitmap)

  // 7. black_terrain(L_GHOST) - ghost walls
  renderedBitmap = blackTerrain({
    thekind: LINE_KIND.GHOST,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(renderedBitmap)

  // 8. erase_figure - erase ship area (only if ship is alive)
  if (state.ship.deadCount === 0) {
    renderedBitmap = eraseFigure({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      def: shipMaskBitmap
    })(renderedBitmap)
  }

  // 9. check_for_bounce OR black_terrain(L_BOUNCE)
  if (state.ship.deadCount === 0) {
    // Only check collision when alive
    renderedBitmap = checkForBounce({
      screen: renderedBitmap,
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
    // When dead, just draw bounce walls without collision check
    renderedBitmap = blackTerrain({
      thekind: LINE_KIND.BOUNCE,
      kindPointers: state.walls.kindPointers,
      organizedWalls: state.walls.organizedWalls,
      viewport: viewport,
      worldwidth: state.planet.worldwidth
    })(renderedBitmap)
  }

  // 10. black_terrain(L_NORMAL) - normal walls
  renderedBitmap = blackTerrain({
    thekind: LINE_KIND.NORMAL,
    kindPointers: state.walls.kindPointers,
    organizedWalls: state.walls.organizedWalls,
    viewport: viewport,
    worldwidth: state.planet.worldwidth
  })(renderedBitmap)

  // 11. do_bunkers - render all bunkers
  const getBunkerSprite = (
    kind: BunkerKind,
    rotation: number
  ): {
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
  renderedBitmap = doBunks({
    bunkrec: state.planet.bunkers,
    scrnx: state.screen.screenx,
    scrny: state.screen.screeny,
    getSprite: getBunkerSprite
  })(renderedBitmap)

  // Second pass - wrapped position
  if (on_right_side && state.planet.worldwrap) {
    renderedBitmap = doBunks({
      bunkrec: state.planet.bunkers,
      scrnx: state.screen.screenx - state.planet.worldwidth,
      scrny: state.screen.screeny,
      getSprite: getBunkerSprite
    })(renderedBitmap)
  }

  // 12. move_bullets - Draw bunker shots BEFORE collision check (only if NOT shielding)
  if (!state.ship.shielding) {
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
          renderedBitmap = drawDotSafe(shotx, shoty, renderedBitmap)
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
            renderedBitmap = drawDotSafe(wrappedShotx, shoty, renderedBitmap)
          }
        }
      }
    }
  }

  // 13. Check for collision after drawing all lethal objects
  if (state.ship.deadCount === 0) {
    const collision = checkFigure(renderedBitmap, {
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      height: 32,
      def: shipMaskBitmap
    })

    if (collision) {
      triggerShipDeath(store)
      // Don't return - continue rendering the ship this frame
      // The death will take effect next frame
    }
  }

  // 14. shift_figure - ship shadow overlay (only if ship is alive)
  // 15. full_figure - draw ship (only if ship is alive)
  if (state.ship.deadCount === 0) {
    renderedBitmap = shiftFigure({
      x: state.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: state.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap
    })(renderedBitmap)

    renderedBitmap = fullFigure({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      def: shipDefBitmap,
      mask: shipMaskBitmap
    })(renderedBitmap)
  }

  // 16. Draw shield if active
  if (state.ship.shielding) {
    const shieldSprite = spriteService.getShieldSprite()
    renderedBitmap = eraseFigure({
      x: state.ship.shipx - SCENTER,
      y: state.ship.shipy - SCENTER,
      def: shieldSprite.bitmap
    })(renderedBitmap)

    // 17. Draw bunker shots AFTER shield when shielding
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
          renderedBitmap = drawDotSafe(shotx, shoty, renderedBitmap)
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
            renderedBitmap = drawDotSafe(wrappedShotx, shoty, renderedBitmap)
          }
        }
      }
    }
  }

  // 18. Draw ship shots
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
        renderedBitmap = drawShipShot({
          x: shotx,
          y: shoty
        })(renderedBitmap)
      }

      // Handle world wrapping
      if (
        state.planet.worldwrap &&
        state.screen.screenx > state.planet.worldwidth - SCRWTH
      ) {
        const wrappedShotx =
          shot.x + state.planet.worldwidth - state.screen.screenx - 1
        if (wrappedShotx >= 0 && wrappedShotx < SCRWTH - 3) {
          renderedBitmap = drawShipShot({
            x: wrappedShotx,
            y: shoty
          })(renderedBitmap)
        }
      }
    }
  }

  // 19. Draw flame if thrusting
  if (state.ship.deadCount === 0 && state.ship.flaming) {
    const flameSprites = []
    for (let i = 0; i < 32; i++) {
      const flame = spriteService.getFlameSprite(i)
      flameSprites.push(flame.bitmap)
    }

    renderedBitmap = flameOn({
      x: state.ship.shipx,
      y: state.ship.shipy,
      rot: state.ship.shiprot,
      flames: flameSprites
    })(renderedBitmap)
  }

  // 20. Draw strafes
  for (const strafe of state.shots.strafes) {
    if (strafe.lifecount > 0) {
      renderedBitmap = drawStrafe({
        x: strafe.x,
        y: strafe.y,
        rot: strafe.rot,
        scrnx: state.screen.screenx,
        scrny: state.screen.screeny,
        worldwidth: state.planet.worldwidth
      })(renderedBitmap)
    }
  }

  // 21. Draw explosions
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

    renderedBitmap = drawExplosions({
      explosions: state.explosions,
      screenx: state.screen.screenx,
      screeny: state.screen.screeny,
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap,
      shardImages
    })(renderedBitmap)
  }

  // Initialize fizz transition when entering fizz phase
  // This happens AFTER normal rendering so we have the correct source bitmap
  if (
    state.transition.status === 'fizz' &&
    !fizzTransitionService.isInitialized
  ) {
    // Create the target bitmap (starfield with ship)
    const STAR_COUNT = 150
    const shipSprite = spriteService.getShipSprite(state.ship.shiprot, {
      variant: 'def'
    })
    const shipMaskSprite = spriteService.getShipSprite(state.ship.shiprot, {
      variant: 'mask'
    })

    const targetBitmap = starBackground({
      starCount: STAR_COUNT,
      additionalRender:
        // don't draw ship if it's dead
        state.ship.deadCount === 0
          ? (screen: MonochromeBitmap): MonochromeBitmap =>
              fullFigure({
                x: state.ship.shipx - SCENTER,
                y: state.ship.shipy - SCENTER,
                def: shipSprite.bitmap,
                mask: shipMaskSprite.bitmap
              })(screen)
          : undefined
    })

    // Initialize the fizz transition service with the RENDERED game screen
    fizzTransitionService.initialize(
      renderedBitmap, // Use the fully rendered game bitmap, not empty bitmap
      targetBitmap,
      FIZZ_DURATION
    )

    // Return the first fizz frame - it already has the status bar from the source bitmap
    const fizzFrame = fizzTransitionService.nextFrame()
    return fizzFrame
  }

  return renderedBitmap
}
