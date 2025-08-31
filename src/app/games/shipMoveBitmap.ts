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
import { drawDotSafe } from '../../shots/render/drawDotSafe'
import { shipSlice } from '@/ship/shipSlice'
import {
  planetSlice,
  updateBunkerRotations,
  initializeBunkers,
  killBunker
} from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import {
  shotsSlice,
  clearAllShots,
  doStrafes,
  bunkShoot,
  moveBullets
} from '@/shots/shotsSlice'
import { ShipControl } from '@/ship/types'
import { shipControl } from './shipControlThunk'
import { buildGameStore } from './store'
import { SCRWTH, VIEWHT, TOPMARG, BOTMARG } from '@/screen/constants'
import type { SpriteServiceV2 } from '@/sprites/service'
import { SCENTER, type BunkerKind } from '@/figs/types'
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
import { checkForBounce } from '@/ship/physics/checkForBounce'
import { doBunks } from '@/planet/render/bunker'
import { rint } from '@/shared/rint'
import { 
  startShipDeath, 
  startExplosion,
  updateExplosions,
  explosionsSlice 
} from '@/explosions/explosionsSlice'
import { drawExplosions } from '@/explosions/render/drawExplosions'
import type { ShardSprite, ShardSpriteSet } from '@/figs/types'
import type { ExplosionsState } from '@/explosions/types'
import { SKILLBRADIUS } from '@/ship/constants'
import { xyindist } from '@/shots/xyindist'
import { legalAngle } from '@/planet/legalAngle'

// Configure store with all slices and containment middleware
const store = buildGameStore({
  explosions: explosionsSlice.reducer
})

// Type for our extended state
type ExtendedGameState = ReturnType<typeof store.getState> & {
  explosions: ExplosionsState
}

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

    // Initialize bunkers for animated bunker support
    store.dispatch(initializeBunkers())
    

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
    shipSlice.actions.resetShip({
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

    // Handle death countdown and respawn BEFORE getting state for the frame
    // This ensures we don't have stale state after respawn
    const prelimState = store.getState()
    if (prelimState.ship.deadCount > 0) {
      // Ship is dead - decrement counter and check for respawn
      store.dispatch(shipSlice.actions.decrementDeadCount())
      const newDeadCount = store.getState().ship.deadCount
      if (newDeadCount === 0) {
        store.dispatch(shipSlice.actions.respawnShip())
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

    // Get gravity from planet
    const gravity = {
      x: state.planet.gravx,
      y: state.planet.gravy
    }

    // Process ship controls and movement only if alive
    if (state.ship.deadCount === 0) {
      // Only handle controls and move ship if alive
      store.dispatch(
        shipControl({
          controlsPressed: getPressedControls(frame.keysDown),
          gravity
        })
      )
      
      // Move ship - containment middleware will automatically apply
      store.dispatch(shipSlice.actions.moveShip())
    }
    
    // Move all bullets with collision detection
    // Calculate global ship position (screen + ship relative position)
    const globalx = state.screen.screenx + state.ship.shipx
    const globaly = state.screen.screeny + state.ship.shipy

    // Update bunker rotations for animated bunkers (GROUND, FOLLOW, GENERATOR)
    store.dispatch(updateBunkerRotations({ globalx, globaly }))
    

    // Check if bunkers should shoot this frame (probabilistic based on shootslow)
    // From Bunkers.c:30-31: if (rint(100) < shootslow) bunk_shoot();
    const shootRoll = rint(100)
    if (shootRoll < state.planet.shootslow) {
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

    // Move bunker shots
    store.dispatch(
      moveBullets({
        worldwidth: state.planet.worldwidth,
        worldwrap: state.planet.worldwrap
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
        gravityVector: (_x: number, _y: number) => ({
          xg: state.planet.gravx,
          yg: state.planet.gravy
        })
      })
    )

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
    // 1. gray_figure - ship shadow background (only if ship is alive)
    let renderedBitmap = bitmap
    
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

      renderedBitmap = grayFigure({
        x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
        y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
        def: shipMaskBitmap,
        background
      })(renderedBitmap)
    }

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

    // 4. erase_figure - erase ship area (only if ship is alive)
    if (finalState.ship.deadCount === 0) {
      renderedBitmap = eraseFigure({
        x: finalState.ship.shipx - SCENTER,
        y: finalState.ship.shipy - SCENTER,
        def: shipMaskBitmap
      })(renderedBitmap)
    }

    // 5. check_for_bounce - check collision with bounce walls and update physics
    // This replaces the separate black_terrain(L_BOUNCE) call since checkForBounce
    // handles both rendering bounce walls and collision detection
    // Note: Bounce walls should always be rendered, even when ship is dead
    if (finalState.ship.deadCount === 0) {
      // Only check collision when alive
      renderedBitmap = checkForBounce({
        screen: renderedBitmap,
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
      renderedBitmap = blackTerrain({
        thekind: LINE_KIND.BOUNCE,
        kindPointers: finalState.walls.kindPointers,
        organizedWalls: finalState.walls.organizedWalls,
        viewport: viewport,
        worldwidth: finalState.planet.worldwidth
      })(renderedBitmap)
    }

    // 6. black_terrain(L_NORMAL) - normal walls
    renderedBitmap = blackTerrain({
      thekind: LINE_KIND.NORMAL,
      kindPointers: finalState.walls.kindPointers,
      organizedWalls: finalState.walls.organizedWalls,
      viewport: viewport,
      worldwidth: finalState.planet.worldwidth
    })(renderedBitmap)

    // 7. do_bunkers - render all bunkers
    renderedBitmap = doBunks({
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
    })(renderedBitmap)

    // Check for collision after drawing all lethal objects
    // Following Play.c:243-245 pattern
    // Only check collision if ship is alive
    if (finalState.ship.deadCount === 0) {
      const collision = checkFigure(renderedBitmap, {
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
            xyindist(bunker.x - deathGlobalX, bunker.y - deathGlobalY, SKILLBRADIUS) &&
            (bunker.kind >= BUNKROTKINDS || // Omnidirectional bunkers always killable
             legalAngle(bunker.rot, bunker.x, bunker.y, deathGlobalX, deathGlobalY)) // Directional need angle check
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

    // 8. shift_figure - ship shadow (only if ship is alive)
    // 9. full_figure - draw ship (only if ship is alive)
    if (finalState.ship.deadCount === 0) {
      renderedBitmap = shiftFigure({
        x: finalState.ship.shipx - (SCENTER - SHADOW_OFFSET_X),
        y: finalState.ship.shipy - (SCENTER - SHADOW_OFFSET_Y),
        def: shipMaskBitmap
      })(renderedBitmap)

      // Ship position needs to be offset by SCENTER (15) to account for center point
      // Original: full_figure(shipx-SCENTER, shipy-SCENTER, ship_defs[shiprot], ship_masks[shiprot], SHIPHT)
      renderedBitmap = fullFigure({
        x: finalState.ship.shipx - SCENTER,
        y: finalState.ship.shipy - SCENTER,
        def: shipDefBitmap,
        mask: shipMaskBitmap
      })(renderedBitmap)
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

    // Draw bunker shots (2x2 dots)
    for (const shot of finalState.shots.bunkshots) {
      if (shot.lifecount > 0) {
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
          renderedBitmap = drawDotSafe(shotx, shoty, renderedBitmap)
        }

        // Handle world wrapping for toroidal worlds
        if (
          finalState.planet.worldwrap &&
          finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH
        ) {
          const wrappedShotx =
            shot.x + finalState.planet.worldwidth - finalState.screen.screenx

          if (wrappedShotx >= 0 && wrappedShotx < SCRWTH - 1) {
            renderedBitmap = drawDotSafe(wrappedShotx, shoty, renderedBitmap)
          }
        }
      }
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

    // Draw explosions (shards and sparks)
    // Check if any explosions are active
    const extendedState = finalState as ExtendedGameState
    if (extendedState.explosions.sparksalive > 0 || 
        extendedState.explosions.shards.some(s => s.lifecount > 0)) {
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

      renderedBitmap = drawExplosions({
        explosions: extendedState.explosions,
        screenx: finalState.screen.screenx,
        screeny: finalState.screen.screeny,
        worldwidth: finalState.planet.worldwidth,
        worldwrap: finalState.planet.worldwrap,
        shardImages
      })(renderedBitmap)
    }

    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)
  }
