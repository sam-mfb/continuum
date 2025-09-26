/**
 * @fileoverview Convert keyboard input to control matrix
 */

import type { KeyInfo } from '@lib/bitmap'
import {
  ControlAction,
  type ControlBindings,
  type ControlMatrix
} from './types'

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
    [ControlAction.EXTRA_LIFE]: false,
    [ControlAction.MAP]: false
  }

  // Define which controls should only trigger on key press (not hold)
  const oneShotControls = new Set([
    ControlAction.SELF_DESTRUCT,
    ControlAction.PAUSE,
    ControlAction.NEXT_LEVEL,
    ControlAction.EXTRA_LIFE,
    ControlAction.MAP
  ])

  // Check each control action's binding
  for (const action of Object.values(ControlAction)) {
    const keyBinding = bindings[action as ControlAction]
    if (!keyBinding) continue

    if (oneShotControls.has(action as ControlAction)) {
      // One-shot controls only trigger on initial key press
      if (keys.keysPressed.has(keyBinding)) {
        matrix[action as ControlAction] = true
      }
    } else {
      // Continuous controls trigger while key is held
      if (keys.keysDown.has(keyBinding)) {
        matrix[action as ControlAction] = true
      }
    }
  }

  return matrix
}
