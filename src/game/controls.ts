/**
 * Controls Module
 *
 * Handles keyboard input mapping to ship controls
 */

import { ControlAction } from '@core/controls'
import type { RootState } from './store'

/**
 * Map keyboard input to control actions using control bindings from Redux
 * @param keysDown Set of currently pressed keys
 * @param state The current Redux state containing control bindings
 * @returns Array of active control actions
 */
export const getPressedControls = (
  keysDown: Set<string>,
  state: RootState
): ControlAction[] => {
  const controls: ControlAction[] = []
  const bindings = state.controls.bindings

  if (keysDown.has(bindings[ControlAction.LEFT])) {
    controls.push(ControlAction.LEFT)
  }
  if (keysDown.has(bindings[ControlAction.RIGHT])) {
    controls.push(ControlAction.RIGHT)
  }
  if (keysDown.has(bindings[ControlAction.THRUST])) {
    controls.push(ControlAction.THRUST)
  }
  if (keysDown.has(bindings[ControlAction.FIRE])) {
    controls.push(ControlAction.FIRE)
  }
  if (keysDown.has(bindings[ControlAction.SHIELD])) {
    controls.push(ControlAction.SHIELD)
  }

  return controls
}
