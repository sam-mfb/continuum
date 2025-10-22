import type { GameRecording, FullStateSnapshot } from '@/game/recording/types'
import type { HeadlessGameEngine } from './HeadlessGameEngine'
import type { HeadlessStore, HeadlessRootState } from './createHeadlessStore'
import type { RecordingService } from '@/game/recording/RecordingService'

type StateDiff = {
  path: string
  expected: unknown
  actual: unknown
}[]

type ValidationReport = {
  success: boolean
  framesValidated: number
  snapshotsChecked: number
  divergenceFrame: number | null
  errors: {
    frame: number
    type: 'SNAPSHOT_MISMATCH' | 'MISSING_INPUT'
    expectedHash?: string
    actualHash?: string
    stateDiff?: StateDiff // Detailed diff when full snapshots available
  }[]
}

const createRecordingValidator = (
  engine: HeadlessGameEngine,
  store: HeadlessStore,
  recordingService: RecordingService
): {
  validate: (recording: GameRecording) => ValidationReport
} => {
  const hashState = (state: HeadlessRootState): string => {
    const relevantState = {
      ship: state.ship,
      shots: state.shots,
      planet: state.planet,
      screen: state.screen,
      status: state.status,
      explosions: state.explosions,
      walls: state.walls,
      transition: state.transition
    }

    const stateString = JSON.stringify(relevantState)
    let hash = 0
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(16)
  }

  const compareStates = (
    expected: FullStateSnapshot['state'],
    actual: HeadlessRootState
  ): StateDiff => {
    const diffs: StateDiff = []
    const slices = [
      'ship',
      'shots',
      'planet',
      'screen',
      'status',
      'explosions',
      'walls',
      'transition'
    ] as const

    for (const slice of slices) {
      const expectedSlice = expected[slice]
      const actualSlice = actual[slice]

      // Deep comparison using JSON (simple but effective for validation)
      const expectedJson = JSON.stringify(expectedSlice)
      const actualJson = JSON.stringify(actualSlice)

      if (expectedJson !== actualJson) {
        diffs.push({
          path: slice,
          expected: expectedSlice,
          actual: actualSlice
        })
      }
    }

    return diffs
  }

  return {
    validate: recording => {
      const errors: ValidationReport['errors'] = []
      let framesValidated = 0
      let snapshotsChecked = 0
      let divergenceFrame: number | null = null

      // Initialize recording service in replay mode
      recordingService.startReplay(recording)

      // Get total frames from last input
      const totalFrames =
        recording.inputs[recording.inputs.length - 1]?.frame ?? 0

      // Run through all frames
      for (let frameCount = 0; frameCount <= totalFrames; frameCount++) {
        // Get controls for this frame
        const controls = recordingService.getReplayControls(frameCount)

        if (controls === null) {
          errors.push({
            frame: frameCount,
            type: 'MISSING_INPUT'
          })
          continue
        }

        // Step the game engine
        engine.step(frameCount, controls)
        framesValidated++

        // Check snapshots (prefer full snapshots for better debugging)
        const fullSnapshot = recording.fullSnapshots?.find(
          s => s.frame === frameCount
        )
        const hashSnapshot = recording.snapshots?.find(
          s => s.frame === frameCount
        )

        if (fullSnapshot) {
          // Use full state comparison for detailed error reporting
          const state = store.getState()
          const diffs = compareStates(fullSnapshot.state, state)
          snapshotsChecked++

          if (diffs.length > 0 && divergenceFrame === null) {
            divergenceFrame = frameCount
            errors.push({
              frame: frameCount,
              type: 'SNAPSHOT_MISMATCH',
              stateDiff: diffs
            })
          }
        } else if (hashSnapshot) {
          // Fall back to hash comparison (less detailed but still useful)
          const state = store.getState()
          const actualHash = hashState(state)
          const match = actualHash === hashSnapshot.hash
          snapshotsChecked++

          if (!match && divergenceFrame === null) {
            divergenceFrame = frameCount
            errors.push({
              frame: frameCount,
              type: 'SNAPSHOT_MISMATCH',
              expectedHash: hashSnapshot.hash,
              actualHash
            })
          }
        }
      }

      // Clean up
      recordingService.stopReplay()

      return {
        success: errors.length === 0,
        framesValidated,
        snapshotsChecked,
        divergenceFrame,
        errors
      }
    }
  }
}

export { createRecordingValidator, type ValidationReport }
