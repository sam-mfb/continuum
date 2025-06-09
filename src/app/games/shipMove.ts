import { configureStore } from '@reduxjs/toolkit'
import type { GameLoopFunction } from '../components/GameView'
import { drawShip } from '../drawShip'
import { shipSlice } from '@/ship/shipSlice'
import { planetSlice } from '@/planet/planetSlice'
import { screenSlice } from '@/screen/screenSlice'
import { ShipControl } from '@/ship/types'
import { containmentMiddleware } from './containmentMiddleware'
import { drawBackground } from './drawBackground'

// Configure store with all slices and containment middleware
const store = configureStore({
  reducer: {
    ship: shipSlice.reducer,
    planet: planetSlice.reducer,
    screen: screenSlice.reducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(containmentMiddleware)
})

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
    shipSlice.actions.shipControl({
      controlsPressed: getPressedControls(frame.keysDown),
      gravity
    })
  )

  // Move ship - containment middleware will automatically apply
  store.dispatch(shipSlice.actions.moveShip())

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
}
