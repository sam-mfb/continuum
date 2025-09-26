/**
 * @fileoverview Type definitions for the controls system
 */

/**
 * Available control actions in the game
 */
export enum ControlAction {
  // Ship movement
  THRUST = 'thrust',
  LEFT = 'left',
  RIGHT = 'right',

  // Ship actions
  FIRE = 'fire',
  SHIELD = 'shield',
  SELF_DESTRUCT = 'selfDestruct',

  // Game flow
  PAUSE = 'pause',
  QUIT = 'quit',

  // Debug/cheat controls
  NEXT_LEVEL = 'nextLevel',
  EXTRA_LIFE = 'extraLife'
}

/**
 * Mapping of control actions to keyboard codes
 */
export type ControlBindings = {
  [key in ControlAction]: string
}

/**
 * State shape for controls slice
 */
export type ControlsState = {
  bindings: ControlBindings
}

/**
 * Represents controls' active/inactive states
 */
export type ControlMatrix = {
  [key in ControlAction]: boolean
}
