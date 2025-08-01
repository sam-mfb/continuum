import type { GameLoopFunction } from '../components/GameView'
import { drawShip } from '../drawShip'
import { drawShot } from '../drawShot'
import { shipSlice } from '@/ship/shipSlice'
import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { shotsSlice } from '@/shots/shotsSlice'
import { ShipControl } from '@/ship/types'
import { drawBackground } from './drawBackground'
import { shipControl } from './shipControlThunk'
import { buildGameStore } from './store'
import { SCRWTH, VIEWHT } from '@/screen/constants'

// Configure store with all slices and containment middleware
const store = buildGameStore()

// Initialize game on module load
const initializeGame = (): void => {
  // Initialize dummy planet (1000x1000)
  store.dispatch(
    planetSlice.actions.loadPlanet({
      worldwidth: 1000,
      worldheight: 1000,
      worldwrap: false,
      shootslow: 0,
      xstart: 500,
      ystart: 500,
      planetbonus: 0,
      gravx: 0,
      gravy: 0,
      numcraters: 0,
      lines: [],
      bunkers: [],
      fuels: [],
      craters: []
    })
  )

  // Initialize ship at center of viewport
  store.dispatch(shipSlice.actions.initShip({ x: 256, y: 159 }))

  // Initialize screen to show ship at world center
  store.dispatch(
    screenSlice.actions.setPosition({
      x: 500 - 256, // World center - screen center
      y: 500 - 159
    })
  )
}

initializeGame()

export const shipMoveGameLoop: GameLoopFunction = (ctx, frame, _env) => {
  const state = store.getState()

  // Get gravity from planet
  const gravity = {
    x: state.planet.gravx,
    y: state.planet.gravy
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

  // Handle controls
  store.dispatch(
    shipControl({
      controlsPressed: getPressedControls(frame.keysDown),
      gravity
    })
  )

  // Move ship - containment middleware will automatically apply
  store.dispatch(shipSlice.actions.moveShip())

  // Move all bullets
  store.dispatch(
    shotsSlice.actions.moveBullets({
      worldwidth: state.planet.worldwidth,
      worldwrap: state.planet.worldwrap
    })
  )

  // Get final state for drawing
  const finalState = store.getState()

  // Draw background grid
  drawBackground(
    ctx,
    finalState.screen.screenx,
    finalState.screen.screeny,
    finalState.planet.worldwidth,
    finalState.planet.worldheight
  )

  // Draw ship at screen position
  drawShip(
    ctx,
    finalState.ship.shipx,
    finalState.ship.shipy,
    finalState.ship.shiprot
  )

  // Draw all active ship shots
  for (const shot of finalState.shots.shipshots) {
    if (shot.lifecount > 0) {
      // Convert world coordinates to screen coordinates
      const shotx = shot.x - finalState.screen.screenx
      const shoty = shot.y - finalState.screen.screeny

      // Check if shot is visible on screen (with 3 pixel margin for shot size)
      if (
        shotx >= -1 &&
        shotx < SCRWTH + 1 &&
        shoty >= -1 &&
        shoty < VIEWHT + 1
      ) {
        drawShot(ctx, shotx, shoty)
      }

      // Handle world wrapping for toroidal worlds
      if (
        finalState.planet.worldwrap &&
        finalState.screen.screenx > finalState.planet.worldwidth - SCRWTH
      ) {
        const wrappedShotx =
          shot.x + finalState.planet.worldwidth - finalState.screen.screenx
        if (wrappedShotx >= -1 && wrappedShotx < SCRWTH + 1) {
          drawShot(ctx, wrappedShotx, shoty)
        }
      }
    }
  }
}
