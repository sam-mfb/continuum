/**
 * @fileoverview Browser-based recording validation
 * Wraps the headless validator for use in the browser UI
 */

import type { GameRecording } from '@core/recording'
import type { ValidationReport } from '@core/validation'
import {
  createHeadlessStore,
  createHeadlessGameEngine,
  createRecordingValidator
} from '@core/validation'
import type { GameServices } from './store'

/**
 * Validate a recording in the browser using the headless validator
 *
 * @param recording - The recording to validate
 * @param services - Game services from the main store
 * @returns Validation report with success status and any errors
 */
export const validateRecording = (
  recording: GameRecording,
  services: GameServices
): ValidationReport => {
  // Extract headless-compatible services
  const headlessServices = {
    galaxyService: services.galaxyService,
    fizzTransitionService: services.fizzTransitionService,
    randomService: services.randomService,
    recordingService: services.recordingService,
    collisionService: services.collisionService,
    spriteService: services.spriteService
  }

  // Create headless store
  const headlessStore = createHeadlessStore(
    headlessServices,
    recording.initialState.lives ?? 3,
    recording.startLevel
  )

  // Create headless engine
  const headlessEngine = createHeadlessGameEngine(
    headlessStore,
    services.galaxyService,
    services.fizzTransitionService,
    services.randomService,
    recording.galaxyId,
    recording.initialState.lives ?? 3
  )

  // Create validator
  const validator = createRecordingValidator(
    headlessEngine,
    headlessStore,
    services.recordingService
  )

  // Run validation
  return validator.validate(recording)
}
