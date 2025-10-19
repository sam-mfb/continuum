# Standalone Recording Validator

## Overview

This document describes the design for a standalone validation tool that verifies game recordings by running them through a headless, accelerated game engine. The validator runs as fast as possible (no rendering, no sound, no frame rate limiting) and compares the resulting game state against the state snapshots stored in the recording.

## Purpose

The validator serves multiple purposes:

1. **Determinism verification**: Confirms that recordings replay identically
2. **Regression testing**: Detects when code changes break replay compatibility
3. **Bug investigation**: Identifies exactly where and when state diverges
4. **CI/CD integration**: Automated testing of game logic determinism
5. **Recording repair**: Regenerate state snapshots for valid recordings

## Architecture Principles

1. **Headless execution** - No rendering, no display, no DOM
2. **Maximum speed** - Run as fast as possible, no frame rate limiting
3. **Minimal dependencies** - Core game logic only, no UI
4. **Isolated environment** - Node.js or Web Worker, not browser main thread
5. **Detailed reporting** - Frame-by-frame validation results

## Core Components

### 1. Headless Game Engine

A stripped-down version of the game engine that only updates state:

```typescript
// src/game/validation/HeadlessGameEngine.ts - NEW

import type { GameStore } from '@/game/store'
import type { ControlMatrix } from '@/core/controls'
import type { FrameInfo } from '@/game/gameLoop/types'
import { updateGameState } from '@/game/gameLoop/updateGameState'
import { createGameBitmap } from '@/core/bitmap/MonochromeBitmap'

type HeadlessGameEngine = {
  step: (frameCount: number, controls: ControlMatrix) => void
  reset: () => void
}

const createHeadlessGameEngine = (
  store: GameStore,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService
): HeadlessGameEngine => {
  return {
    step: (frameCount, controls) => {
      // Create minimal frame info
      const frameInfo: FrameInfo = {
        frameCount,
        timestamp: frameCount * 50 // 20 FPS = 50ms per frame
      }

      // Create bitmap (needed by some game logic, but we don't render it)
      const bitmap = createGameBitmap()

      // Update game state only
      updateGameState({
        store,
        frame: frameInfo,
        controls,
        bitmap,
        galaxyService,
        fizzTransitionService
      })

      // Note: We skip rendering entirely
      // Original: renderGame() or renderGameOriginal()
      // Validator: nothing - just state updates
    },

    reset: () => {
      // Reset store to initial state
      // Implementation depends on how store reset is handled
      store.dispatch({ type: 'RESET_GAME' })
    }
  }
}

export { createHeadlessGameEngine, type HeadlessGameEngine }
```

### 2. Validator Core

Main validation logic that runs recordings through the headless engine:

```typescript
// src/game/validation/RecordingValidator.ts - NEW

import type { GameRecording, StateSnapshot } from '@/game/recording/types'
import type { HeadlessGameEngine } from './HeadlessGameEngine'
import type { GameStore } from '@/game/store'
import type { RecordingService } from '@/game/recording/RecordingService'

type ValidationReport = {
  recording: {
    id: string
    engineVersion: number
    galaxyId: string
    startLevel: number
    totalFrames: number
  }
  validation: {
    success: boolean
    framesValidated: number
    snapshotsChecked: number
    divergenceFrame: number | null
    errors: ValidationError[]
  }
  performance: {
    durationMs: number
    framesPerSecond: number
    speedupFactor: number // How much faster than real-time
  }
  stateSnapshots: {
    frame: number
    expected: string
    actual: string
    match: boolean
  }[]
}

type ValidationError = {
  frame: number
  type: 'SNAPSHOT_MISMATCH' | 'MISSING_INPUT' | 'MISSING_SEED' | 'STATE_ERROR'
  message: string
  expectedHash?: string
  actualHash?: string
}

type RecordingValidatorOptions = {
  verbose?: boolean // Log progress
  stopOnFirstError?: boolean // Stop at first divergence
  generateSnapshots?: boolean // Regenerate snapshots for valid recordings
}

const createRecordingValidator = (
  engine: HeadlessGameEngine,
  store: GameStore,
  recordingService: RecordingService,
  options: RecordingValidatorOptions = {}
): {
  validate: (recording: GameRecording) => Promise<ValidationReport>
} => {
  const { verbose = false, stopOnFirstError = false, generateSnapshots = false } = options

  const hashState = (state: RootState): string => {
    // Same hash function as SnapshotService and ReplayValidator
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
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(16)
  }

  return {
    validate: async (recording) => {
      const startTime = performance.now()
      const errors: ValidationError[] = []
      const snapshotResults: ValidationReport['stateSnapshots'] = []
      let framesValidated = 0
      let snapshotsChecked = 0
      let divergenceFrame: number | null = null

      // Initialize recording service in replay mode
      recordingService.startReplay(recording)

      // Reset engine to initial state
      engine.reset()

      // TODO: Load initial state from recording
      // dispatch(statusSlice.actions.setLives(recording.initialState.lives))
      // dispatch(loadLevel(recording.startLevel))

      // Get total frames from last input
      const totalFrames = recording.inputs[recording.inputs.length - 1]?.frame ?? 0

      if (verbose) {
        console.log(`Validating recording: ${totalFrames} frames`)
      }

      // Run through all frames
      for (let frameCount = 0; frameCount <= totalFrames; frameCount++) {
        // Get controls for this frame
        const controls = recordingService.getReplayControls(frameCount)

        if (controls === null) {
          errors.push({
            frame: frameCount,
            type: 'MISSING_INPUT',
            message: `No input data for frame ${frameCount}`
          })
          if (stopOnFirstError) break
          continue
        }

        // Step the game engine
        try {
          engine.step(frameCount, controls)
          framesValidated++
        } catch (error) {
          errors.push({
            frame: frameCount,
            type: 'STATE_ERROR',
            message: `Error updating state: ${error}`
          })
          if (stopOnFirstError) break
          continue
        }

        // Check snapshot if one exists for this frame
        const expectedSnapshot = recording.snapshots?.find(s => s.frame === frameCount)

        if (expectedSnapshot || generateSnapshots) {
          const state = store.getState()
          const actualHash = hashState(state)

          if (expectedSnapshot) {
            const match = actualHash === expectedSnapshot.hash
            snapshotsChecked++

            snapshotResults.push({
              frame: frameCount,
              expected: expectedSnapshot.hash,
              actual: actualHash,
              match
            })

            if (!match && divergenceFrame === null) {
              divergenceFrame = frameCount
              errors.push({
                frame: frameCount,
                type: 'SNAPSHOT_MISMATCH',
                message: `State diverged at frame ${frameCount}`,
                expectedHash: expectedSnapshot.hash,
                actualHash
              })
              if (stopOnFirstError) break
            }
          } else if (generateSnapshots) {
            // Generate new snapshot
            snapshotResults.push({
              frame: frameCount,
              expected: actualHash,
              actual: actualHash,
              match: true
            })
          }
        }

        // Progress logging
        if (verbose && frameCount % 1000 === 0) {
          console.log(`Validated ${frameCount}/${totalFrames} frames...`)
        }
      }

      // Clean up
      recordingService.stopReplay()

      // Calculate performance metrics
      const endTime = performance.now()
      const durationMs = endTime - startTime
      const framesPerSecond = (framesValidated / durationMs) * 1000
      const speedupFactor = framesPerSecond / 20 // Game runs at 20 FPS

      const report: ValidationReport = {
        recording: {
          id: recording.timestamp.toString(),
          engineVersion: recording.engineVersion,
          galaxyId: recording.galaxyId,
          startLevel: recording.startLevel,
          totalFrames
        },
        validation: {
          success: errors.length === 0,
          framesValidated,
          snapshotsChecked,
          divergenceFrame,
          errors
        },
        performance: {
          durationMs,
          framesPerSecond,
          speedupFactor
        },
        stateSnapshots: snapshotResults
      }

      return report
    }
  }
}

export { createRecordingValidator, type RecordingValidatorOptions, type ValidationReport }
```

### 3. CLI Tool

Command-line interface for running validation:

```typescript
// scripts/validate-recording.ts - NEW

import { createRecordingStorage } from '@/game/recording/RecordingStorage'
import { createRecordingService } from '@/game/recording/RecordingService'
import { createHeadlessGameEngine } from '@/game/validation/HeadlessGameEngine'
import { createRecordingValidator } from '@/game/validation/RecordingValidator'
import { createGameStore } from '@/game/store'
import { createGameServices } from '@/game/services'
import fs from 'fs'

const main = async () => {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npm run validate-recording <recording-file.json>')
    console.log('       npm run validate-recording --all')
    console.log('       npm run validate-recording --id <storage-id>')
    process.exit(1)
  }

  const storage = createRecordingStorage()
  const services = createGameServices()
  const store = createGameStore(services, {})
  const recordingService = createRecordingService()
  const engine = createHeadlessGameEngine(
    store,
    services.galaxyService,
    services.fizzTransitionService
  )

  const validator = createRecordingValidator(engine, store, recordingService, {
    verbose: true,
    stopOnFirstError: false
  })

  let recordings: { id: string; recording: GameRecording }[] = []

  // Load recording(s)
  if (args[0] === '--all') {
    // Validate all recordings in localStorage
    const index = storage.list()
    recordings = index.map(item => ({
      id: item.id,
      recording: storage.load(item.id)!
    }))
  } else if (args[0] === '--id') {
    // Load from localStorage by ID
    const id = args[1]
    const recording = storage.load(id)
    if (!recording) {
      console.error(`Recording not found: ${id}`)
      process.exit(1)
    }
    recordings = [{ id, recording }]
  } else {
    // Load from file
    const filePath = args[0]
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const recording = JSON.parse(fileContent)
    recordings = [{ id: filePath, recording }]
  }

  // Validate each recording
  const results: { id: string; report: ValidationReport }[] = []

  for (const { id, recording } of recordings) {
    console.log(`\n=== Validating: ${id} ===\n`)

    const report = await validator.validate(recording)

    results.push({ id, report })

    // Print report
    console.log('\n--- Validation Report ---')
    console.log(`Recording: ${report.recording.id}`)
    console.log(`Engine Version: ${report.recording.engineVersion}`)
    console.log(`Galaxy: ${report.recording.galaxyId}`)
    console.log(`Start Level: ${report.recording.startLevel}`)
    console.log(`Total Frames: ${report.recording.totalFrames}`)
    console.log()
    console.log(`Validation: ${report.validation.success ? 'PASS' : 'FAIL'}`)
    console.log(`Frames Validated: ${report.validation.framesValidated}`)
    console.log(`Snapshots Checked: ${report.validation.snapshotsChecked}`)

    if (report.validation.divergenceFrame !== null) {
      console.log(`Divergence at Frame: ${report.validation.divergenceFrame}`)
    }

    if (report.validation.errors.length > 0) {
      console.log('\nErrors:')
      report.validation.errors.forEach(err => {
        console.log(`  Frame ${err.frame} [${err.type}]: ${err.message}`)
        if (err.expectedHash && err.actualHash) {
          console.log(`    Expected: ${err.expectedHash}`)
          console.log(`    Actual:   ${err.actualHash}`)
        }
      })
    }

    console.log()
    console.log(`Performance:`)
    console.log(`  Duration: ${report.performance.durationMs.toFixed(2)}ms`)
    console.log(`  FPS: ${report.performance.framesPerSecond.toFixed(2)}`)
    console.log(`  Speedup: ${report.performance.speedupFactor.toFixed(2)}x real-time`)
  }

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Total recordings validated: ${results.length}`)
  console.log(`Passed: ${results.filter(r => r.report.validation.success).length}`)
  console.log(`Failed: ${results.filter(r => !r.report.validation.success).length}`)

  // Exit with error code if any failed
  const anyFailed = results.some(r => !r.report.validation.success)
  process.exit(anyFailed ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
```

### 4. Package Script

Add to package.json:

```json
{
  "scripts": {
    "validate-recording": "tsx scripts/validate-recording.ts"
  }
}
```

## Usage Examples

### Validate a single recording file

```bash
npm run validate-recording path/to/recording.json
```

### Validate a recording from localStorage

```bash
npm run validate-recording --id 1704067200000_abc123def
```

### Validate all saved recordings

```bash
npm run validate-recording --all
```

### CI/CD Integration

```yaml
# .github/workflows/validate-recordings.yml
name: Validate Recordings

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run validate-recording test/fixtures/recording-*.json
```

## Advanced Features

### 1. Snapshot Regeneration

Generate new snapshots for recordings that don't have them:

```typescript
// scripts/regenerate-snapshots.ts - NEW

import { createRecordingValidator } from '@/game/validation/RecordingValidator'
import { createRecordingStorage } from '@/game/recording/RecordingStorage'

const main = async () => {
  const storage = createRecordingStorage()
  const recordingId = process.argv[2]

  const recording = storage.load(recordingId)
  if (!recording) {
    console.error('Recording not found')
    process.exit(1)
  }

  // Validate with snapshot generation enabled
  const validator = createRecordingValidator(engine, store, recordingService, {
    verbose: true,
    generateSnapshots: true
  })

  const report = await validator.validate(recording)

  // Update recording with new snapshots
  recording.snapshots = report.stateSnapshots.map(s => ({
    frame: s.frame,
    hash: s.actual
  }))

  // Save updated recording
  storage.save(recording)

  console.log(`Regenerated ${recording.snapshots.length} snapshots`)
}

main()
```

### 2. Detailed Divergence Analysis

When state diverges, show exactly what changed:

```typescript
// src/game/validation/DivergenceAnalyzer.ts - NEW

type DivergenceAnalysis = {
  frame: number
  differences: {
    path: string // e.g., "ship.x", "shots[0].vx"
    expected: any
    actual: any
  }[]
}

const analyzeDivergence = (
  expectedState: RootState,
  actualState: RootState
): DivergenceAnalysis => {
  const differences: DivergenceAnalysis['differences'] = []

  // Deep comparison of state objects
  const compare = (expected: any, actual: any, path: string) => {
    if (typeof expected !== typeof actual) {
      differences.push({ path, expected, actual })
      return
    }

    if (Array.isArray(expected)) {
      if (expected.length !== actual.length) {
        differences.push({ path: `${path}.length`, expected: expected.length, actual: actual.length })
      }
      for (let i = 0; i < Math.min(expected.length, actual.length); i++) {
        compare(expected[i], actual[i], `${path}[${i}]`)
      }
    } else if (typeof expected === 'object' && expected !== null) {
      const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
      for (const key of keys) {
        compare(expected[key], actual[key], path ? `${path}.${key}` : key)
      }
    } else if (expected !== actual) {
      differences.push({ path, expected, actual })
    }
  }

  compare(expectedState, actualState, '')

  return {
    frame: 0, // Set by caller
    differences
  }
}

export { analyzeDivergence, type DivergenceAnalysis }
```

### 3. Performance Benchmarking

Measure how fast the validator can run:

```typescript
// scripts/benchmark-validator.ts - NEW

const main = async () => {
  // Run validator multiple times to get average performance
  const iterations = 10
  const results: number[] = []

  for (let i = 0; i < iterations; i++) {
    const report = await validator.validate(recording)
    results.push(report.performance.framesPerSecond)
  }

  const avgFps = results.reduce((a, b) => a + b, 0) / results.length
  const minFps = Math.min(...results)
  const maxFps = Math.max(...results)

  console.log('Performance Benchmark:')
  console.log(`  Average FPS: ${avgFps.toFixed(2)}`)
  console.log(`  Min FPS: ${minFps.toFixed(2)}`)
  console.log(`  Max FPS: ${maxFps.toFixed(2)}`)
  console.log(`  Average Speedup: ${(avgFps / 20).toFixed(2)}x`)
}
```

## Implementation Plan

### Phase 1: Headless Engine (2-3 hours)

1. Create `HeadlessGameEngine.ts`
2. Extract state update logic from game loop
3. Test: can run game state updates without rendering
4. Verify: produces same results as normal engine

### Phase 2: Validator Core (3-4 hours)

1. Create `RecordingValidator.ts`
2. Implement frame-by-frame validation
3. Add snapshot comparison
4. Add error reporting
5. Test: can validate simple recordings

### Phase 3: CLI Tool (2-3 hours)

1. Create `validate-recording.ts` script
2. Add file loading
3. Add localStorage integration
4. Add progress reporting
5. Test: can run from command line

### Phase 4: Advanced Features (3-4 hours)

1. Add snapshot regeneration
2. Add divergence analyzer
3. Add performance benchmarking
4. Create CI/CD integration example
5. Test: all features work together

**Total Estimated Time: 10-14 hours**

## Performance Expectations

The validator should run significantly faster than real-time:

- **Target**: 100-1000x speedup (2000-20000 FPS)
- **Bottleneck**: State updates and JSON serialization for hashing
- **10-minute game**: Validate in 0.6-6 seconds
- **1-hour game**: Validate in 3.6-36 seconds

Actual performance depends on:
- Game state complexity
- Number of snapshots
- Hash algorithm efficiency
- Hardware (CPU speed)

## Use Cases

### 1. Development Workflow

```bash
# After making changes to game logic, validate existing recordings
npm run validate-recording --all

# If validation fails, find the divergence point
npm run validate-recording recording.json --verbose
```

### 2. Bug Reports

Users can submit recordings along with bug reports:

```bash
# Developer validates the recording
npm run validate-recording user-bug-report.json

# If it fails, analyze the divergence
npm run analyze-divergence user-bug-report.json
```

### 3. Regression Testing

```bash
# CI/CD runs validation on every commit
npm run validate-recording test/fixtures/*.json

# Exit code 0 = all pass, 1 = any fail
```

### 4. Performance Testing

```bash
# Benchmark validator performance
npm run benchmark-validator recording.json

# Results: Average 5000 FPS (250x speedup)
```

## Testing Strategy

### Unit Tests

- State hashing consistency
- Snapshot comparison logic
- Error detection and reporting
- Performance measurement accuracy

### Integration Tests

1. Create test recording with known state
2. Validate with correct engine version → should pass
3. Modify state update logic → should detect divergence
4. Corrupt recording data → should detect errors

### Benchmarks

- Measure validator throughput (frames/second)
- Compare performance with different snapshot intervals
- Test with varying game complexity (early levels vs late levels)

## Notes

- Validator runs entirely independently of the UI
- Can run in Node.js, Web Worker, or browser console
- Useful for automated testing and debugging
- Fast enough to validate hours of gameplay in seconds
- Essential for maintaining determinism as codebase evolves
