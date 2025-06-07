import { configureStore } from '@reduxjs/toolkit'
import type { GameLoopFunction } from '../components/GameView'
import { drawShip } from '../drawShip'
import { shipSlice } from '@/ship/shipSlice'
import { ShipControl } from '@/ship/types'

const store = configureStore({ reducer: shipSlice.reducer })
store.dispatch(shipSlice.actions.initShip({ x: 0, y: 0 }))

export const shipMoveGameLoop: GameLoopFunction = (ctx, frame, _env) => {
  const gravity = { x: 0, y: 0 }

  const getPressedControls = (keysDown: Set<string>): ShipControl[] => {
    const controls: ShipControl[] = []

    if (keysDown.has('KeyZ')) controls.push(ShipControl.LEFT)
    if (keysDown.has('KeyX')) controls.push(ShipControl.RIGHT)
    if (keysDown.has('Period')) controls.push(ShipControl.THRUST)
    if (keysDown.has('Slash')) controls.push(ShipControl.FIRE)
    if (keysDown.has('Space')) controls.push(ShipControl.SHIELD)

    return controls
  }

  store.dispatch(
    shipSlice.actions.shipControl({
      controlsPressed: getPressedControls(frame.keysDown),
      gravity
    })
  )
  store.dispatch(shipSlice.actions.moveShip())
  const { globalx, globaly } = store.getState()

  drawShip(ctx, globalx, globaly)
}
