/**
 * @fileoverview Validation module - Recording validation and headless engine
 */

// Headless engine
export {
  createHeadlessGameEngine,
  type HeadlessGameEngine
} from './HeadlessGameEngine'

// Store
export {
  createHeadlessStore,
  type HeadlessStore,
  type HeadlessRootState
} from './createHeadlessStore'

// Validator
export {
  createRecordingValidator,
  type ValidationReport
} from './RecordingValidator'
