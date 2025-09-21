/**
 * @fileoverview Planet module - Planet data structures and rendering
 */

// Types and constants
export * from './types'
export * from './constants'

// State management and actions
export {
  planetSlice,
  updateBunkerRotations,
  initializeBunkers,
  initializeFuels,
  updateFuelAnimations,
  killBunker
} from './planetSlice'

// Import planetSlice locally to access its actions
import { planetSlice as _planetSlice } from './planetSlice'
export const { loadPlanet } = _planetSlice.actions

// Planet functions
export { parsePlanet } from './parsePlanet'
export { legalAngle } from './legalAngle'

// Rendering functions
export * from './render'
