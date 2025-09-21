/**
 * @fileoverview Shared module - Common utilities and types
 */

// Types
export * from './types'
export * from './types/line'

// Type re-exports for convenience
export type { Alignment, AlignmentMode } from './alignment'

// Utility functions
export { getAlignment, setAlignmentMode, getAlignmentMode } from './alignment'
export { getBackgroundPattern } from './backgroundPattern'
export { ptToAngle } from './ptToAngle'
export { rint } from './rint'
