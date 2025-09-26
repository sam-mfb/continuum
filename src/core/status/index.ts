/**
 * @fileoverview Status module - Status bar rendering and state
 */

// Constants
export * from './constants'

// Scoring
export * from './scoring'

// State management
export { statusSlice } from './statusSlice'

// Import and re-export actions
import { statusSlice as _statusSlice } from './statusSlice'
export const { setMessage } = _statusSlice.actions
