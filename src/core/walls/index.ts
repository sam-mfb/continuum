/**
 * @fileoverview Walls module - Wall rendering and collision detection
 */

// Types
export * from './types'

// State management
export { wallsSlice, wallsActions } from './wallsSlice'

// Wall functions
export { createWall } from './unpack'

// Rendering functions
export { whiteTerrain, blackTerrain } from './render'
