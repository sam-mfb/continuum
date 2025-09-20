/**
 * Main Game Loop
 *
 * Full game implementation with level progression, lives management,
 * and game over/restart functionality. Based on shipMoveBitmap demo
 * but with complete game flow.
 */

import type { Store } from '@reduxjs/toolkit'
import type { BitmapRenderer, MonochromeBitmap } from '@lib/bitmap'
import { fullFigure } from '@core/ship'
import { drawShipShot } from '@core/shots'
import { drawStrafe } from '@core/shots'
import { drawDotSafe } from '@core/shots'
import {
  updateBunkerRotations,
  updateFuelAnimations,
  killBunker
} from '@core/planet'
import {
  shotsSlice,
  doStrafes,
  bunkShoot,
  moveBullets,
  clearBunkShots
} from '@core/shots'
import { ShipControl, shipControl, shipSlice, CRITFUEL } from '@core/ship'
import { statusSlice } from '@core/status'
import { SCRWTH, VIEWHT, screenSlice } from '@core/screen'
import type { SpriteServiceV2 } from '@core/sprites'
import { SCENTER, type BunkerKind } from '@core/figs/types'
import { flameOn } from '@core/ship'
import { grayFigure } from '@core/ship'
import { eraseFigure } from '@core/ship'
import { getAlignment } from '@core/shared'
import { getBackgroundPattern } from '@core/shared'
import { shiftFigure } from '@core/ship'
import { whiteTerrain, blackTerrain } from '@core/walls'
import { viewClear, viewWhite } from '@core/screen'
import { LINE_KIND } from '@core/walls'
import { updateSbar, sbarClear } from '@core/status'
import { checkFigure } from '@core/ship'
import { checkForBounce } from '@core/ship'
import { doBunks } from '@core/planet'
import { drawCraters } from '@core/planet'
import { drawFuels } from '@core/planet'
import { rint } from '@core/shared'
import {
  startShipDeath,
  startExplosion,
  updateExplosions,
  clearShipDeathFlash,
  resetSparksAlive,
  clearShards
} from '@core/explosions'
import { drawExplosions } from '@core/explosions'
import type { ShardSprite, ShardSpriteSet } from '@core/figs/types'
import { SKILLBRADIUS } from '@core/ship'
import { xyindist } from '@core/shots'
import { legalAngle } from '@core/planet'
import { getGalaxyService } from '@core/galaxy'
import type { GalaxyHeader } from '@core/galaxy'
import { containShip } from '@core/shared/containShip'
import {
  resetFrame,
  playDiscrete,
  setThrusting,
  setShielding
} from '@core/sound/soundSlice'
import { playSounds } from '@core/sound/soundPlayer'
import {
  initializeSoundService,
  cleanupSoundService
} from '@core/sound/service'
import type { SoundUIState } from '@core/sound/soundSlice'
import { SoundType } from '@core/sound/constants'
import {
  startLevelTransitionThunk,
  updateTransition
} from '@core/transition'

// Game-specific imports
import {
  loadGalaxyHeader,
  markLevelComplete,
  triggerGameOver,
  resetGame,
  setMode,
  setPendingHighScore
} from './gameSlice'
import {
  checkLevelComplete,
  loadLevel
} from './levelManager'
import { TOTAL_INITIAL_LIVES } from './constants'
import { store, type RootState } from './store'

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

// Initialize game on module load
const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting game initialization...')

    // Initialize sound service
    console.log('Initializing sound service...')
    try {
      // Get initial sound settings from our store
      const soundState = store.getState().sound as SoundUIState
      await initializeSoundService({
        volume: soundState.volume,
        enabled: soundState.enabled
      })
      console.log('Sound service initialized successfully')
    } catch (soundError) {
      console.warn('Failed to initialize sound service:', soundError)
      // Continue without sound - game is still playable
    }

    // Load the release galaxy file using the service
    console.log('Loading galaxy file...')
    const galaxyService = getGalaxyService()
    const galaxyHeader = await galaxyService.loadGalaxy()
    console.log('Galaxy header:', galaxyHeader)
    console.log(`Galaxy contains ${galaxyHeader.planets} levels`)

    // Store galaxy header in Redux (no ArrayBuffer)
    store.dispatch(loadGalaxyHeader(galaxyHeader))

    // Initialize lives (TOTAL_INITIAL_LIVES includes current ship + spare ships)
    store.dispatch(shipSlice.actions.setLives(TOTAL_INITIAL_LIVES))

    // Initialize status (score, bonus, etc.)
    store.dispatch(statusSlice.actions.initStatus())

    // Load level 1 using the level manager
    loadLevel(store as Store<RootState>, 1)

    initializationComplete = true
    console.log('Game initialization complete')
  } catch (error) {
    console.error('Error initializing game:', error)
    initializationError = error as Error
  }
}

// Start initialization
void initializeGame()

// No longer need a separate resetGame function - handled by level manager

/**
 * Trigger ship death sequence - extracted for reuse
 * Handles all death logic including bunker destruction, explosions, and sounds
 */
const triggerShipDeath = (store: Store<RootState>): void => {
  // (a) Update ship state
  store.dispatch(shipSlice.actions.killShip())

  // (b) Death blast - destroy ONE nearby bunker (Play.c:338-346)
  // Use global position from state (already calculated by containShip)
  const deathState = store.getState()
  const deathGlobalX = deathState.ship.globalx
  const deathGlobalY = deathState.ship.globaly

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
        legalAngle(bunker.rot, bunker.x, bunker.y, deathGlobalX, deathGlobalY)) // Directional need angle check
    ) {
      store.dispatch(killBunker({ index }))

      // Check if bunker was actually destroyed (difficult bunkers might survive)
      const updatedBunker = store.getState().planet.bunkers[index]
      if (!updatedBunker || !updatedBunker.alive) {
        // Play bunker explosion sound - Play.c:368
        store.dispatch(playDiscrete(SoundType.EXP1_SOUND))

        // Award score for bunker destruction (Play.c:365-366)
        store.dispatch(
          statusSlice.actions.scoreBunker({
            kind: bunker.kind,
            rot: bunker.rot
          })
        )
      }

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

  // (d) Play ship explosion sound (high priority) - Terrain.c:414
  store.dispatch(playDiscrete(SoundType.EXP2_SOUND))

  // (e) Stop any continuous sounds when ship dies
  store.dispatch(setThrusting(false))
  store.dispatch(setShielding(false))
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
 * Main game renderer with level progression and game over handling
 */
export const createGameRenderer =
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

    // Reset sound accumulator for new frame
    store.dispatch(resetFrame())

    // Decrement bonus countdown every 10 frames (Play.c:197-201)
    // Original: bonuscount decrements each frame from 10 to 0
    // When it hits 0 (after 10 frames), planetbonus -= 10 and bonuscount resets
    if (!state.transition.active) {
      if (frame.frameCount % 10 === 0) {
        store.dispatch(statusSlice.actions.decrementBonus())
      }
    }

    // Note: Level transitions are now handled by the fizz effect completion
    // Game over transitions still need handling (TODO: implement game over fizz)

    // Check for level completion (only if not already transitioning)
    if (!state.transition.active && checkLevelComplete(state)) {
      console.log(`Level ${state.status.currentlevel} complete!`)

      // Award bonus points (Play.c:107 - score_plus(planetbonus))
      const bonusPoints = state.status.planetbonus
      if (bonusPoints > 0) {
        store.dispatch(statusSlice.actions.addScore(bonusPoints))
        console.log(`Awarded ${bonusPoints} bonus points`)
      }

      // Award extra life for completing level (Main.c:683 - numships++)
      store.dispatch(shipSlice.actions.extraLife())
      console.log('Awarded extra life for level completion')

      store.dispatch(markLevelComplete())
      store.dispatch(statusSlice.actions.setMessage('MISSION COMPLETE'))
      // Don't stop ship yet - it keeps moving during the countdown!
      // Ship can even die during this period (Play.c:109-113)

      // Start transition using thunk
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(store.dispatch as any)(startLevelTransitionThunk())
    }

    // Check for game over (all lives lost)
    if (
      !state.game.gameOver &&
      state.ship.lives <= 0 &&
      state.ship.deadCount === 0
    ) {
      console.log('Game Over - All lives lost')
      store.dispatch(triggerGameOver())

      // Check if score qualifies for high score table
      const fullState = store.getState() as RootState
      const { status, highscore } = fullState

      // Find the lowest high score
      const lowestScore = Math.min(
        ...Object.values(highscore).map(hs => hs.score || 0)
      )

      // Stop all sounds when game ends
      cleanupSoundService()

      // Check if eligible and qualifies for high score
      if (status.highScoreEligible && status.score > lowestScore) {
        // Set pending high score and switch to entry mode
        store.dispatch(
          setPendingHighScore({
            score: status.score,
            planet: status.currentlevel,
            fuel: state.ship.fuel
          })
        )
      } else {
        // Just show game over screen
        store.dispatch(setMode('gameOver'))
      }

      // Reset everything for a new game
      store.dispatch(resetGame())
      store.dispatch(shipSlice.actions.setLives(TOTAL_INITIAL_LIVES))
      store.dispatch(statusSlice.actions.initStatus())
      loadLevel(store, 1)
    }

    // Process ship controls and movement only if alive
    let globalx: number
    let globaly: number
    let on_right_side: boolean

    if (state.ship.deadCount === 0) {
      // Check for self-destruct command (A key) - must be alive to trigger
      if (frame.keysDown.has('KeyA')) {
        triggerShipDeath(store)
        // Skip normal controls and movement since ship is now dead
      } else {
        // Only handle controls if not in fizz transition (but allow during pre-delay)
        if (!state.transition.active || state.transition.preDelayFrames > 0) {
          // shipControl will read globalx/globaly from ship state (set by previous frame's containShip)
          store.dispatch(
            shipControl({
              controlsPressed: getPressedControls(frame.keysDown)
            })
          )

          // Move ship (Play.c:216 - move_ship())
          store.dispatch(shipSlice.actions.moveShip())
        }
      }

      // Check and update fuel messages (replaces fuel_minus(0) from Play.c:169,1022)
      // This needs to happen after ship movement which consumes fuel
      const fuelState = store.getState()
      const currentFuel = fuelState.ship.fuel
      const currentMessage = fuelState.status.curmessage

      if (currentFuel === 0 && currentMessage !== 'OUT OF FUEL') {
        store.dispatch(statusSlice.actions.setMessage('OUT OF FUEL'))
      } else if (
        currentFuel < CRITFUEL &&
        currentFuel > 0 &&
        currentMessage !== 'FUEL CRITICAL'
      ) {
        store.dispatch(statusSlice.actions.setMessage('FUEL CRITICAL'))
      } else if (
        currentFuel >= CRITFUEL &&
        (currentMessage === 'FUEL CRITICAL' || currentMessage === 'OUT OF FUEL')
      ) {
        store.dispatch(statusSlice.actions.setMessage(null))
      }

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
      // This is the critical fix - globalx/globaly are calculated AFTER screen wrapping
      globalx = contained.globalx
      globaly = contained.globaly
      on_right_side = contained.on_right_side
    } else {
      // Ship is dead, still need to use position for other systems
      globalx = state.ship.globalx
      globaly = state.ship.globaly
      on_right_side = state.screen.screenx > state.planet.worldwidth - SCRWTH
    }

    // Update bunker rotations for animated bunkers (GROUND, FOLLOW, GENERATOR)
    store.dispatch(updateBunkerRotations({ globalx, globaly }))

    // Update fuel cell animations
    store.dispatch(updateFuelAnimations())

    // Check if bunkers should shoot this frame (probabilistic based on shootslow)
    // From Bunkers.c:30-31: if (rint(100) < shootslow) bunk_shoot();
    const shootRoll = rint(100)
    if (shootRoll < state.planet.shootslow) {
      // Calculate screen boundaries for shot eligibility
      const screenr = state.screen.screenx + SCRWTH
      const screenb = state.screen.screeny + VIEWHT

      // Store current shot count to detect if a bunker fired
      const prevShotCount = state.shots.bunkshots.filter(
        s => s.lifecount > 0
      ).length

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

      // Check if a bunker actually fired by comparing shot counts
      const newState = store.getState()
      const newShotCount = newState.shots.bunkshots.filter(
        s => s.lifecount > 0
      ).length

      if (newShotCount > prevShotCount) {
        // A bunker fired - find the new shot and use its origin for proximity
        const newShot = newState.shots.bunkshots.find(
          (s, i) =>
            s.lifecount > 0 &&
            (!state.shots.bunkshots[i] ||
              state.shots.bunkshots[i]!.lifecount === 0)
        )

        if (newShot && newShot.origin) {
          const SOFTBORDER = 200 // From GW.h
          const { x: bunkx, y: bunky } = newShot.origin

          // Check if bunker is visible on screen
          if (
            bunkx > state.screen.screenx &&
            bunkx < screenr &&
            bunky > state.screen.screeny &&
            bunky < screenb
          ) {
            store.dispatch(playDiscrete(SoundType.BUNK_SOUND))
          }
          // Check if bunker is within SOFTBORDER of screen
          else if (
            bunkx > state.screen.screenx - SOFTBORDER &&
            bunkx < screenr + SOFTBORDER &&
            bunky > state.screen.screeny - SOFTBORDER &&
            bunky < screenb + SOFTBORDER
          ) {
            store.dispatch(playDiscrete(SoundType.SOFT_SOUND))
          }
        }
        // 'distant' bunkers make no sound
      }
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
            // Play bunker explosion sound - Play.c:368
            store.dispatch(playDiscrete(SoundType.EXP1_SOUND))

            // Award score for bunker destruction (Play.c:365-366)
            store.dispatch(
              statusSlice.actions.scoreBunker({
                kind: bunker.kind,
                rot: bunker.rot
              })
            )

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

      // Play shield sound as discrete (not continuous) - Play.c:791
      store.dispatch(playDiscrete(SoundType.SHLD_SOUND))
    }

    // Move bunker shots with shield protection check
    // Re-read state to get current values after previous dispatches
    const currentState = store.getState()

    store.dispatch(
      moveBullets({
        worldwidth: currentState.planet.worldwidth,
        worldwrap: currentState.planet.worldwrap,
        walls: currentState.planet.lines,
        // Include ship data for shield protection
        shipGlobalX: currentState.ship.globalx,
        shipGlobalY: currentState.ship.globaly,
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
      bitmap.data.set(whiteBitmap.data)

      // Clear the flash for next frame
      store.dispatch(clearShipDeathFlash())

      // Play accumulated sounds before returning (important for 'A' key death!)
      const deathFlashSoundState = store.getState().sound
      playSounds(deathFlashSoundState, {
        shipDeadCount: finalState.ship.deadCount,
        fizzActive: false
      })

      // Skip all other rendering and return early
      // The flash lasts exactly one frame
      return
    }

    // First, create a crosshatch gray background using viewClear
    const clearedBitmap = viewClear({
      screenX: finalState.screen.screenx,
      screenY: finalState.screen.screeny
    })(bitmap)

    // Copy cleared bitmap data back to original
    bitmap.data.set(clearedBitmap.data)

    // Draw craters (from Play.c:222 - draw_craters())
    // Craters are drawn early, after screen clear but before walls
    // Recalculate on_right_side flag for drawing (may have changed since earlier)
    // (Play.c:443 - on_right_side = screenx > worldwidth - SCRWTH)
    on_right_side =
      finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH

    // Get crater images using existing getCraterSprite method
    const craterImages = {
      background1: spriteService.getCraterSprite({ variant: 'background1' })
        .uint8,
      background2: spriteService.getCraterSprite({ variant: 'background2' })
        .uint8
    }

    const crateredBitmap = drawCraters({
      craters: finalState.planet.craters,
      numcraters: finalState.planet.numcraters,
      scrnx: finalState.screen.screenx,
      scrny: finalState.screen.screeny,
      worldwidth: finalState.planet.worldwidth,
      on_right_side,
      craterImages
    })(bitmap)

    // Copy cratered bitmap data back
    bitmap.data.set(crateredBitmap.data)

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

    const fuelBitmap = drawFuels({
      fuels: finalState.planet.fuels,
      scrnx: finalState.screen.screenx,
      scrny: finalState.screen.screeny,
      fuelSprites
    })(bitmap)

    // Copy fuel bitmap data back
    bitmap.data.set(fuelBitmap.data)

    // Handle world wrapping for fuel cells
    if (on_right_side && finalState.planet.worldwrap) {
      const wrappedFuelBitmap = drawFuels({
        fuels: finalState.planet.fuels,
        scrnx: finalState.screen.screenx - finalState.planet.worldwidth,
        scrny: finalState.screen.screeny,
        fuelSprites
      })(bitmap)
      bitmap.data.set(wrappedFuelBitmap.data)
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
    let renderedBitmap = bitmap

    // Draw status bar (happens before game rendering)
    // First clear with the template
    const statusBarTemplate = spriteService.getStatusBarTemplate()
    renderedBitmap = sbarClear({ statusBarTemplate })(renderedBitmap)

    // Then update with current values from state
    const extState = finalState
    const statusData = {
      fuel: finalState.ship.fuel,
      lives: finalState.ship.lives,
      score: finalState.status.score,
      bonus: finalState.status.planetbonus,
      level: extState.status.currentlevel, // Use status's current level
      message: finalState.status.curmessage,
      spriteService
    }

    // Use newSbar for initial frame or major changes, updateSbar for incremental updates
    // For now, we'll use updateSbar each frame since it updates all fields
    renderedBitmap = updateSbar(statusData)(renderedBitmap)

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
    // First pass - normal position (Bunkers.c:46 - "do_bunks(screenx, screeny);")
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

    // Second pass - wrapped position (Bunkers.c:47-48)
    // "if (on_right_side) do_bunks(screenx-worldwidth, screeny);"
    if (on_right_side && finalState.planet.worldwrap) {
      renderedBitmap = doBunks({
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
      })(renderedBitmap)
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
            renderedBitmap = drawDotSafe(shotx, shoty, renderedBitmap)
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
              renderedBitmap = drawDotSafe(wrappedShotx, shoty, renderedBitmap)
            }
          }
        }
      }
    }

    // 9. Check for collision after drawing all lethal objects
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
        triggerShipDeath(store)
      }
    }

    // 10. shift_figure - ship shadow (only if ship is alive)
    // 11. full_figure - draw ship (only if ship is alive)
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

    // Draw shield effect if active (Play.c:252-255)
    if (finalState.ship.shielding) {
      // Draw shield using erase_figure (Play.c:254)
      const shieldSprite = spriteService.getShieldSprite()
      renderedBitmap = eraseFigure({
        x: finalState.ship.shipx - SCENTER, // Same position as ship
        y: finalState.ship.shipy - SCENTER,
        def: shieldSprite.bitmap // shield_def (Figs.c:71)
      })(renderedBitmap)

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
            renderedBitmap = drawDotSafe(shotx, shoty, renderedBitmap)
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
              renderedBitmap = drawDotSafe(wrappedShotx, shoty, renderedBitmap)
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

      renderedBitmap = drawExplosions({
        explosions: extendedState.explosions,
        screenx: finalState.screen.screenx,
        screeny: finalState.screen.screeny,
        worldwidth: finalState.planet.worldwidth,
        worldwrap: finalState.planet.worldwrap,
        shardImages
      })(renderedBitmap)
    }

    // Play all accumulated sounds for this frame
    const soundState = store.getState().sound
    const currentTransition = store.getState().transition
    playSounds(soundState, {
      shipDeadCount: finalState.ship.deadCount,
      fizzActive: currentTransition.active && currentTransition.preDelayFrames <= 0
    })

    // Copy rendered bitmap data back to original
    bitmap.data.set(renderedBitmap.data)

    // Handle transition updates using thunk AFTER rendering
    // This ensures we capture the rendered game state, not an empty bitmap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transitionFrame = (store.dispatch as any)(
      updateTransition(bitmap, {
        statusData: {
          fuel: finalState.ship.fuel,
          lives: finalState.ship.lives,
          score: finalState.status.score,
          bonus: finalState.status.planetbonus,
          level: finalState.status.currentlevel,
          message: finalState.status.curmessage,
          spriteService
        },
        store
      })
    ) as MonochromeBitmap | null

    if (transitionFrame) {
      // Transition is active, render the transition frame
      bitmap.data.set(transitionFrame.data)

      // Play accumulated sounds
      const transitionSoundState = store.getState().sound
      playSounds(transitionSoundState, {
        shipDeadCount: finalState.ship.deadCount,
        fizzActive: state.transition.active && state.transition.preDelayFrames <= 0
      })
    }
  }

// Export galaxy header for level jumping
export { store as getGameStore } from './store'
export const getGalaxyHeader = (): GalaxyHeader | null => {
  const state = store.getState()
  return state.game.galaxyHeader
}
