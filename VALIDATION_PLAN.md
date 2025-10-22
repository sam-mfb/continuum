# Standalone Recording Validator

## Overview

A standalone validation tool that verifies game recordings by running them through a headless, accelerated game engine. The validator runs as fast as possible (no rendering, no sound, no frame rate limiting) and compares the resulting game state against the state snapshots stored in the recording.

## Purpose

1. **Determinism verification**: Confirms that recordings replay identically
2. **Regression testing**: Detects when code changes break replay compatibility
3. **Bug investigation**: Identifies exactly where and when state diverges

## Key Insight

The validator leverages the fact that game state updates are completely independent from rendering:

- `updateGameState()` handles all physics, collisions, and game logic
- It does NOT require a bitmap or any rendering artifacts
- Rendering is purely visual - it draws the current state but doesn't affect it
- This allows the validator to run at maximum speed with zero rendering overhead

## Components

### 1. Headless Store

`src/game/validation/createHeadlessStore.ts` - NEW

A minimal Redux store with only game logic (no UI, sound, or persistence):

```typescript
import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { gameSlice } from '@/game/gameSlice'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { screenSlice } from '@core/screen'
import { statusSlice } from '@core/status'
import { explosionsSlice } from '@core/explosions'
import { wallsSlice } from '@core/walls'
import { transitionSlice } from '@core/transition'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { RandomService } from '@/core/shared'
import type { RecordingService } from '@/game/recording/RecordingService'

// Minimal services needed for game logic only
type HeadlessServices = {
  galaxyService: GalaxyService
  fizzTransitionService: FizzTransitionService
  randomService: RandomService
  recordingService: RecordingService
}

const headlessReducer = combineSlices(
  gameSlice,
  shipSlice,
  shotsSlice,
  planetSlice,
  screenSlice,
  statusSlice,
  explosionsSlice,
  wallsSlice,
  transitionSlice
)

export type HeadlessRootState = ReturnType<typeof headlessReducer>

const createHeadlessStore = (
  services: HeadlessServices,
  initialLives: number
) => {
  const preloadedState = {
    ship: {
      ...shipSlice.getInitialState(),
      lives: initialLives
    }
  }

  return configureStore({
    reducer: headlessReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: {
          extraArgument: services
        },
        serializableCheck: {
          ignoredActionPaths: ['meta.payloadCreator', 'meta.result']
        }
      }),
    preloadedState
  })
}

export type HeadlessStore = ReturnType<typeof createHeadlessStore>

export { createHeadlessStore, type HeadlessServices }
```

### 2. Headless Game Engine

`src/game/validation/HeadlessGameEngine.ts` - NEW

A stripped-down version of the game engine that only updates state:

```typescript
import type { HeadlessStore } from './createHeadlessStore'
import type { ControlMatrix } from '@/core/controls'
import type { FrameInfo } from '@lib/bitmap'
import type { GalaxyService } from '@core/galaxy'
import type { FizzTransitionService } from '@core/transition'
import type { RandomService } from '@/core/shared'
import { updateGameState } from '@/game/gameLoop/stateUpdates'

type HeadlessGameEngine = {
  step: (frameCount: number, controls: ControlMatrix) => void
}

const createHeadlessGameEngine = (
  store: HeadlessStore,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService,
  randomService: RandomService
): HeadlessGameEngine => {
  // Create transition callbacks for the fizz service
  const transitionCallbacks = {
    isInitialized: (): boolean => fizzTransitionService.isInitialized,
    isComplete: (): boolean => fizzTransitionService.isComplete,
    reset: (): void => fizzTransitionService.reset()
  }

  return {
    step: (frameCount, controls) => {
      // Create minimal frame info
      const frameInfo: FrameInfo = {
        frameCount,
        deltaTime: 50, // 20 FPS = 50ms per frame
        totalTime: frameCount * 50,
        targetDelta: 50
      }

      // Update game state only - no rendering needed
      updateGameState({
        store,
        frame: frameInfo,
        controls,
        galaxyService,
        transitionCallbacks,
        randomService
      })
    }
  }
}

export { createHeadlessGameEngine, type HeadlessGameEngine }
```

### 3. Validator Core

`src/game/validation/RecordingValidator.ts` - NEW

Main validation logic:

```typescript
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
```

### 4. CLI Tool

`scripts/validate-recording.ts` - NEW

Command-line interface:

```typescript
import { createRecordingService } from '@/game/recording/RecordingService'
import { createHeadlessGameEngine } from '@/game/validation/HeadlessGameEngine'
import { createRecordingValidator } from '@/game/validation/RecordingValidator'
import { createHeadlessStore } from '@/game/validation/createHeadlessStore'
import { createGalaxyService } from '@/core/galaxy'
import { createFizzTransitionService } from '@/core/transition'
import { createRandomService } from '@/core/shared'
import fs from 'fs'

const main = async () => {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npm run validate-recording <recording-file.json>')
    process.exit(1)
  }

  // Load recording from file
  const filePath = args[0]
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const recording = JSON.parse(fileContent)

  // Create minimal services for headless validation
  const galaxyService = await createGalaxyService(recording.galaxyId)
  const fizzTransitionService = createFizzTransitionService()
  const randomService = createRandomService()
  const recordingService = createRecordingService()

  const services = {
    galaxyService,
    fizzTransitionService,
    randomService,
    recordingService
  }

  // Create headless store (no UI, sound, or persistence)
  const store = createHeadlessStore(services, recording.initialState.lives)

  const engine = createHeadlessGameEngine(
    store,
    galaxyService,
    fizzTransitionService,
    randomService
  )

  const validator = createRecordingValidator(engine, store, recordingService)

  console.log(`Validating: ${filePath}`)
  console.log(`Galaxy: ${recording.galaxyId}`)
  console.log(`Start level: ${recording.startLevel}`)
  console.log(
    `Total frames: ${recording.inputs[recording.inputs.length - 1]?.frame ?? 0}`
  )

  const report = validator.validate(recording)

  console.log(`\nResult: ${report.success ? 'PASS' : 'FAIL'}`)
  console.log(`Frames validated: ${report.framesValidated}`)
  console.log(`Snapshots checked: ${report.snapshotsChecked}`)

  if (report.divergenceFrame !== null) {
    console.log(`\nDivergence at frame: ${report.divergenceFrame}`)
    const error = report.errors[0]

    if (error?.stateDiff) {
      // Full state diff available - show detailed comparison
      console.log(`\nState differences (${error.stateDiff.length} slices):`)
      for (const diff of error.stateDiff) {
        console.log(`\n  ${diff.path}:`)
        console.log(
          `    Expected: ${JSON.stringify(diff.expected).substring(0, 200)}...`
        )
        console.log(
          `    Actual:   ${JSON.stringify(diff.actual).substring(0, 200)}...`
        )
      }
    } else if (error?.expectedHash && error?.actualHash) {
      // Only hash available - show hash comparison
      console.log(`  Expected hash: ${error.expectedHash}`)
      console.log(`  Actual hash:   ${error.actualHash}`)
    }
  }

  process.exit(report.success ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
```

### 5. Package Script

Add to `package.json`:

```json
{
  "scripts": {
    "validate-recording": "tsx scripts/validate-recording.ts"
  }
}
```

## Usage

```bash
npm run validate-recording path/to/recording.json
```

## Implementation Plan

### Phase 1: Headless Store

1. Create `src/game/validation/createHeadlessStore.ts`
2. Test that it creates a minimal Redux store with only game logic

### Phase 2: Headless Engine & Validator

1. Create `src/game/validation/HeadlessGameEngine.ts`
2. Create `src/game/validation/RecordingValidator.ts`
3. Test snapshot comparison with simple recording

### Phase 3: CLI Tool

1. Create `scripts/validate-recording.ts`
2. Add npm script to `package.json`
3. Test end-to-end validation
