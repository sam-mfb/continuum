/**
 * State Updates Module
 *
 * Handles all game state updates including physics, game logic,
 * level progression, and entity updates
 */

import type { Store, UnknownAction } from '@reduxjs/toolkit'
import type { GalaxyService } from '@core/galaxy'
import type { RootState } from '../store'
import type { MonochromeBitmap, FrameInfo, KeyInfo } from '@lib/bitmap'
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
  clearShards
} from '@core/explosions'
import { statusSlice } from '@core/status'
import { screenSlice, SCRWTH, VIEWHT } from '@core/screen'
import { containShip } from '@core/shared/containShip'
import { rint } from '@core/shared'
import { resetFrame, playDiscrete, SoundType } from '@core/sound'
import {
  startLevelTransition,
  decrementPreDelay,
  markFizzStarted,
  completeFizz,
  clearFizzFinished,
  incrementDelay,
  resetTransition,
  TRANSITION_DELAY_FRAMES
} from '@core/transition'

import { checkLevelComplete, loadLevel, transitionToNextLevel } from '../levelManager'
import {
  markLevelComplete,
  triggerGameOver,
  resetGame,
  setMode,
  setPendingHighScore
} from '../gameSlice'
import { TOTAL_INITIAL_LIVES } from '../constants'
import { getPressedControls } from '../controls'
import { triggerShipDeath } from '../shipDeath'
import { cleanupGame } from '../initializationThunks'
import { handleTransitionSounds } from './soundManager'

export type StateUpdateContext = {
  store: Store<RootState>
  frame: FrameInfo
  keys: KeyInfo
  bitmap: MonochromeBitmap
  galaxyService: GalaxyService
  fizzTransitionService?: FizzTransitionService
}

// No longer need StateUpdateResult - all data is in the store

/**
 * Handle death countdown and respawn
 */
const handleDeathAndRespawn = (store: Store<RootState>): void => {
  const prelimState = store.getState()
  if (prelimState.ship.deadCount > 0) {
    // Ship is dead - decrement counter and check for respawn
    store.dispatch(shipSlice.actions.decrementDeadCount())
    const newDeadCount = store.getState().ship.deadCount
    if (newDeadCount === 0) {
      store.dispatch(shipSlice.actions.respawnShip())

      // Clear explosion and shot state per init_ship() in Play.c:182-187
      store.dispatch(resetSparksAlive())
      store.dispatch(clearBunkShots())
      store.dispatch(clearShards())

      // Update screen position to place ship at planet start position
      const respawnState = store.getState()
      store.dispatch(
        screenSlice.actions.setPosition({
          x: respawnState.planet.xstart - respawnState.ship.shipx,
          y: respawnState.planet.ystart - respawnState.ship.shipy
        })
      )
    }
  }
}

/**
 * Handle level completion checks
 */
const handleLevelCompletion = (store: Store<RootState>): void => {
  const state = store.getState()

  if (!state.transition.active && checkLevelComplete(state)) {
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
  }
}

/**
 * Handle game over condition
 */
const handleGameOver = (
  store: Store<RootState>,
  galaxyService: GalaxyService
): void => {
  const state = store.getState()

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

    // Stop all sounds when game ends and reset initialization status
    store.dispatch(cleanupGame() as unknown as UnknownAction)

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
    loadLevel(store, 1, galaxyService)
  }
}

/**
 * Handle ship controls and movement
 */
const handleShipMovement = (
  store: Store<RootState>,
  keys: KeyInfo
): { globalx: number; globaly: number } => {
  const state = store.getState()

  if (state.ship.deadCount === 0) {
    // Check for self-destruct command (A key)
    if (keys.keysDown.has('KeyA')) {
      triggerShipDeath(store)
      return {
        globalx: state.ship.globalx,
        globaly: state.ship.globaly
      }
    }

    // Only handle controls if not in fizz transition
    if (!state.transition.active || state.transition.preDelayFrames > 0) {
      // shipControl is a thunk - use any cast for dispatch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(store.dispatch as any)(
        shipControl({
          controlsPressed: getPressedControls(keys.keysDown)
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
  store: Store<RootState>,
  globalx: number,
  globaly: number
): void => {
  const state = store.getState()

  // Check if bunkers should shoot this frame
  const shootRoll = rint(100)
  if (shootRoll < state.planet.shootslow) {
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
      // A bunker fired - find the new shot for sound proximity
      const newShot = newState.shots.bunkshots.find(
        (s, i) =>
          s.lifecount > 0 &&
          (!state.shots.bunkshots[i] ||
            state.shots.bunkshots[i]!.lifecount === 0)
      )

      if (newShot && newShot.origin) {
        const SOFTBORDER = 200
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
    }
  }
}

/**
 * Process bunker kills from shot collisions
 */
const processBunkerKills = (store: Store<RootState>): void => {
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
          // Play bunker explosion sound
          store.dispatch(playDiscrete(SoundType.EXP1_SOUND))

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

// Note: Ship collision checking is now handled in the rendering module
// where we have access to the sprite service and rendered bitmap

/**
 * Update transition state (pre-delay, fizz lifecycle, post-delay)
 * Returns true if transition completed this frame
 */
const updateTransitionState = (
  store: Store<RootState>,
  galaxyService: GalaxyService,
  fizzTransitionService?: FizzTransitionService
): boolean => {
  const prevState = store.getState().transition

  if (!prevState.active) {
    return false
  }

  // Handle pre-delay countdown
  if (prevState.preDelayFrames > 0) {
    store.dispatch(decrementPreDelay())

    // When countdown reaches zero, stop the ship and trigger sounds
    const newState = store.getState().transition
    if (newState.preDelayFrames === 0) {
      store.dispatch(shipSlice.actions.stopShipMovement())
      // Mark that fizz should start
      store.dispatch(markFizzStarted())

      // Handle sounds for fizz start
      handleTransitionSounds(store, prevState, store.getState().transition)
    }

    return false
  }

  // Check if fizz is complete
  if (
    fizzTransitionService &&
    fizzTransitionService.isInitialized &&
    prevState.fizzActive &&
    fizzTransitionService.isComplete
  ) {
    store.dispatch(completeFizz())

    // Handle sounds for fizz completion
    handleTransitionSounds(store, prevState, store.getState().transition)

    return false
  }

  // Handle post-fizz delay
  if (!prevState.fizzActive && prevState.active) {
    // Clear the "just finished" flag if set
    if (prevState.fizzJustFinished) {
      store.dispatch(clearFizzFinished())
    }

    // Increment delay counter
    store.dispatch(incrementDelay())

    // Check if delay is complete
    if (store.getState().transition.delayFrames >= TRANSITION_DELAY_FRAMES) {
      // Reset transition state
      store.dispatch(resetTransition())

      // Trigger the actual level load
      transitionToNextLevel(store, galaxyService)

      return true
    }
  }

  return false
}

/**
 * Main state update function
 */
export const updateGameState = (context: StateUpdateContext): void => {
  const { store, frame, keys, galaxyService, fizzTransitionService } = context

  // Reset sound accumulator for new frame (must happen BEFORE any sounds are dispatched)
  store.dispatch(resetFrame())

  // Handle transition state updates first (pre-delay, fizz, post-delay)
  updateTransitionState(store, galaxyService, fizzTransitionService)

  // Handle death countdown and respawn
  handleDeathAndRespawn(store)

  // Get state after respawn handling
  const state = store.getState()

  // Decrement bonus countdown every 10 frames
  if (!state.transition.active && frame.frameCount % 10 === 0) {
    store.dispatch(statusSlice.actions.decrementBonus())
  }

  // Check for level completion
  handleLevelCompletion(store)

  // Check for game over
  handleGameOver(store, galaxyService)

  // Handle ship movement and controls
  const { globalx, globaly } = handleShipMovement(store, keys)

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
    store.dispatch(playDiscrete(SoundType.SHLD_SOUND))
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
}
