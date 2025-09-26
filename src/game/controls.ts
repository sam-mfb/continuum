/**
 * Controls Module
 *
 * Handles keyboard input mapping to ship controls
 */

import { ShipControl } from '@core/ship'
import { ControlAction } from '@core/controls'
import type { RootState } from './store'

/**
 * Map keyboard input to ship controls using control bindings from Redux
 * @param keysDown Set of currently pressed keys
 * @param state The current Redux state containing control bindings
 * @returns Array of active ship controls
 */
export const getPressedControls = (
  keysDown: Set<string>,
  state: RootState
): ShipControl[] => {
  const controls: ShipControl[] = []
  const bindings = state.controls.bindings

  if (keysDown.has(bindings[ControlAction.LEFT])) {
    controls.push(ShipControl.LEFT)
  }
  if (keysDown.has(bindings[ControlAction.RIGHT])) {
    controls.push(ShipControl.RIGHT)
  }
  if (keysDown.has(bindings[ControlAction.THRUST])) {
    controls.push(ShipControl.THRUST)
  }
  if (keysDown.has(bindings[ControlAction.FIRE])) {
    controls.push(ShipControl.FIRE)
  }
  if (keysDown.has(bindings[ControlAction.SHIELD])) {
    controls.push(ShipControl.SHIELD)
  }

  return controls
}
