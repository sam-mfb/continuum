/**
 * @fileoverview Recording module - Game recording and replay functionality
 */

// Types
export * from './types'

// Services
export {
  createRecordingService,
  type RecordingService,
  type RecordingMode
} from './RecordingService'
export {
  createRecordingStorage,
  type RecordingStorage,
  MAX_RECORDINGS
} from './RecordingStorage'
