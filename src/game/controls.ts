/**
 * Controls Module
 *
 * Handles keyboard input mapping to ship controls
 */

import { ShipControl } from '@core/ship'

/**
 * Map keyboard input to ship controls
 * @param keysDown Set of currently pressed keys
 * @returns Array of active ship controls
 */
export const getPressedControls = (keysDown: Set<string>): ShipControl[] => {
  const controls: ShipControl[] = []

  if (keysDown.has('KeyZ')) controls.push(ShipControl.LEFT)
  if (keysDown.has('KeyX')) controls.push(ShipControl.RIGHT)
  if (keysDown.has('Period')) controls.push(ShipControl.THRUST)
  if (keysDown.has('Slash')) controls.push(ShipControl.FIRE)
  if (keysDown.has('Space')) controls.push(ShipControl.SHIELD)

  return controls
}
