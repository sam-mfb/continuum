/**
 * Ship Move Bitmap Game
 *
 * A bitmap-based version of the ship movement game that uses the
 * proper rendering functions for drawing the ship and bullets.
 * Combines shipMove.ts logic with bitmap rendering like wallDrawing.ts.
 */

import type { BitmapRenderer } from '../../bitmap'
import { fullFigure } from '../../ship/render/fullFigure'
import { drawShipShot } from '../../shots/render/drawShipShot'
import { drawStrafe } from '../../shots/render/drawStrafe'
import { shipSlice } from '@/ship/shipSlice'
import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { shotsSlice, clearAllShots, doStrafes } from '@/shots/shotsSlice'
import { ShipControl } from '@/ship/types'
import { shipControl } from './shipControlThunk'
import { buildGameStore } from './store'
import { SCRWTH, VIEWHT, TOPMARG, BOTMARG } from '@/screen/constants'
import type { SpriteServiceV2 } from '@/sprites/service'
import { SCENTER } from '@/figs/types'
import { flameOn } from '@/ship/render/flameOn'
import { grayFigure } from '@/ship/render/grayFigure'
import { eraseFigure } from '@/ship/render/eraseFigure'
import { getAlignment } from '@/shared/alignment'
import { getBackgroundPattern } from '@/shared/backgroundPattern'
import { shiftFigure } from '@/ship/render/shiftFigure'
import { whiteTerrain, blackTerrain } from '@/walls/render'
import { wallsSlice } from '@/walls/wallsSlice'
import { viewClear } from '@/screen/render'
import { LINE_KIND } from '@/walls/types'
import { checkFigure } from '@/collision/checkFigure'

// Configure store with all slices and containment middleware
const store = buildGameStore()

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting shipMoveBitmap initialization...')

    // Load the release galaxy file to get planet data
    console.log('Loading galaxy file...')
    const response = await fetch('/src/assets/release_galaxy.bin')
    if (!response.ok) {
      throw new Error('Failed to load galaxy file')
    }

    const arrayBuffer = await response.arrayBuffer()
    console.log('Galaxy file loaded, size:', arrayBuffer.byteLength)

    const { parsePlanet } = await import('@/planet/parsePlanet')
    const { Galaxy } = await import('@/galaxy/methods')

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

    // Initialize ship at center of screen (following Play.c:175-179)
    const shipScreenX = SCRWTH / 2 // 256
    const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2) // 159

    store.dispatch(
      shipSlice.actions.initShip({
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
    shipSlice.actions.resetShip({
      x: shipScreenX,
      y: shipScreenY
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
  (spriteService: SpriteServiceV2): BitmapRenderer =>
  (bitmap, frame, _env) => {
    // Check initialization status
    if (initializationError) {
      console.error('Initialization failed:', initializationError)
      bitmap.data.fill(0)
      return
    }

    if (!initializationComplete) {
      // Still loading
      bitmap.data.fill(0)
      return
    }

    const state = store.getState()

    // Check for ESC key to reset game
    if (frame.keysDown.has('Escape')) {
      resetGame()
      // Continue with normal rendering after reset
    }

    // Get gravity from planet
    const gravity = {
      x: state.planet.gravx,
      y: state.planet.gravy
    }

    // Handle controls
    store.dispatch(
      shipControl({
        controlsPressed: getPressedControls(frame.keysDown),
        gravity
      })
    )

    // Move ship - containment middleware will automatically apply
    store.dispatch(shipSlice.actions.moveShip())

    // Move all bullets with collision detection
    // Calculate global ship position (screen + ship relative position)
    const globalx = state.screen.screenx + state.ship.shipx
    const globaly = state.screen.screeny + state.ship.shipy

    store.dispatch(
      shotsSlice.actions.moveShipshots({
        bunkers: state.planet.bunkers,
        shipPosition: {
          x: globalx,
          y: globaly
        },
        shipAlive: true, // TODO: Check if ship is dead when death system is implemented
        walls: state.planet.lines,
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap
      })
    )

    // Update strafe lifecounts (Play.c:259 - do_strafes)
    // This decrements lifecount for active strafes
    store.dispatch(doStrafes())

    // Get final state for drawing
    const finalState = store.getState()

    // First, create a crosshatch gray background using viewClear
    const clearedBitmap = viewClear({
      screenX: finalState.screen.screenx,
      screenY: finalState.screen.screeny
    })(bitmap)

    // Copy cleared bitmap data back to original
    bitmap.data.set(clearedBitmap.data)

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
    // 1. gray_figure - ship shadow background
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

    let renderedBitmap = grayFigure({
      x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap,
      background
    })(bitmap)

    // 2. white_terrain - wall undersides/junctions
    renderedBitmap = whiteTerrain({
      whites: finalState.walls.whites,
      junctions: finalState.walls.junctions,
      firstWhite: finalState.walls.firstWhite,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(renderedBitmap)

    // 3. black_terrain(L_GHOST) - ghost walls
    renderedBitmap = blackTerrain({
      thekind: LINE_KIND.GHOST,
      kindPointers: finalState.walls.kindPointers,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(renderedBitmap)

    // 4. erase_figure - erase ship area
    renderedBitmap = eraseFigure({
      x: finalState.ship.shipx - SCENTER,
      y: finalState.ship.shipy - SCENTER,
      def: shipMaskBitmap
    })(renderedBitmap)

    // 5. check_for_bounce would go here (not implemented yet)

    // 6. black_terrain(L_BOUNCE) - bounce walls
    renderedBitmap = blackTerrain({
      thekind: LINE_KIND.BOUNCE,
      kindPointers: finalState.walls.kindPointers,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(renderedBitmap)

    // 7. black_terrain(L_NORMAL) - normal walls
    renderedBitmap = blackTerrain({
      thekind: LINE_KIND.NORMAL,
      kindPointers: finalState.walls.kindPointers,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(renderedBitmap)

    // 8. do_bunkers would go here (not implemented yet)

    // Check for collision after drawing all lethal objects
    // Following Play.c:243-245 pattern
    const collision = checkFigure(renderedBitmap, {
      x: finalState.ship.shipx - SCENTER,
      y: finalState.ship.shipy - SCENTER,
      height: 32, // SHIPHT
      def: shipMaskBitmap
    })

    if (collision) {
      resetGame()
      // Continue rendering to show the reset state
    }

    // 9. shift_figure - ship shadow
    renderedBitmap = shiftFigure({
      x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
      y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
      def: shipMaskBitmap
    })(renderedBitmap)

    // 10. full_figure - draw ship
    // Ship position needs to be offset by SCENTER (15) to account for center point
    // Original: full_figure(shipx-SCENTER, shipy-SCENTER, ship_defs[shiprot], ship_masks[shiprot], SHIPHT)
    renderedBitmap = fullFigure({
      x: finalState.ship.shipx - SCENTER,
      y: finalState.ship.shipy - SCENTER,
      def: shipDefBitmap,
      mask: shipMaskBitmap
    })(renderedBitmap)

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
          renderedBitmap = drawShipShot({
            x: shotx,
            y: shoty
          })(renderedBitmap)
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
            renderedBitmap = drawShipShot({
              x: wrappedShotx,
              y: shoty
            })(renderedBitmap)
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

      renderedBitmap = flameOn({
        x: finalState.ship.shipx,
        y: finalState.ship.shipy,
        rot: finalState.ship.shiprot,
        flames: flameSprites
      })(renderedBitmap)
    }

    // Draw strafes (Play.c:259 - do_strafes rendering loop)
    // Original: for(str=strafes; str < &strafes[NUMSTRAFES]; str++)
    //   if(str->lifecount) draw_strafe(str->x, str->y, str->rot, screenx, screeny);
    for (const strafe of finalState.shots.strafes) {
      if (strafe.lifecount > 0) {
        renderedBitmap = drawStrafe({
          x: strafe.x,
          y: strafe.y,
          rot: strafe.rot,
          scrnx: finalState.screen.screenx,
          scrny: finalState.screen.screeny,
          worldwidth: finalState.planet.worldwidth
        })(renderedBitmap)
      }
    }

    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)
  }
