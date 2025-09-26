/**
 * @fileoverview Convert keyboard input to control matrix
 */

import type { KeyInfo } from '@lib/bitmap'
import { ControlAction, type ControlBindings, type ControlMatrix } from './types'

/**
 * Convert keyboard input to a control matrix based on current bindings
 * @param keys The keyboard input state
 * @param bindings The current control key bindings
 * @returns A ControlMatrix with boolean values for each control action
 */
export function getControls(
  keys: KeyInfo,
  bindings: ControlBindings
): ControlMatrix {
  const matrix: ControlMatrix = {
    [ControlAction.THRUST]: false,
    [ControlAction.LEFT]: false,
    [ControlAction.RIGHT]: false,
    [ControlAction.FIRE]: false,
    [ControlAction.SHIELD]: false,
    [ControlAction.SELF_DESTRUCT]: false,
    [ControlAction.PAUSE]: false,
    [ControlAction.QUIT]: false,
    [ControlAction.NEXT_LEVEL]: false,
    [ControlAction.EXTRA_LIFE]: false
  }

  // Check each control action's binding against pressed keys
  for (const action of Object.values(ControlAction)) {
    const keyBinding = bindings[action as ControlAction]
    if (keyBinding && keys.keysDown.has(keyBinding)) {
      matrix[action as ControlAction] = true
    }
  }

  return matrix
}