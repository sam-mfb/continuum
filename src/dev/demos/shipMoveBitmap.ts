/**
 * Ship Move Bitmap Game
 *
 * A bitmap-based version of the ship movement game that uses the
 * proper rendering functions for drawing the ship and bullets.
 * Combines shipMove.ts logic with bitmap rendering like wallDrawing.ts.
 */

import type { BitmapRenderer } from '@lib/bitmap'
import { fullFigure } from '@core/ship/render'
import { drawShipShot } from '@core/shots/render'
import { drawStrafe } from '@core/shots/render'
import { drawDotSafe } from '@core/shots/render'
import { shipSlice } from '@core/ship'
import {
  planetSlice,
  updateBunkerRotations,
  initializeBunkers,
  initializeFuels,
  updateFuelAnimations,
  killBunker
} from '@core/planet'
import { screenSlice } from '@core/screen'
import {
  shotsSlice,
  clearAllShots,
  doStrafes,
  bunkShoot,
  moveBullets,
  clearBunkShots
} from '@core/shots'
import { ShipControl } from '@core/ship'
import { shipControl } from '@core/ship'
import { buildGameStore } from '@dev/store'
import { containShip } from '@core/shared/containShip'
import { SCRWTH, VIEWHT, TOPMARG, BOTMARG } from '@core/screen'
import type { SpriteService } from '@core/sprites'
import { SCENTER, type BunkerKind } from '@core/figs'
import { flameOn } from '@core/ship/render'
import { grayFigure } from '@core/ship/render'
import { eraseFigure } from '@core/ship/render'
import { getAlignment } from '@core/shared'
import { getBackgroundPattern } from '@core/shared'
import { shiftFigure } from '@core/ship/render'
import { whiteTerrain, blackTerrain } from '@core/walls/render'
import { wallsSlice } from '@core/walls'
import { viewClear, viewWhite } from '@core/screen/render'
import { LINE_KIND } from '@core/walls'
import { updateSbar, sbarClear } from '@core/status/render'
import { statusSlice } from '@core/status'
import { checkFigure } from '@core/ship'
import { checkForBounce } from '@core/ship'
import { doBunks } from '@core/planet/render'
import { drawCraters } from '@core/planet/render'
import { drawFuels } from '@core/planet/render'
import { rint } from '@core/shared'
import {
  startShipDeath,
  startExplosion,
  updateExplosions,
  clearShipDeathFlash,
  resetSparksAlive,
  clearShards
} from '@core/explosions'
import { drawExplosions } from '@core/explosions/render'
import type { ShardSprite, ShardSpriteSet } from '@core/figs'
import { SKILLBRADIUS } from '@core/ship'
import { xyindist } from '@core/shots'
import { legalAngle } from '@core/planet'
import { ASSET_PATHS } from '@/dev/constants'

// Configure store with all slices and containment middleware
const store = buildGameStore({})

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting shipMoveBitmap initialization...')

    // Load the release galaxy file to get planet data
    console.log('Loading galaxy file...')
    const response = await fetch(ASSET_PATHS.GALAXY_DATA)
    if (!response.ok) {
      throw new Error('Failed to load galaxy file')
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('Galaxy file loaded, size:', arrayBuffer.byteLength)

    const { parsePlanet } = await import('@core/planet/parsePlanet')
    const { Galaxy } = await import('@core/galaxy/methods')

    const { headerBuffer, planetsBuffer } = Galaxy.splitBuffer(arrayBuffer)
    const galaxyHeader = Galaxy.parseHeader(headerBuffer)
    console.log('Galaxy header:', galaxyHeader)

    // Load planet 1
    const planet1 = parsePlanet(planetsBuffer, galaxyHeader.indexes, 1)
    console.log('Planet 1 loaded:', {
      dimensions: `${planet1.worldwidth}x${planet1.worldheight}`,
      start: `(${planet1.xstart}, ${planet1.ystart})`,
      walls: planet1.lines.length,
      gravity: `(${planet1.gravx}, ${planet1.gravy})`
    })

    // Initialize planet
    store.dispatch(planetSlice.actions.loadPlanet(planet1))

    // Initialize walls with planet 1's walls
    store.dispatch(wallsSlice.actions.initWalls({ walls: planet1.lines }))

    // Initialize bunkers for animated bunker support
    store.dispatch(initializeBunkers())

    // Initialize fuel cells
    store.dispatch(initializeFuels())

    // Initialize status state
    store.dispatch(statusSlice.actions.initStatus())
    store.dispatch(statusSlice.actions.setPlanetBonus(planet1.planetbonus))

    // Initialize ship at center of screen (following Play.c:175-179)
    const shipScreenX = SCRWTH / 2 // 256
    const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2) // 159

    store.dispatch(
      shipSlice.actions.initShip({
        x: shipScreenX,
        y: shipScreenY,
        globalx: planet1.xstart, // Ship starts at planet's starting position
        globaly: planet1.ystart
      })
    )

    // Set the respawn position
    store.dispatch(
      shipSlice.actions.setStartPosition({
        x: shipScreenX,
        y: shipScreenY
      })
    )

    // Initialize screen position so ship appears at planet's starting position
    // screenx = globalx - shipx; screeny = globaly - shipy;
    store.dispatch(
      screenSlice.actions.setPosition({
        x: planet1.xstart - shipScreenX,
        y: planet1.ystart - shipScreenY
      })
    )

    initializationComplete = true
    console.log('shipMoveBitmap initialization complete')
  } catch (error) {
    console.error('Error initializing shipMoveBitmap:', error)
    initializationError = error as Error
  }
}

// Start initialization
void initializeGame()

const resetGame = (): void => {
  const state = store.getState()

  // Reset ship to center of screen
  const shipScreenX = SCRWTH / 2 // 256
  const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2) // 159

  store.dispatch(
    shipSlice.actions.initShip({
      x: shipScreenX,
      y: shipScreenY,
      globalx: state.planet.xstart, // Reset to starting global position
      globaly: state.planet.ystart
    })
  )

  // Reset screen position to planet's starting position
  store.dispatch(
    screenSlice.actions.resetScreen({
      x: state.planet.xstart - shipScreenX,
      y: state.planet.ystart - shipScreenY
    })
  )

  // Clear all shots
  store.dispatch(clearAllShots())
}

const getPressedControls = (keysDown: Set<string>): ShipControl[] => {
  const controls: ShipControl[] = []

  if (keysDown.has('KeyZ')) controls.push(ShipControl.LEFT)
  if (keysDown.has('KeyX')) controls.push(ShipControl.RIGHT)
  if (keysDown.has('Period')) controls.push(ShipControl.THRUST)
  if (keysDown.has('Slash')) controls.push(ShipControl.FIRE)
  if (keysDown.has('Space')) controls.push(ShipControl.SHIELD)

  return controls
}

/**
 * Bitmap renderer for ship movement game
 */
export const createShipMoveBitmapRenderer =
  (spriteService: SpriteService): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Check initialization status
    if (initializationError) {
      console.error('Initialization failed:', initializationError)
      const errorBitmap = { ...bitmap }
      errorBitmap.data.fill(0)
      return errorBitmap
    }

    if (!initializationComplete) {
      // Still loading
      const loadingBitmap = { ...bitmap }
      loadingBitmap.data.fill(0)
      return loadingBitmap
    }

    // Handle death countdown and respawn BEFORE getting state for the frame
    // This ensures we don't have stale state after respawn
    const prelimState = store.getState()
    if (prelimState.ship.deadCount > 0) {
      // Ship is dead - decrement counter and check for respawn
      store.dispatch(shipSlice.actions.decrementDeadCount())
      const newDeadCount = store.getState().ship.deadCount
      if (newDeadCount === 0) {
        store.dispatch(shipSlice.actions.respawnShip())

        // Clear explosion and shot state per init_ship() in Play.c:182-187
        // sparksalive = 0 (Play.c:182)
        store.dispatch(resetSparksAlive())
        // for(i=0; i<NUMSHOTS; i++) bunkshots[i].lifecount = 0 (Play.c:184-185)
        store.dispatch(clearBunkShots())
        // for(i=0; i<NUMSHARDS; i++) shards[i].lifecount = 0 (Play.c:186-187)
        store.dispatch(clearShards())

        // Update screen position to place ship at planet start position
        // globalx = xstart, globaly = ystart (from init_ship)
        // screenx = globalx - shipx, screeny = globaly - shipy
        const respawnState = store.getState()
        store.dispatch(
          screenSlice.actions.setPosition({
            x: respawnState.planet.xstart - respawnState.ship.shipx,
            y: respawnState.planet.ystart - respawnState.ship.shipy
          })
        )
      }
    }

    // NOW get the state for this frame - after any respawn updates
    const state = store.getState()

    // Check for ESC key to reset game
    if (frame.keysDown.has('Escape')) {
      resetGame()
      // Continue with normal rendering after reset
    }

    // Process ship controls and movement only if alive
    let globalx: number
    let globaly: number

    if (state.ship.deadCount === 0) {
      // Only handle controls and move ship if alive
      // shipControl will read globalx/globaly from ship state (set by previous frame's containShip)
      // and calculate gravity from generators
      store.dispatch(
        shipControl({
          controlsPressed: getPressedControls(frame.keysDown)
        })
      )

      // Move ship (Play.c:216 - move_ship())
      store.dispatch(shipSlice.actions.moveShip())

      // Apply containment after movement (Play.c:394-457 - contain_ship())
      // This handles screen wrapping and calculates global position correctly
      const currentState = store.getState()
      const contained = containShip(
        currentState.ship,
        currentState.screen,
        currentState.planet
      )

      // Update ship position if changed by containment
      // Also always update global position for next frame's shipControl
      if (
        contained.shipx !== currentState.ship.shipx ||
        contained.shipy !== currentState.ship.shipy ||
        contained.dx !== currentState.ship.dx ||
        contained.dy !== currentState.ship.dy ||
        contained.globalx !== currentState.ship.globalx ||
        contained.globaly !== currentState.ship.globaly
      ) {
        store.dispatch(
          shipSlice.actions.updatePosition({
            x: contained.shipx,
            y: contained.shipy,
            dx: contained.dx,
            dy: contained.dy,
            globalx: contained.globalx,
            globaly: contained.globaly
          })
        )
      }

      // Update screen position if changed by containment (includes wrapping)
      if (
        contained.screenx !== currentState.screen.screenx ||
        contained.screeny !== currentState.screen.screeny
      ) {
        store.dispatch(
          screenSlice.actions.updatePosition({
            x: contained.screenx,
            y: contained.screeny
          })
        )
      }

      // Use the global position calculated from wrapped screen coordinates
      globalx = contained.globalx
      globaly = contained.globaly
    } else {
      // Ship is dead, still need to calculate position for other systems
      globalx = state.screen.screenx + state.ship.shipx
      globaly = state.screen.screeny + state.ship.shipy
    }

    // Update bunker rotations for animated bunkers (GROUND, FOLLOW, GENERATOR)
    store.dispatch(updateBunkerRotations({ globalx, globaly }))

    // Update fuel cell animations
    store.dispatch(updateFuelAnimations())

    // Check if bunkers should shoot this frame (probabilistic based on shootslow)
    // From Bunkers.c:30-31: if (rint(100) < shootslow) bunk_shoot();
    // TESTING: Increased shot rate for easier testing (multiply by 20)
    const shootRoll = rint(100)
    if (shootRoll < state.planet.shootslow * 20) {
      // Calculate screen boundaries for shot eligibility
      const screenr = state.screen.screenx + SCRWTH
      const screenb = state.screen.screeny + VIEWHT

      store.dispatch(
        bunkShoot({
          screenx: state.screen.screenx,
          screenr: screenr,
          screeny: state.screen.screeny,
          screenb: screenb,
          bunkrecs: state.planet.bunkers,
          walls: state.planet.lines,
          worldwidth: state.planet.worldwidth,
          worldwrap: state.planet.worldwrap,
          globalx: globalx,
          globaly: globaly
        })
      )
    }

    store.dispatch(
      shotsSlice.actions.moveShipshots({
        bunkers: state.planet.bunkers,
        shipPosition: {
          x: globalx,
          y: globaly
        },
        shipAlive: state.ship.deadCount === 0,
        walls: state.planet.lines,
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap
      })
    )

    // Process bunker kills from ship shot collisions
    const shotsState = store.getState().shots
    if (shotsState.pendingBunkerKills.length > 0) {
      for (const bunkerIndex of shotsState.pendingBunkerKills) {
        const bunker = state.planet.bunkers[bunkerIndex]
        if (bunker) {
          // Dispatch killBunker (handles difficult bunkers internally)
          store.dispatch(killBunker({ index: bunkerIndex }))

          // Start explosion for destroyed bunker
          // Note: killBunker returns early for difficult bunkers that survive
          const updatedBunker = store.getState().planet.bunkers[bunkerIndex]
          if (updatedBunker && !updatedBunker.alive) {
            store.dispatch(
              startExplosion({
                x: bunker.x,
                y: bunker.y,
                dir: bunker.rot,
                kind: bunker.kind
              })
            )
          }
        }
      }
    }

    // Handle self-hit shield feedback (Play.c:790-791)
    if (shotsState.selfHitShield) {
      // Activate shield for one frame as feedback
      store.dispatch(shipSlice.actions.activateShieldFeedback())
      // Note: Shield will deactivate next frame unless SPACE key is held

      // TODO: Play sound (Play.c:791)
      // playSound(SHLD_SOUND)
    }

    // Move bunker shots with shield protection check
    // Calculate ship's global position for shield protection
    const currentState = store.getState()
    const shipGlobalX = currentState.screen.screenx + currentState.ship.shipx
    const shipGlobalY = currentState.screen.screeny + currentState.ship.shipy

    store.dispatch(
      moveBullets({
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap,
        walls: state.planet.lines,
        // Include ship data for shield protection
        shipGlobalX,
        shipGlobalY,
        shielding: currentState.ship.shielding
      })
    )

    // Update strafe lifecounts (Play.c:259 - do_strafes)
    // This decrements lifecount for active strafes
    store.dispatch(doStrafes())

    // Update explosions (shards and sparks)
    store.dispatch(
      updateExplosions({
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap,
        gravx: state.planet.gravx,
        gravy: state.planet.gravy,
        gravityPoints: state.planet.gravityPoints
      })
    )

    // Get final state for drawing
    const finalState = store.getState()

    // Check for ship death flash effect (Terrain.c:413 - set_screen(front_screen, 0L))
    if (finalState.explosions.shipDeathFlash) {
      // Fill viewport with white (preserve status bar)
      const whiteBitmap = viewWhite()(bitmap)

      // Clear the flash for next frame
      store.dispatch(clearShipDeathFlash())

      // Skip all other rendering and return early
      // The flash lasts exactly one frame
      return whiteBitmap
    }

    // First, create a crosshatch gray background using viewClear
    let resultBitmap = viewClear({
      screenX: finalState.screen.screenx,
      screenY: finalState.screen.screeny
    })(bitmap)

    // Draw craters (from Play.c:222 - draw_craters())
    // Craters are drawn early, after screen clear but before walls
    // Calculate on_right_side flag (Play.c:443)
    const on_right_side =
      finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH

    // Get crater images using existing getCraterSprite method
    const craterImages = {
      background1: spriteService.getCraterSprite({ variant: 'background1' })
        .uint8,
      background2: spriteService.getCraterSprite({ variant: 'background2' })
        .uint8
    }

    resultBitmap = drawCraters({
      craters: finalState.planet.craters,
      numcraters: finalState.planet.numcraters,
      scrnx: finalState.screen.screenx,
      scrny: finalState.screen.screeny,
      worldwidth: finalState.planet.worldwidth,
      on_right_side,
      craterImages
    })(resultBitmap)

    // Draw fuel cells (from Terrain.c - do_fuels is called after craters)
    // Get fuel sprites from service
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

    resultBitmap = drawFuels({
      fuels: finalState.planet.fuels,
      scrnx: finalState.screen.screenx,
      scrny: finalState.screen.screeny,
      fuelSprites
    })(resultBitmap)

    // Handle world wrapping for fuel cells
    if (on_right_side && finalState.planet.worldwrap) {
      resultBitmap = drawFuels({
        fuels: finalState.planet.fuels,
        scrnx: finalState.screen.screenx - finalState.planet.worldwidth,
        scrny: finalState.screen.screeny,
        fuelSprites
      })(resultBitmap)
    }

    // Setup viewport for wall rendering
    // Calculate screen bounds (right and bottom edges)
    const viewport = {
      x: finalState.screen.screenx,
      y: finalState.screen.screeny,
      b: finalState.screen.screeny + VIEWHT, // bottom edge
      r: finalState.screen.screenx + SCRWTH // right edge
    }

    // Draw ship using the proper fullFigure function
    const shipSprite = spriteService.getShipSprite(finalState.ship.shiprot, {
      variant: 'def'
    })
    const shipMaskSprite = spriteService.getShipSprite(
      finalState.ship.shiprot,
      { variant: 'mask' }
    )

    // Use pre-computed bitmap format
    const shipDefBitmap = shipSprite.bitmap
    const shipMaskBitmap = shipMaskSprite.bitmap

    const SHADOW_OFFSET_X = 8
    const SHADOW_OFFSET_Y = 5

    // Following Play.c order:
    // 1. gray_figure - ship shadow background (only if ship is alive)
    // Continue with the result bitmap

    // Draw status bar (happens before game rendering)
    // First clear with the template
    const statusBarTemplate = spriteService.getStatusBarTemplate()
    resultBitmap = sbarClear({ statusBarTemplate })(resultBitmap)

    // Then update with current values from state
    const statusData = {
      fuel: finalState.ship.fuel,
      lives: finalState.ship.lives,
      score: finalState.status.score,
      bonus: finalState.status.planetbonus,
      level: finalState.status.currentlevel,
      message: finalState.status.curmessage,
      spriteService
    }

    // Use newSbar for initial frame or major changes, updateSbar for incremental updates
    // For now, we'll use updateSbar each frame since it updates all fields
    resultBitmap = updateSbar(statusData)(resultBitmap)

    if (finalState.ship.deadCount === 0) {
      // Compute background patterns for y and y+1 positions
      const align0 = getAlignment({
        screenX: finalState.screen.screenx,
        screenY: finalState.screen.screeny,
        objectX: 0,
        objectY: 0
      })
      const align1 = getAlignment({
        screenX: finalState.screen.screenx,
        screenY: finalState.screen.screeny,
        objectX: 0,
        objectY: 1
      })
      const background: readonly [number, number] = [
        getBackgroundPattern(align0),
        getBackgroundPattern(align1)
      ]

      resultBitmap = grayFigure({
        x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
        y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
        def: shipMaskBitmap,
        background
      })(resultBitmap)
    }

    // 2. white_terrain - wall undersides/junctions
    resultBitmap = whiteTerrain({
      whites: finalState.walls.whites,
      junctions: finalState.walls.junctions,
      firstWhite: finalState.walls.firstWhite,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(resultBitmap)

    // 3. black_terrain(L_GHOST) - ghost walls
    resultBitmap = blackTerrain({
      thekind: LINE_KIND.GHOST,
      kindPointers: finalState.walls.kindPointers,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(resultBitmap)

    // 4. erase_figure - erase ship area (only if ship is alive)
    if (finalState.ship.deadCount === 0) {
      resultBitmap = eraseFigure({
        x: finalState.ship.shipx - SCENTER,
        y: finalState.ship.shipy - SCENTER,
        def: shipMaskBitmap
      })(resultBitmap)
    }

    // 5. check_for_bounce - check collision with bounce walls and update physics
    // This replaces the separate black_terrain(L_BOUNCE) call since checkForBounce
    // handles both rendering bounce walls and collision detection
    // Note: Bounce walls should always be rendered, even when ship is dead
    if (finalState.ship.deadCount === 0) {
      // Only check collision when alive
      resultBitmap = checkForBounce({
        screen: resultBitmap,
        store,
        shipDef: shipMaskBitmap,
        wallData: {
          kindPointers: finalState.walls.kindPointers,
          organizedWalls: finalState.walls.organizedWalls
        },
        viewport: viewport,
        worldwidth: finalState.planet.worldwidth
      })
    } else {
      // When dead, just draw bounce walls without collision check
      resultBitmap = blackTerrain({
        thekind: LINE_KIND.BOUNCE,
        kindPointers: finalState.walls.kindPointers,
        organizedWalls: finalState.walls.organizedWalls,
        viewport: viewport,
        worldwidth: finalState.planet.worldwidth
      })(resultBitmap)
    }

    // 6. black_terrain(L_NORMAL) - normal walls
    resultBitmap = blackTerrain({
      thekind: LINE_KIND.NORMAL,
      kindPointers: finalState.walls.kindPointers,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(resultBitmap)

    // 7. do_bunkers - render all bunkers
    // First pass - normal position (Bunkers.c:46 - "do_bunks(screenx, screeny);")
    resultBitmap = doBunks({
      bunkrec: finalState.planet.bunkers,
      scrnx: finalState.screen.screenx,
      scrny: finalState.screen.screeny,
      getSprite: (kind: BunkerKind, rotation: number) => {
        // Get sprites with proper variants
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
    })(resultBitmap)

    // Second pass - wrapped position (Bunkers.c:47-48)
    // "if (on_right_side) do_bunks(screenx-worldwidth, screeny);"
    if (on_right_side && finalState.planet.worldwrap) {
      resultBitmap = doBunks({
        bunkrec: finalState.planet.bunkers,
        scrnx: finalState.screen.screenx - finalState.planet.worldwidth,
        scrny: finalState.screen.screeny,
        getSprite: (kind: BunkerKind, rotation: number) => {
          // Get sprites with proper variants
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
      })(resultBitmap)
    }

    // 8. move_bullets - Draw bunker shots BEFORE collision check (Play.c:238-239)
    // This must happen before check_figure() so shots can kill the ship via pixel collision
    if (!finalState.ship.shielding) {
      // Shields prevent bunker shots from being drawn
      for (const shot of finalState.shots.bunkshots) {
        // Render shot if:
        // - Still alive (lifecount > 0), OR
        // - Just died without strafe (justDied && no strafe visual replacement)
        // This matches the DRAW_SHOT macro behavior (Macros.h:18-25)
        const shouldRender =
          shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

        if (shouldRender) {
          // Convert world coordinates to screen coordinates
          const shotx = shot.x - finalState.screen.screenx
          const shoty = shot.y - finalState.screen.screeny

          // Check if shot is visible on screen (matching DRAW_SHOT macro)
          if (
            shotx >= 0 &&
            shotx < SCRWTH - 1 &&
            shoty >= 0 &&
            shoty < VIEWHT - 1
          ) {
            resultBitmap = drawDotSafe(shotx, shoty, resultBitmap)
          }

          // Handle world wrapping for toroidal worlds
          if (
            finalState.planet.worldwrap &&
            finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH
          ) {
            const wrappedShotx =
              shot.x + finalState.planet.worldwidth - finalState.screen.screenx

            if (
              wrappedShotx >= 0 &&
              wrappedShotx < SCRWTH - 1 &&
              shoty >= 0 &&
              shoty < VIEWHT - 1
            ) {
              resultBitmap = drawDotSafe(wrappedShotx, shoty, resultBitmap)
            }
          }
        }
      }
    }

    // 9. Check for collision after drawing all lethal objects
    // Following Play.c:243-245 pattern
    // Only check collision if ship is alive
    if (finalState.ship.deadCount === 0) {
      const collision = checkFigure(resultBitmap, {
        x: finalState.ship.shipx - SCENTER,
        y: finalState.ship.shipy - SCENTER,
        height: 32, // SHIPHT
        def: shipMaskBitmap
      })

      if (collision) {
        // Ship collision detected - trigger death sequence

        // (a) Update ship state
        store.dispatch(shipSlice.actions.killShip())

        // (b) Death blast - destroy ONE nearby bunker (Play.c:338-346)
        // Recalculate global position using CURRENT ship position after movement
        // This fixes the bug where we were using stale position from before ship movement
        const deathState = store.getState()
        const deathGlobalX = deathState.screen.screenx + deathState.ship.shipx
        const deathGlobalY = deathState.screen.screeny + deathState.ship.shipy

        // Only kills bunkers in field of view for directional types
        const bunkers = deathState.planet.bunkers
        const BUNKROTKINDS = 2 // Kinds 0-1 are directional, 2+ are omnidirectional

        for (let index = 0; index < bunkers.length; index++) {
          const bunker = bunkers[index]!

          // Match original C logic: stop at first bunker with negative rot (sentinel value)
          // This marks the end of active bunkers in the array
          if (bunker.rot < 0) {
            break
          }

          if (
            bunker.alive &&
            xyindist(
              bunker.x - deathGlobalX,
              bunker.y - deathGlobalY,
              SKILLBRADIUS
            ) &&
            (bunker.kind >= BUNKROTKINDS || // Omnidirectional bunkers always killable
              legalAngle(
                bunker.rot,
                bunker.x,
                bunker.y,
                deathGlobalX,
                deathGlobalY
              )) // Directional need angle check
          ) {
            store.dispatch(killBunker({ index }))
            // TODO: Add score when score system is implemented
            // store.dispatch(addScore(SCOREBUNK))

            // Trigger bunker explosion
            store.dispatch(
              startExplosion({
                x: bunker.x,
                y: bunker.y,
                dir: bunker.rot,
                kind: bunker.kind
              })
            )
            break // Only kill ONE bunker per death (Play.c:345)
          }
        }

        // (c) Start ship explosion
        store.dispatch(startShipDeath({ x: deathGlobalX, y: deathGlobalY }))

        // (d) TODO: Play death sound when sound system is implemented
        // playSound(DEATH_SOUND)
      }
    }

    // 10. shift_figure - ship shadow (only if ship is alive)
    // 11. full_figure - draw ship (only if ship is alive)
    if (finalState.ship.deadCount === 0) {
      resultBitmap = shiftFigure({
        x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
        y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
        def: shipMaskBitmap
      })(resultBitmap)

      // Ship position needs to be offset by SCENTER (15) to account for center point
      // Original: full_figure(shipx-SCENTER, shipy-SCENTER, ship_defs[shiprot], ship_masks[shiprot], SHIPHT)
      resultBitmap = fullFigure({
        x: finalState.ship.shipx - SCENTER,
        y: finalState.ship.shipy - SCENTER,
        def: shipDefBitmap,
        mask: shipMaskBitmap
      })(resultBitmap)
    }

    // Draw shield effect if active (Play.c:252-255)
    if (finalState.ship.shielding) {
      // Draw shield using erase_figure (Play.c:254)
      const shieldSprite = spriteService.getShieldSprite()
      resultBitmap = eraseFigure({
        x: finalState.ship.shipx - SCENTER, // Same position as ship
        y: finalState.ship.shipy - SCENTER,
        def: shieldSprite.bitmap // shield_def (Figs.c:71)
      })(resultBitmap)

      // When shielding, draw bullets AFTER shield (Play.c:252-253)
      // Bullets are already destroyed by moveBullets reducer, but we still draw surviving ones
      for (const shot of finalState.shots.bunkshots) {
        // Render shot if still alive or just died without strafe
        const shouldRender =
          shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

        if (shouldRender) {
          // Convert world coordinates to screen coordinates
          const shotx = shot.x - finalState.screen.screenx
          const shoty = shot.y - finalState.screen.screeny

          // Check if shot is visible on screen
          if (
            shotx >= 0 &&
            shotx < SCRWTH - 1 &&
            shoty >= 0 &&
            shoty < VIEWHT - 1
          ) {
            resultBitmap = drawDotSafe(shotx, shoty, resultBitmap)
          }

          // Handle world wrapping for toroidal worlds
          if (
            finalState.planet.worldwrap &&
            finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH
          ) {
            const wrappedShotx =
              shot.x + finalState.planet.worldwidth - finalState.screen.screenx

            if (
              wrappedShotx >= 0 &&
              wrappedShotx < SCRWTH - 1 &&
              shoty >= 0 &&
              shoty < VIEWHT - 1
            ) {
              resultBitmap = drawDotSafe(wrappedShotx, shoty, resultBitmap)
            }
          }
        }
      }
    }

    // Draw all active ship shots
    for (const shot of finalState.shots.shipshots) {
      // Render shot if:
      // - Still alive (lifecount > 0), OR
      // - Just died without strafe (justDied && no strafe visual replacement)
      // This matches the original's behavior of showing shots for one frame
      // after lifecount reaches 0 (Play.c:807-811)
      const shouldRender =
        shot.lifecount > 0 || (shot.justDied === true && shot.strafedir < 0)

      if (shouldRender) {
        // Convert world coordinates to screen coordinates
        // Original: shotx = sp->x - screenx - 1; shoty = sp->y - screeny - 1;
        const shotx = shot.x - finalState.screen.screenx - 1
        const shoty = shot.y - finalState.screen.screeny - 1

        // Check if shot is visible on screen (original checks: shotx < SCRWTH-3)
        if (
          shotx >= 0 &&
          shotx < SCRWTH - 3 &&
          shoty >= 0 &&
          shoty < VIEWHT - 3
        ) {
          resultBitmap = drawShipShot({
            x: shotx,
            y: shoty
          })(resultBitmap)
        }

        // Handle world wrapping for toroidal worlds
        if (
          finalState.planet.worldwrap &&
          finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH
        ) {
          const wrappedShotx =
            shot.x +
            finalState.planet.worldwidth -
            finalState.screen.screenx -
            1
          if (wrappedShotx >= 0 && wrappedShotx < SCRWTH - 3) {
            resultBitmap = drawShipShot({
              x: wrappedShotx,
              y: shoty
            })(resultBitmap)
          }
        }
      }
    }

    if (finalState.ship.flaming) {
      // Get flame sprites from service
      const flameSprites = []
      for (let i = 0; i < 32; i++) {
        const flame = spriteService.getFlameSprite(i)
        flameSprites.push(flame.bitmap)
      }

      resultBitmap = flameOn({
        x: finalState.ship.shipx,
        y: finalState.ship.shipy,
        rot: finalState.ship.shiprot,
        flames: flameSprites
      })(resultBitmap)
    }

    // Draw strafes (Play.c:259 - do_strafes rendering loop)
    // Original: for(str=strafes; str < &strafes[NUMSTRAFES]; str++)
    //   if(str->lifecount) draw_strafe(str->x, str->y, str->rot, screenx, screeny);
    for (const strafe of finalState.shots.strafes) {
      if (strafe.lifecount > 0) {
        resultBitmap = drawStrafe({
          x: strafe.x,
          y: strafe.y,
          rot: strafe.rot,
          scrnx: finalState.screen.screenx,
          scrny: finalState.screen.screeny,
          worldwidth: finalState.planet.worldwidth
        })(resultBitmap)
      }
    }

    // Draw explosions (shards and sparks)
    // Check if any explosions are active
    const extendedState = finalState
    if (
      extendedState.explosions.sparksalive > 0 ||
      extendedState.explosions.shards.some(s => s.lifecount > 0)
    ) {
      // Get shard images from sprites - only getSprite is used by drawExplosions
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

      resultBitmap = drawExplosions({
        explosions: extendedState.explosions,
        screenx: finalState.screen.screenx,
        screeny: finalState.screen.screeny,
        worldwidth: finalState.planet.worldwidth,
        worldwrap: finalState.planet.worldwrap,
        shardImages
      })(resultBitmap)
    }

    return resultBitmap
  }
