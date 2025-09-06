/**
 * @fileoverview Ship module - Core ship functionality and physics
 */

// Core ship types and constants
export * from './types'
export * from './constants'

// Ship state management
export { shipSlice } from './shipSlice'

// Ship functions
export { checkFigure } from './checkFigure'
export { shipControl } from './shipControl'

// Physics
export { checkForBounce } from './physics/checkForBounce'

// Rendering functions
export { drawFigure } from './render/drawFigure'
export { eraseFigure } from './render/eraseFigure'
export { flameOn } from './render/flameOn'
export { fullFigure } from './render/fullFigure'
export { grayFigure } from './render/grayFigure'
export { shiftFigure } from './render/shiftFigure'
