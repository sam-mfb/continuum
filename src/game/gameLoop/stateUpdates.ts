/**
 * State Updates Module
 *
 * Handles all game state updates including physics, game logic,
 * level progression, and entity updates
 */

import type { GalaxyService } from '@core/galaxy'
import type { GameStore, RootState } from '../store'
import type { MonochromeBitmap, FrameInfo } from '@lib/bitmap'
import type { FizzTransitionService } from '@core/transition'

import { shipSlice, shipControl, CRITFUEL } from '@core/ship'
import {
  shotsSlice,
  doStrafes,
  bunkShoot,
  moveBullets,
  clearBunkShots
} from '@core/shots'
import {
  updateBunkerRotations,
  updateFuelAnimations,
  killBunker
} from '@core/planet'
import {
  startExplosion,
  updateExplosions,
  resetSparksAlive,
  clearShards,
  decrementShipDeathFlash
} from '@core/explosions'
import { statusSlice } from '@core/status'
import { screenSlice, SCRWTH, VIEWHT, TOPMARG, BOTMARG } from '@core/screen'
import { containShip, rint } from '@core/shared'
import {
  startLevelTransition,
  decrementPreFizz,
  transitionToStarmap,
  incrementStarmap,
  resetTransition,
  TRANSITION_DELAY_FRAMES,
  skipToNextLevel
} from '@core/transition'

import { loadLevel } from '../levelThunks'
import {
  markLevelComplete,
  triggerGameOver,
  resetGame,
  invalidateHighScore,
  killShipNextFrame,
  resetKillShipNextFrame
} from '../gameSlice'
import { setMode, setMostRecentScore } from '../appSlice'
import { TOTAL_INITIAL_LIVES } from '../constants'
import { triggerShipDeath } from '../shipDeath'

import { BunkerKind } from '@core/figs'
import type { ControlMatrix } from '@/core/controls'
import { createCollisionMap } from './createCollisionMapThunk'
import { checkCollisions } from './checkCollisionsThunk'
import { Collision } from '@/core/collision'
import { handleBounceState } from '@/core/ship/physics/handleBounceState'

export type StateUpdateContext = {
  store: GameStore
  frame: FrameInfo
  controls: ControlMatrix
  bitmap: MonochromeBitmap
  galaxyService: GalaxyService
  fizzTransitionService?: FizzTransitionService
}

/**
 * Main state update function
 */
export const updateGameState = (context: StateUpdateContext): void => {
  const { store, frame, controls, galaxyService, fizzTransitionService } =
    context

  if (controls.quit) {
    handleGameOver(store)
  }

  if (controls.extraLife) {
    store.dispatch(invalidateHighScore())
    store.dispatch(shipSlice.actions.extraLife())
  }

  if (controls.nextLevel) {
    store.dispatch(invalidateHighScore())
    store.dispatch(markLevelComplete())

    // Start transition directly using the reducer action
    store.dispatch(skipToNextLevel())

    // Reset fizz service to ensure clean state for new level
    if (fizzTransitionService) {
      fizzTransitionService.reset()
    }
  }

  // decrement death flash at start of state update
  store.dispatch(decrementShipDeathFlash())

  // Handle transition state updates first (pre-delay, fizz, post-delay)
  updateTransitionState(store, galaxyService, fizzTransitionService)

  // Handle death countdown and respawn
  handleDeathAndRespawn(store)

  // Get state after respawn handling
  const state = store.getState()

  // Decrement bonus countdown every 10 frames
  if (state.transition.status === 'inactive' && frame.frameCount % 10 === 0) {
    store.dispatch(statusSlice.actions.decrementBonus())
  }

  // Check for level completion
  handleLevelCompletion(store, fizzTransitionService)

  // Check for game over
  if (
    !state.game.gameOver &&
    state.ship.lives <= 0 &&
    state.ship.deadCount === 0
  ) {
    handleGameOver(store)
  }

  // Handle ship movement and controls
  const { globalx, globaly } = handleShipMovement(store, controls)

  store.dispatch(resetKillShipNextFrame())

  // Update bunker rotations for animated bunkers
  store.dispatch(updateBunkerRotations({ globalx, globaly }))

  // Update fuel cell animations
  store.dispatch(updateFuelAnimations())

  // Handle bunker shooting
  handleBunkerShooting(store, globalx, globaly)

  // Move ship shots
  const currentState = store.getState()
  store.dispatch(
    shotsSlice.actions.moveShipshots({
      bunkers: currentState.planet.bunkers,
      shipPosition: {
        x: globalx,
        y: globaly
      },
      shipAlive: currentState.ship.deadCount === 0,
      walls: currentState.planet.lines,
      worldwidth: currentState.planet.worldwidth,
      worldwrap: currentState.planet.worldwrap
    })
  )

  // Process bunker kills
  processBunkerKills(store)

  // Handle self-hit shield feedback
  const shotsState = store.getState().shots
  if (shotsState.selfHitShield) {
    store.dispatch(shipSlice.actions.activateShieldFeedback())
  }

  // Move bunker shots with shield protection
  const finalState = store.getState()
  store.dispatch(
    moveBullets({
      worldwidth: finalState.planet.worldwidth,
      worldwrap: finalState.planet.worldwrap,
      walls: finalState.planet.lines,
      shipGlobalX: finalState.ship.globalx,
      shipGlobalY: finalState.ship.globaly,
      shielding: finalState.ship.shielding
    })
  )

  // Update strafe lifecounts
  store.dispatch(doStrafes())

  // Update explosions
  store.dispatch(
    updateExplosions({
      worldwidth: finalState.planet.worldwidth,
      worldwrap: finalState.planet.worldwrap,
      gravx: finalState.planet.gravx,
      gravy: finalState.planet.gravy,
      gravityPoints: finalState.planet.gravityPoints
    })
  )

  if (finalState.app.collisionMode === 'modern') {
    if (state.ship.deadCount === 0) {
      store.dispatch(createCollisionMap())
      store
        .dispatch(checkCollisions())
        .unwrap()
        // not actually async but this gives us the convenience
        // of using createAsyncThunk's DI
        .then(collision => {
          if (collision === Collision.LETHAL) {
            store.dispatch(killShipNextFrame())
          } else {
            handleBounceState({
              store,
              wallData: {
                kindPointers: state.walls.kindPointers,
                organizedWalls: state.walls.organizedWalls
              },
              worldwidth: state.planet.worldwidth,
              collision
            })
          }
        })
    }
  }
}

/**
 * Check if the current level is complete
 * Based on kill_bunk() from orig/Sources/Play.c:369-377
 *
 * A level is complete when all non-generator bunkers are destroyed.
 * Generator bunkers (GENERATORBUNK) do not need to be destroyed for mission completion.
 * This allows level designers to create "blocked" indestructible generators.
 *
 * From Play.c:369-372:
 *   missioncomplete = TRUE;
 *   for(bp=bunkers; bp->rot >= 0; bp++)
 *       if (bp->alive && bp->kind != GENERATORBUNK)
 *           missioncomplete = FALSE;
 */
function checkLevelComplete(state: RootState): boolean {
  // Don't check if already complete
  if (state.game.levelComplete) {
    return false
  }

  const { bunkers } = state.planet

  // Implement mission completion logic from Play.c:369-372
  // Check if all non-generator bunkers are destroyed
  const allNonGeneratorBunkersDestroyed = bunkers.every(
    bunker =>
      bunker.rot < 0 || // rot < 0 is sentinel marker
      !bunker.alive || // bunker is destroyed
      bunker.kind === BunkerKind.GENERATOR // Play.c:371 - generators don't count
  )

  return allNonGeneratorBunkersDestroyed
}

/**
 * Handle death countdown and respawn
 */
const handleDeathAndRespawn = (store: GameStore): void => {
  const prelimState = store.getState()
  if (prelimState.ship.deadCount > 0) {
    // Ship is dead - decrement counter and check for respawn
    store.dispatch(shipSlice.actions.decrementDeadCount())
    const newDeadCount = store.getState().ship.deadCount
    if (newDeadCount === 0) {
      // early return if game over because no need to reset ship position
      if (store.getState().ship.lives === 0) {
        return
      }
      // Get planet state for respawn coordinates
      const planetState = store.getState().planet

      // Use the same initialization as level start
      // Initialize ship at center of screen with global coordinates
      const shipScreenX = SCRWTH / 2
      const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2)

      store.dispatch(
        shipSlice.actions.initShip({
          x: shipScreenX,
          y: shipScreenY,
          globalx: planetState.xstart,
          globaly: planetState.ystart,
          resetFuel: true // Reset fuel on respawn
        })
      )

      // Initialize screen position (same as in levelThunks)
      store.dispatch(
        screenSlice.actions.setPosition({
          x: planetState.xstart - shipScreenX,
          y: planetState.ystart - shipScreenY
        })
      )

      // Clear explosion and shot state per init_ship() in Play.c:182-187
      store.dispatch(resetSparksAlive())
      store.dispatch(clearBunkShots())
      store.dispatch(clearShards())
    }
  }
}

/**
 * Handle level completion checks
 */
const handleLevelCompletion = (
  store: GameStore,
  fizzTransitionService?: FizzTransitionService
): void => {
  const state = store.getState()

  if (state.transition.status === 'inactive' && checkLevelComplete(state)) {
    console.log(`Level ${state.status.currentlevel} complete!`)

    // Award bonus points
    const bonusPoints = state.status.planetbonus
    if (bonusPoints > 0) {
      store.dispatch(statusSlice.actions.addScore(bonusPoints))
      console.log(`Awarded ${bonusPoints} bonus points`)
    }

    // Award extra life for completing level
    store.dispatch(shipSlice.actions.extraLife())
    console.log('Awarded extra life for level completion')

    store.dispatch(markLevelComplete())
    store.dispatch(statusSlice.actions.setMessage('MISSION COMPLETE'))

    // Start transition directly using the reducer action
    store.dispatch(startLevelTransition())

    // Reset fizz service to ensure clean state for new level
    if (fizzTransitionService) {
      fizzTransitionService.reset()
    }
  }
}

/**
 * Handle game over condition
 */
const handleGameOver = (store: GameStore): void => {
  const state = store.getState()

  store.dispatch(triggerGameOver())

  // Always record the most recent score
  store.dispatch(
    setMostRecentScore({
      score: state.status.score,
      planet: state.status.currentlevel,
      fuel: state.ship.fuel
    })
  )

  // Always go to highScoreEntry mode - it will decide what to do
  store.dispatch(setMode('highScoreEntry'))

  // Reset everything for a new game
  store.dispatch(resetGame())
  store.dispatch(shipSlice.actions.setLives(TOTAL_INITIAL_LIVES))
  store.dispatch(shipSlice.actions.resetFuel())
  store.dispatch(statusSlice.actions.initStatus())
  store.dispatch(loadLevel(1))
}

/**
 * Handle ship controls and movement
 */
const handleShipMovement = (
  store: GameStore,
  controls: ControlMatrix
): { globalx: number; globaly: number } => {
  const state = store.getState()

  if (state.ship.deadCount === 0) {
    // Check for self-destruct command or death on previous frame
    if (controls.selfDestruct || state.game.killShipNextFrame) {
      triggerShipDeath(store)
      return {
        globalx: state.ship.globalx,
        globaly: state.ship.globaly
      }
    }

    // Only handle controls if not in fizz or starmap phase
    if (
      state.transition.status === 'inactive' ||
      state.transition.status === 'level-complete'
    ) {
      store.dispatch(
        shipControl({
          controlsPressed: controls
        })
      )

      // Move ship
      store.dispatch(shipSlice.actions.moveShip())
    }

    // Check and update fuel messages
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

    // Apply containment after movement
    const currentState = store.getState()
    const contained = containShip(
      currentState.ship,
      currentState.screen,
      currentState.planet
    )

    // Update ship position if changed by containment
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

    // Update screen position if changed by containment
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

    return {
      globalx: contained.globalx,
      globaly: contained.globaly
    }
  }

  // Ship is dead, use existing position
  return {
    globalx: state.ship.globalx,
    globaly: state.ship.globaly
  }
}

/**
 * Handle bunker shooting logic
 */
const handleBunkerShooting = (
  store: GameStore,
  globalx: number,
  globaly: number
): void => {
  const state = store.getState()

  // Check if bunkers should shoot this frame
  const shootRoll = rint(100)
  if (shootRoll < state.planet.shootslow) {
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
}

/**
 * Process bunker kills from shot collisions
 */
const processBunkerKills = (store: GameStore): void => {
  const state = store.getState()
  const shotsState = store.getState().shots

  if (shotsState.pendingBunkerKills.length > 0) {
    for (const bunkerIndex of shotsState.pendingBunkerKills) {
      const bunker = state.planet.bunkers[bunkerIndex]
      if (bunker) {
        // Dispatch killBunker (handles difficult bunkers internally)
        store.dispatch(killBunker({ index: bunkerIndex }))

        // Start explosion for destroyed bunker
        const updatedBunker = store.getState().planet.bunkers[bunkerIndex]
        if (updatedBunker && !updatedBunker.alive) {
          // Award score for bunker destruction
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
}

/**
 * Handle transitioning to the next level
 */
const transitionToNextLevel = (
  store: GameStore,
  galaxyService: GalaxyService
): void => {
  const state = store.getState()
  const galaxyHeader = galaxyService.getHeader()

  // Check if we've completed all levels
  if (state.status.currentlevel >= galaxyHeader.planets) {
    // Game won! For now, just loop back to level 1
    console.log('Game completed! Restarting from level 1')
    store.dispatch(resetGame())
    store.dispatch(loadLevel(1))
  } else {
    // Load next level
    const nextLevelNum = state.status.currentlevel + 1
    store.dispatch(loadLevel(nextLevelNum))
  }
}

/**
 * Update transition state (pre-delay, fizz lifecycle, post-delay)
 * Returns true if transition completed this frame
 */
const updateTransitionState = (
  store: GameStore,
  galaxyService: GalaxyService,
  fizzTransitionService?: FizzTransitionService
): void => {
  const prevState = store.getState().transition
  const { status, preFizzFrames, starmapFrames } = prevState

  if (status === 'inactive') {
    return
  }

  // Handle level-complete phase (countdown to fizz)
  if (status === 'level-complete') {
    if (preFizzFrames > 0) {
      const prevFrames = preFizzFrames
      store.dispatch(decrementPreFizz())

      // When countdown reaches zero, stop the ship and trigger sounds
      const newState = store.getState().transition
      if (prevFrames > 0 && newState.preFizzFrames === 0) {
        store.dispatch(shipSlice.actions.stopShipMovement())
        // Status automatically transitions to 'fizz' in reducer
      }
    }
    return
  }

  // Handle fizz phase
  if (status === 'fizz') {
    // Check if fizz animation is complete
    if (
      fizzTransitionService &&
      fizzTransitionService.isInitialized &&
      fizzTransitionService.isComplete
    ) {
      store.dispatch(transitionToStarmap())
    }
    return
  }

  // Handle starmap phase
  if (status === 'starmap') {
    // Increment starmap display counter
    store.dispatch(incrementStarmap())

    // Check if starmap display is complete
    if (starmapFrames >= TRANSITION_DELAY_FRAMES) {
      // Reset transition state
      store.dispatch(resetTransition())

      // Trigger the actual level load
      transitionToNextLevel(store, galaxyService)

      return
    }
  }
}
