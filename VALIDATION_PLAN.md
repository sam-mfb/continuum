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

### 1. Headless Game Engine

`src/game/validation/HeadlessGameEngine.ts` - NEW

A stripped-down version of the game engine that only updates state:

```typescript
import type { GameStore } from '@/game/store'
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
  store: GameStore,
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

### 2. Validator Core

`src/game/validation/RecordingValidator.ts` - NEW

Main validation logic:

```typescript
import type { GameRecording } from '@/game/recording/types'
import type { HeadlessGameEngine } from './HeadlessGameEngine'
import type { GameStore } from '@/game/store'
import type { RecordingService } from '@/game/recording/RecordingService'
import type { RootState } from '@/game/store'

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
  }[]
}

const createRecordingValidator = (
  engine: HeadlessGameEngine,
  store: GameStore,
  recordingService: RecordingService
): {
  validate: (recording: GameRecording) => ValidationReport
} => {
  const hashState = (state: RootState): string => {
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

        // Check snapshot if one exists for this frame
        const expectedSnapshot = recording.snapshots?.find(
          s => s.frame === frameCount
        )

        if (expectedSnapshot) {
          const state = store.getState()
          const actualHash = hashState(state)
          const match = actualHash === expectedSnapshot.hash
          snapshotsChecked++

          if (!match && divergenceFrame === null) {
            divergenceFrame = frameCount
            errors.push({
              frame: frameCount,
              type: 'SNAPSHOT_MISMATCH',
              expectedHash: expectedSnapshot.hash,
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

### 3. CLI Tool

`scripts/validate-recording.ts` - NEW

Command-line interface:

```typescript
import { createRecordingStorage } from '@/game/recording/RecordingStorage'
import { createRecordingService } from '@/game/recording/RecordingService'
import { createHeadlessGameEngine } from '@/game/validation/HeadlessGameEngine'
import { createRecordingValidator } from '@/game/validation/RecordingValidator'
import { createGameStore } from '@/game/store'
import { createGalaxyService } from '@/core/galaxy'
import { createSpriteService } from '@/core/sprites'
import { createFizzTransitionService } from '@/core/transition'
import { createCollisionService } from '@/core/collision'
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

  // Create game services (minimal for headless)
  const galaxyService = await createGalaxyService(/* galaxy path from recording */)
  const spriteService = await createSpriteService(/* config */)
  const fizzTransitionService = createFizzTransitionService()
  const soundService = { /* mock sound service */ }
  const collisionService = createCollisionService()
  const randomService = createRandomService()
  const recordingService = createRecordingService()

  const services = {
    galaxyService,
    spriteService,
    fizzTransitionService,
    soundService,
    collisionService,
    randomService,
    recordingService
  }

  const store = createGameStore(services, {
    soundVolume: 0,
    soundEnabled: false,
    initialLives: recording.initialState.lives
  })

  const engine = createHeadlessGameEngine(
    store,
    galaxyService,
    fizzTransitionService,
    randomService
  )

  const validator = createRecordingValidator(engine, store, recordingService)

  console.log(`Validating: ${filePath}`)
  console.log(`Total frames: ${recording.inputs[recording.inputs.length - 1]?.frame ?? 0}`)

  const report = validator.validate(recording)

  console.log(`\nResult: ${report.success ? 'PASS' : 'FAIL'}`)
  console.log(`Frames validated: ${report.framesValidated}`)
  console.log(`Snapshots checked: ${report.snapshotsChecked}`)

  if (report.divergenceFrame !== null) {
    console.log(`Divergence at frame: ${report.divergenceFrame}`)
    const error = report.errors[0]
    if (error?.expectedHash && error?.actualHash) {
      console.log(`  Expected: ${error.expectedHash}`)
      console.log(`  Actual:   ${error.actualHash}`)
    }
  }

  process.exit(report.success ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
```

### 4. Package Script

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

### Phase 1: Headless Engine
1. Create `src/game/validation/HeadlessGameEngine.ts`
2. Test with simple recording

### Phase 2: Validator Core
1. Create `src/game/validation/RecordingValidator.ts`
2. Test snapshot comparison

### Phase 3: CLI Tool
1. Create `scripts/validate-recording.ts`
2. Test end-to-end validation
