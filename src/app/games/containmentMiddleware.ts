import type { Middleware } from '@reduxjs/toolkit'
import { shipSlice } from '@/ship/shipSlice'
import { screenSlice } from '@/screen/screenSlice'
import type { planetSlice } from '@/planet/planetSlice'
import { containShip } from './containShip'

type RootState = {
  ship: ReturnType<typeof shipSlice.reducer>
  screen: ReturnType<typeof screenSlice.reducer>
  planet: ReturnType<typeof planetSlice.reducer>
}

/**
 * Middleware that automatically applies ship containment after moveShip actions
 * This ensures ship position and screen scrolling are always consistent
 */
export const containmentMiddleware: Middleware<{}, RootState> =
  store => next => action => {
    // Let the action process first
    const result = next(action)

    // After moveShip, apply containment
    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      action.type === 'ship/moveShip'
    ) {
      const state = store.getState()
      const contained = containShip(state.ship, state.screen, state.planet)

      // Update ship position if changed
      if (
        contained.shipx !== state.ship.shipx ||
        contained.shipy !== state.ship.shipy ||
        contained.dx !== state.ship.dx ||
        contained.dy !== state.ship.dy
      ) {
        store.dispatch(
          shipSlice.actions.updatePosition({
            x: contained.shipx,
            y: contained.shipy,
            dx: contained.dx,
            dy: contained.dy
          })
        )
      }

      // Update screen position if changed
      if (
        contained.screenx !== state.screen.screenx ||
        contained.screeny !== state.screen.screeny
      ) {
        store.dispatch(
          screenSlice.actions.updatePosition({
            x: contained.screenx,
            y: contained.screeny
          })
        )
      }
    }

    return result
  }
