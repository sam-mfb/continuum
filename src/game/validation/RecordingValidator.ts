import type { GameRecording, FullStateSnapshot } from '@/game/recording/types'
import type { HeadlessGameEngine } from './HeadlessGameEngine'
import type { HeadlessStore, HeadlessRootState } from './createHeadlessStore'
import type { RecordingService } from '@/game/recording/RecordingService'
import type { RandomService } from '@/core/shared'
import { loadLevel } from '@/game/levelThunks'

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
  recordingService: RecordingService,
  randomService: RandomService
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

      // Initialize first level before starting validation
      // Use the recorded seed to ensure deterministic replay
      if (recording.levelSeeds.length === 0) {
        throw new Error('Recording has no level seeds')
      }

      const firstLevelSeed = recording.levelSeeds[0]
      if (!firstLevelSeed) {
        throw new Error('First level seed is undefined')
      }

      randomService.setSeed(firstLevelSeed.seed)
      // Cast to any because thunk types don't match exactly (HeadlessStore vs GameStore)
      // but the thunk will work since HeadlessStore has all the required slices
      store.dispatch(loadLevel(firstLevelSeed.level) as any)

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
        // Check if we need to load the next level
        // This happens when the current level in game state changes
        const currentGameLevel = store.getState().status.currentlevel
        const nextLevelIndex = currentLevelIndex + 1

        const currentLevelSeed = recording.levelSeeds[currentLevelIndex]
        if (
          nextLevelIndex < recording.levelSeeds.length &&
          currentLevelSeed &&
          currentGameLevel !== currentLevelSeed.level
        ) {
          // Level transition detected - initialize next level
          const nextLevelSeed = recording.levelSeeds[nextLevelIndex]
          if (!nextLevelSeed) {
            throw new Error(`Level seed ${nextLevelIndex} is undefined`)
          }

          randomService.setSeed(nextLevelSeed.seed)
          store.dispatch(loadLevel(nextLevelSeed.level) as any)
          currentLevelIndex = nextLevelIndex

          console.log(
            `Level transition: Initialized level ${nextLevelSeed.level} with seed ${nextLevelSeed.seed}`
          )
        }

        // Get controls for this frame
        const controls = recordingService.getReplayControls(frameCount)

        if (controls === null) {
          errors.push({
            frame: frameCount,
            type: 'MISSING_INPUT'
          })
          continue
        }

        // Step the game engine FIRST (snapshots are taken after game steps)
        engine.step(frameCount, controls)
        framesValidated++

        // Check snapshots AFTER stepping (snapshots capture post-step state)
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
