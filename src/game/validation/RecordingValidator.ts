import type { GameRecording, FullStateSnapshot } from '@/game/recording/types'
import type { HeadlessGameEngine } from './HeadlessGameEngine'
import type { HeadlessStore, HeadlessRootState } from './createHeadlessStore'
import type { RecordingService } from '@/game/recording/RecordingService'
import { loadLevel } from '@/game/levelThunks'

type StateDiff = {
  path: string
  expected: unknown
  actual: unknown
}[]

type FinalStateError = {
  field: string
  expected: number
  actual: number
}

type ValidationReport = {
  success: boolean
  framesValidated: number
  snapshotsChecked: number
  divergenceFrame: number | null
  finalStateMatch: boolean
  finalStateErrors?: FinalStateError[]
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
    validate: (recording): ValidationReport => {
      const errors: ValidationReport['errors'] = []
      let framesValidated = 0
      let snapshotsChecked = 0
      let divergenceFrame: number | null = null

      // Initialize recording service in replay mode
      recordingService.startReplay(recording)

      // Initialize first level before starting validation
      // Use the recorded seed to ensure deterministic replay
      if (recording.levelSeeds.length === 0) {
        throw new Error('Recording has no level seeds')
      }

      const firstLevelSeed = recording.levelSeeds[0]
      if (!firstLevelSeed) {
        throw new Error('First level seed is undefined')
      }

      // Pass the recorded seed to loadLevel so it uses that instead of Date.now()
      // Type assertion needed due to thunk typing complexity in validation context
      void store.dispatch(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        loadLevel(firstLevelSeed.level, firstLevelSeed.seed) as any
      )

      console.log(
        `Initialized level ${firstLevelSeed.level} with seed ${firstLevelSeed.seed}`
      )

      // Track current level index for multi-level games
      let currentLevelIndex = 0

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

        // Check snapshots BEFORE stepping for frame 0 (initial state after level load)
        // For all other frames, check AFTER stepping (post-update state)
        const fullSnapshot = recording.fullSnapshots?.find(
          s => s.frame === frameCount
        )
        const hashSnapshot = recording.snapshots?.find(
          s => s.frame === frameCount
        )

        // Validate snapshot before processing this frame (recording captures pre-update state)
        if (fullSnapshot || hashSnapshot) {
          if (fullSnapshot) {
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

        // Step the game engine
        engine.step(frameCount, controls)
        framesValidated++

        // DON'T manually load the next level - the game engine does this automatically
        // during updateTransitionState when starmap completes (stateUpdates.ts:757)
        // The loadLevel thunk is called by transitionToNextLevel
        //
        // However, we DO need to track which level we're on for the recording's levelSeeds
        // Check if level changed after stepping (transition completed and loaded next level)
        const currentGameLevel = store.getState().status.currentlevel
        const currentTransitionStatus = store.getState().transition.status

        const currentLevelSeed = recording.levelSeeds[currentLevelIndex]
        const nextLevelIndex = currentLevelIndex + 1

        // Only update currentLevelIndex if we've completed a transition (status is inactive)
        // and the level number has changed
        if (
          nextLevelIndex < recording.levelSeeds.length &&
          currentLevelSeed &&
          currentGameLevel !== currentLevelSeed.level &&
          currentTransitionStatus === 'inactive'
        ) {
          // Level transition completed - just update our tracking index
          currentLevelIndex = nextLevelIndex

          console.log(
            `Level transition completed: Now on level ${currentGameLevel}`
          )
        }
      }

      // Validate final state if present in recording
      let finalStateMatch = true
      const finalStateErrors: FinalStateError[] = []

      if (recording.finalState) {
        const finalState = store.getState()

        // Check score
        if (finalState.status.score !== recording.finalState.score) {
          finalStateMatch = false
          finalStateErrors.push({
            field: 'score',
            expected: recording.finalState.score,
            actual: finalState.status.score
          })
        }

        // Check fuel
        if (finalState.ship.fuel !== recording.finalState.fuel) {
          finalStateMatch = false
          finalStateErrors.push({
            field: 'fuel',
            expected: recording.finalState.fuel,
            actual: finalState.ship.fuel
          })
        }

        // Check level
        if (finalState.status.currentlevel !== recording.finalState.level) {
          finalStateMatch = false
          finalStateErrors.push({
            field: 'level',
            expected: recording.finalState.level,
            actual: finalState.status.currentlevel
          })
        }

        if (!finalStateMatch) {
          console.error('Final state validation failed:', finalStateErrors)
        } else {
          console.log('Final state validation passed ✓')
        }
      } else {
        console.warn(
          'Recording does not contain finalState - skipping final state validation (old recording format)'
        )
      }

      // Clean up
      recordingService.stopReplay()

      return {
        success: errors.length === 0 && finalStateMatch,
        framesValidated,
        snapshotsChecked,
        divergenceFrame,
        finalStateMatch,
        finalStateErrors:
          finalStateErrors.length > 0 ? finalStateErrors : undefined,
        errors
      }
    }
  }
}

export { createRecordingValidator, type ValidationReport }
