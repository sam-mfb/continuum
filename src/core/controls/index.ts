/**
 * @fileoverview Controls module exports
 */

export {
  controlsSlice,
  getDefaultBindings,
  setBinding,
  setBindings,
  resetBindings,
  loadBindings
} from './controlsSlice'

export { controlsMiddleware, loadControlBindings } from './controlsMiddleware'

export {
  ControlAction,
  type ControlBindings,
  type ControlsState,
  type ControlMatrix
} from './types'

export { getControls } from './getControls'

export { mergeControls } from './mergeControls'
