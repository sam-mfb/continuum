/**
 * State Updates Module
 *
 * Handles all game state updates including physics, game logic,
 * level progression, and entity updates
 */

import type { GalaxyService } from '@core/galaxy'
import type { FrameInfo } from '@lib/bitmap'
import type { RandomService } from '@/core/shared'
import type { GameLogicServices, GameRootState } from './types'
import { configureStore, type Reducer } from '@reduxjs/toolkit'

/**
 * Transition service callbacks
 * Allows stateUpdates to work with any transition service implementation
 * without depending on the specific service type
 */
export type TransitionCallbacks = {
  isInitialized: () => boolean
  isComplete: () => boolean
  reset: () => void
}

/**
 * State update callbacks
 * Allows updateGameState to communicate game events without depending on app-level concerns
 */
export type StateUpdateCallbacks = {
  /**
   * Called when game over occurs
   * @param score - Final score
   * @param level - Level reached
   * @param fuel - Fuel remaining
   * @param cheatUsed - Whether cheats were used during the game
   */
  onGameOver: (
    score: number,
    level: number,
    fuel: number,
    cheatUsed: boolean
  ) => void

  /**
   * Get the current galaxy ID (needed for level transitions)
   * @returns The galaxy ID string
   */
  getGalaxyId: () => string

  /**
   * Get the initial number of lives for a new game
   * @returns The initial lives count
   */
  getInitialLives: () => number

  /**
   * Get the current collision mode
   * @returns The collision mode ('original' or 'modern')
   */
  getCollisionMode: () => 'original' | 'modern'
}

import { shipSlice, shipControl, CRITFUEL, handleBounceState } from '@core/ship'
import {
  shotsSlice,
  doStrafes,
  bunkShootThunk,
  moveBullets,
  clearBunkShots
} from '@core/shots'
import {
  updateBunkerRotations,
  updateFuelAnimationsWithRandom,
  killBunker
} from '@core/planet'
import { FUELFRAMES } from '@core/figs'
import {
  startExplosionWithRandom,
  updateExplosions,
  resetSparksAlive,
  clearShards,
  decrementShipDeathFlash
} from '@core/explosions'
import {
  EXPLSHARDS,
  EXPLSPARKS,
  SH_DISTRIB,
  SH_LIFE,
  SH_ADDLIFE,
  SH_SPEED,
  SH_ADDSPEED,
  SH_SPIN2,
  SPARKLIFE,
  SPADDLIFE,
  SP_SPEED16
} from '@core/explosions/constants'
import { statusSlice } from '@core/status'
import { screenSlice, SCRWTH, VIEWHT, TOPMARG, BOTMARG } from '@core/screen'
import { containShip } from '@core/shared'
import {
  startLevelTransition,
  decrementPreFizz,
  transitionToStarmap,
  incrementStarmap,
  resetTransition,
  TRANSITION_DELAY_FRAMES,
  skipToNextLevel
} from '@core/transition'

import { loadLevel } from './levelThunks'
import {
  markLevelComplete,
  triggerGameOver,
  resetGame,
  markCheatUsed,
  killShipNextFrame,
  resetKillShipNextFrame,
  gameSlice
} from './gameSlice'
// App-level concerns (mode, scores, initial lives) handled via stateUpdateCallbacks
import { triggerShipDeath } from './shipDeath'

import { BunkerKind } from '@core/figs'
import type { ControlMatrix } from '@/core/controls'
import { createCollisionMap } from './createCollisionMapThunk'
import { checkCollisions } from './checkCollisionsThunk'
import { Collision } from '@/core/collision'
import { createSyncThunkMiddleware } from '@/lib/redux'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const storeForTyping = (
  reducer: Reducer<GameRootState>,
  services: GameLogicServices
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  const syncThunkMiddleware = createSyncThunkMiddleware<
    GameRootState,
    GameLogicServices
  >()
  return configureStore({
    reducer: reducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services
        }
      }).prepend(syncThunkMiddleware(services))
  })
}

/**
 * Generic game store type based on GameRootState
 */
export type GameStore = ReturnType<typeof storeForTyping>

export type StateUpdateContext = {
  store: GameStore
  frame: FrameInfo
  controls: ControlMatrix
  galaxyService: GalaxyService
  transitionCallbacks: TransitionCallbacks
  randomService: RandomService
  stateUpdateCallbacks: StateUpdateCallbacks
}

/**
 * Main state update function
 */
export const updateGameState = (context: StateUpdateContext): void => {
  const {
    store,
    frame,
    controls,
    galaxyService,
    transitionCallbacks,
    randomService,
    stateUpdateCallbacks
  } = context

  let state = store.getState()

  if (controls.quit) {
    handleGameOver(store, transitionCallbacks, stateUpdateCallbacks)
    return
  }

  if (controls.extraLife) {
    store.dispatch(markCheatUsed())
    store.dispatch(shipSlice.actions.extraLife())
  }

  if (controls.nextLevel) {
    store.dispatch(markCheatUsed())
    store.dispatch(markLevelComplete())

    // Start transition directly using the reducer action
    store.dispatch(skipToNextLevel())

    // Reset fizz service to ensure clean state for new level
    transitionCallbacks.reset()
  }

  // decrement death flash at start of state update
  store.dispatch(decrementShipDeathFlash())

  // Handle transition state updates first (pre-delay, fizz, post-delay)
  updateTransitionState(store, galaxyService, transitionCallbacks)

  // Handle death countdown and respawn
  handleDeathAndRespawn(store)

  // Get state after respawn handling
  state = store.getState()

  // Decrement bonus countdown every 10 frames
  if (state.transition.status === 'inactive' && frame.frameCount % 10 === 0) {
    store.dispatch(statusSlice.actions.decrementBonus())
  }

  // Check for level completion
  handleLevelCompletion(store, transitionCallbacks)

  // Check for game over
  if (
    !state.game.gameOver &&
    state.ship.lives <= 0 &&
    state.ship.deadCount === 0
  ) {
    handleGameOver(store, transitionCallbacks, stateUpdateCallbacks)
    return
  }

  // early exit in fizz or starmap
  if (
    state.transition.status === 'fizz' ||
    state.transition.status === 'starmap'
  ) {
    return
  }

  // Handle ship movement and controls
  const { globalx, globaly } = handleShipMovement(
    store,
    controls,
    randomService
  )

  store.dispatch(resetKillShipNextFrame())

  // Update bunker rotations for animated bunkers
  store.dispatch(updateBunkerRotations({ globalx, globaly }))

  // Update fuel cell animations with deterministic random values
  const fuelState = store.getState()
  const numFuels = fuelState.planet.fuels.length
  const flash = numFuels > 0 ? randomService.rnumber(numFuels) : 0
  const flashFrame = FUELFRAMES - 2 + randomService.rnumber(2) // 6 or 7

  store.dispatch(
    updateFuelAnimationsWithRandom({
      flash,
      flashFrame
    })
  )

  // Handle bunker shooting
  handleBunkerShooting(store, globalx, globaly, randomService)

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
  processBunkerKills(store, randomService)

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

  if (stateUpdateCallbacks.getCollisionMode() === 'modern') {
    if (
      state.ship.deadCount === 0 &&
      (state.transition.status === 'inactive' ||
        state.transition.status === 'level-complete')
    ) {
      store.dispatch(createCollisionMap())
      const resultAction = store.dispatch(checkCollisions())
      const collision = resultAction.meta.result
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
function checkLevelComplete(state: GameRootState): boolean {
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
  transitionCallbacks: TransitionCallbacks
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
    transitionCallbacks.reset()
  }
}

/**
 * Handle game over condition
 */
const handleGameOver = (
  store: GameStore,
  transitionCallbacks: TransitionCallbacks,
  stateUpdateCallbacks: StateUpdateCallbacks
): void => {
  const state = store.getState()

  store.dispatch(triggerGameOver())

  // Notify callback with game over data - callback handles high score logic and UI transitions
  stateUpdateCallbacks.onGameOver(
    state.status.score,
    state.status.currentlevel,
    state.ship.fuel,
    state.game.cheatUsed
  )

  // Reset everything for a new game
  store.dispatch(resetGame())
  store.dispatch(resetTransition())
  transitionCallbacks.reset()
  store.dispatch(
    shipSlice.actions.setLives(stateUpdateCallbacks.getInitialLives())
  )
  store.dispatch(shipSlice.actions.resetFuel())
  store.dispatch(statusSlice.actions.initStatus())
  store.dispatch(shipSlice.actions.resetShip())
  store.dispatch(shotsSlice.actions.clearAllShots())
  store.dispatch(gameSlice.actions.resetKillShipNextFrame())
}

/**
 * Handle ship controls and movement
 */
const handleShipMovement = (
  store: GameStore,
  controls: ControlMatrix,
  randomService: RandomService
): { globalx: number; globaly: number } => {
  const state = store.getState()

  if (state.ship.deadCount === 0) {
    // Check for self-destruct command or death on previous frame
    if (controls.selfDestruct || state.game.killShipNextFrame) {
      triggerShipDeath(store, randomService)
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
  globaly: number,
  randomService: RandomService
): void => {
  const state = store.getState()

  // Check if bunkers should shoot this frame
  const shootRoll = randomService.rnumber(100)
  if (shootRoll < state.planet.shootslow) {
    const screenr = state.screen.screenx + SCRWTH
    const screenb = state.screen.screeny + VIEWHT

    store.dispatch(
      bunkShootThunk({
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
const processBunkerKills = (
  store: GameStore,
  randomService: RandomService
): void => {
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

          // Generate random values for explosion
          const shardRandom = []
          for (let i = 0; i < EXPLSHARDS; i++) {
            const xOffset =
              randomService.rnumber(SH_DISTRIB) - Math.floor(SH_DISTRIB / 2)
            const yOffset =
              randomService.rnumber(SH_DISTRIB) - Math.floor(SH_DISTRIB / 2)
            const lifetime = SH_LIFE + randomService.rnumber(SH_ADDLIFE)
            let angle: number
            if (bunker.kind >= 2) {
              // Rotating bunkers: random direction
              angle = randomService.rnumber(32)
            } else {
              // Static bunkers: directional spread
              angle = (randomService.rnumber(15) - 7 + (bunker.rot << 1)) & 31
            }
            const speed = SH_SPEED + randomService.rnumber(SH_ADDSPEED)
            const rot16 = randomService.rnumber(256)
            const rotspeed =
              randomService.rnumber(SH_SPIN2) - Math.floor(SH_SPIN2 / 2)

            shardRandom.push({
              xOffset,
              yOffset,
              lifetime,
              angle,
              speed,
              rot16,
              rotspeed
            })
          }

          const sparkRandom = []
          const loangle = bunker.kind >= 2 ? 0 : ((bunker.rot - 4) & 15) << 5
          const hiangle = bunker.kind >= 2 ? 511 : loangle + 256

          for (let i = 0; i < EXPLSPARKS; i++) {
            const lifetime = SPARKLIFE + randomService.rnumber(SPADDLIFE)
            const angle = randomService.rnumber(hiangle - loangle + 1) + loangle
            const speed = 8 + randomService.rnumber(SP_SPEED16)

            sparkRandom.push({ lifetime, angle, speed })
          }

          store.dispatch(
            startExplosionWithRandom({
              x: bunker.x,
              y: bunker.y,
              dir: bunker.rot,
              kind: bunker.kind,
              shardRandom,
              sparkRandom
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
  transitionCallbacks: TransitionCallbacks
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
      // handles transition to fizz if needed
      store.dispatch(decrementPreFizz())

      // When countdown reaches zero, stop the ship and trigger sounds
      const newState = store.getState().transition
      if (prevFrames > 0 && newState.preFizzFrames === 0) {
        store.dispatch(shipSlice.actions.stopShipMovement())
      }
    }
    return
  }

  // Handle fizz phase
  if (status === 'fizz') {
    // Check if fizz animation is complete
    if (
      transitionCallbacks.isInitialized() &&
      transitionCallbacks.isComplete()
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
