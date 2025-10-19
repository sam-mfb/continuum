# Replay System

## Overview

This document describes the design for implementing game replay functionality in Continuum. The system plays back previously recorded games using captured inputs and level seeds to recreate the exact game session. Recording functionality is covered in RECORDING_PLAN.md.

## Prerequisites

✅ **Recording System**: RECORDING_PLAN.md must be implemented first
- RecordingService, RecordingStorage, and types are already available
- Recordings include inputs, level seeds, and state snapshots

## Architecture Principles

1. **Replay as extension of RecordingService** - Same service handles both modes
2. **Transparent control override** - Replays recorded inputs instead of keyboard
3. **Strict validation** - Check engine version and galaxy compatibility
4. **State verification** - Compare state snapshots during playback

## Core Components

### 1. Extended Recording Service

The RecordingService is extended to support replay mode:

```typescript
// src/game/recording/RecordingService.ts - EXTENDED

import type { ControlMatrix } from '@/core/controls'
import type { GameRecording, RecordingMetadata, InputFrame, LevelSeed } from './types'

type RecordingMode = 'idle' | 'recording' | 'replaying'

type RecordingService = {
  // Recording (already exists)
  startRecording: (metadata: RecordingMetadata) => void
  stopRecording: () => GameRecording | null
  isRecording: () => boolean
  recordLevelSeed: (level: number, seed: number) => void
  recordFrame: (frameCount: number, controls: ControlMatrix) => void

  // Replay (NEW)
  startReplay: (recording: GameRecording) => void
  stopReplay: () => void
  isReplaying: () => boolean
  getReplayControls: (frameCount: number) => ControlMatrix | null
  getReplayLevelSeed: (level: number) => number | null

  // Mode
  getMode: () => RecordingMode
}

const createRecordingService = (): RecordingService => {
  // ... existing recording state ...
  let replayData: GameRecording | null = null
  let replayIndex = 0

  return {
    // ... existing recording methods ...

    startReplay: recording => {
      if (mode !== 'idle') {
        throw new Error(
          `Cannot start replay: currently in ${mode} mode. Call stop${mode === 'recording' ? 'Recording' : 'Replay'}() first.`
        )
      }
      mode = 'replaying'
      replayData = recording
      replayIndex = 0
    },

    getReplayControls: frameCount => {
      if (mode !== 'replaying' || !replayData) return null

      // Find the most recent input frame <= current frame
      while (
        replayIndex < replayData.inputs.length - 1 &&
        replayData.inputs[replayIndex + 1].frame <= frameCount
      ) {
        replayIndex++
      }

      return replayData.inputs[replayIndex]?.controls ?? null
    },

    getReplayLevelSeed: level => {
      if (mode !== 'replaying' || !replayData) return null
      const levelSeed = replayData.levelSeeds.find(ls => ls.level === level)
      return levelSeed?.seed ?? null
    },

    stopReplay: () => {
      mode = 'idle'
      replayData = null
      replayIndex = 0
    },

    isReplaying: () => mode === 'replaying',

    getMode: () => mode
  }
}

export { createRecordingService, type RecordingService, type RecordingMode }
```

### 2. Replay Validation Service

Validates recordings before playback and verifies state during playback:

```typescript
// src/game/recording/ReplayValidator.ts - NEW

import type { GameRecording } from './types'
import type { RootState } from '@/game/store'
import { GAME_ENGINE_VERSION } from '@/game/version'

type ValidationResult = {
  valid: boolean
  errors: string[]
}

type ReplayValidator = {
  validateRecording: (recording: GameRecording, currentGalaxyId: string) => ValidationResult
  validateStateSnapshot: (frameCount: number, state: RootState, recording: GameRecording) => boolean
}

const createReplayValidator = (): ReplayValidator => {
  const hashState = (state: RootState): string => {
    // Same hash function as SnapshotService
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
    validateRecording: (recording, currentGalaxyId) => {
      const errors: string[] = []

      // Check recording format version
      if (!recording.version) {
        errors.push('Recording is missing version information')
      }

      // Check engine version
      if (recording.engineVersion !== GAME_ENGINE_VERSION) {
        errors.push(
          `Recording requires game engine v${recording.engineVersion}, ` +
          `but you're running v${GAME_ENGINE_VERSION}. ` +
          `This recording is incompatible with your current game version.`
        )
      }

      // Check galaxy ID
      if (recording.galaxyId !== currentGalaxyId) {
        errors.push(
          `Recording is for galaxy "${recording.galaxyId}", ` +
          `but current galaxy is "${currentGalaxyId}". ` +
          `This recording may be from a different or modified galaxy file.`
        )
      }

      // Check required fields
      if (!recording.inputs || recording.inputs.length === 0) {
        errors.push('Recording has no input data')
      }

      if (!recording.levelSeeds || recording.levelSeeds.length === 0) {
        errors.push('Recording has no level seed data')
      }

      if (!recording.initialState) {
        errors.push('Recording is missing initial state')
      }

      return {
        valid: errors.length === 0,
        errors
      }
    },

    validateStateSnapshot: (frameCount, state, recording) => {
      // Find snapshot for this frame
      const snapshot = recording.snapshots?.find(s => s.frame === frameCount)
      if (!snapshot) return true // No snapshot at this frame, skip validation

      // Compare hashes
      const currentHash = hashState(state)
      if (currentHash !== snapshot.hash) {
        console.error(
          `Replay diverged at frame ${frameCount}!\n` +
          `Expected hash: ${snapshot.hash}\n` +
          `Actual hash: ${currentHash}`
        )
        return false
      }

      return true
    }
  }
}

export { createReplayValidator, type ReplayValidator }
```

### 3. Replay UI Components

Basic UI for selecting and controlling replays:

```typescript
// src/game/components/ReplayControls.tsx - NEW

import React from 'react'
import type { RecordingService } from '@/game/recording/RecordingService'

type ReplayControlsProps = {
  recordingService: RecordingService
  currentFrame: number
  totalFrames: number
  onStop: () => void
}

const ReplayControls: React.FC<ReplayControlsProps> = ({
  recordingService,
  currentFrame,
  totalFrames,
  onStop
}) => {
  if (!recordingService.isReplaying()) return null

  const progress = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0

  return (
    <div className="replay-controls">
      <div className="replay-indicator">REPLAY</div>
      <div className="replay-progress">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <div className="replay-info">
        Frame {currentFrame} / {totalFrames}
      </div>
      <button onClick={onStop}>Stop Replay</button>
    </div>
  )
}

export default ReplayControls
```

```typescript
// src/game/components/ReplayBrowser.tsx - NEW

import React from 'react'
import type { RecordingStorage } from '@/game/recording/RecordingStorage'

type ReplayBrowserProps = {
  storage: RecordingStorage
  onSelectRecording: (id: string) => void
  onDeleteRecording: (id: string) => void
}

const ReplayBrowser: React.FC<ReplayBrowserProps> = ({
  storage,
  onSelectRecording,
  onDeleteRecording
}) => {
  const recordings = storage.list()

  return (
    <div className="replay-browser">
      <h2>Saved Recordings</h2>
      {recordings.length === 0 ? (
        <p>No recordings saved</p>
      ) : (
        <ul>
          {recordings.map(rec => (
            <li key={rec.id}>
              <div className="recording-info">
                <div>Galaxy: {rec.galaxyId}</div>
                <div>Level: {rec.startLevel}</div>
                <div>Date: {new Date(rec.timestamp).toLocaleString()}</div>
              </div>
              <div className="recording-actions">
                <button onClick={() => onSelectRecording(rec.id)}>
                  Play
                </button>
                <button onClick={() => storage.exportToFile(rec.id)}>
                  Export
                </button>
                <button onClick={() => onDeleteRecording(rec.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ReplayBrowser
```

## Integration Points

### Game Loop Integration

Modify GameRenderer to use replay controls when in replay mode:

```typescript
// src/game/components/GameRenderer.tsx - MODIFIED

import type { RecordingService } from '@/game/recording/RecordingService'
import type { ReplayValidator } from '@/game/recording/ReplayValidator'

type GameRendererProps = {
  renderer: (frame: FrameInfo, controls: ControlMatrix) => MonochromeBitmap
  recordingService: RecordingService
  replayValidator: ReplayValidator // NEW PROP
  snapshotService: SnapshotService
  // ... other props
}

const GameRenderer: React.FC<GameRendererProps> = ({
  renderer,
  recordingService,
  replayValidator,
  snapshotService
  // ... other props
}) => {
  // ... existing setup code

  // Game loop
  const gameLoop = (currentTime: number): void => {
    const deltaTime = currentTime - lastFrameTimeRef.current

    if (deltaTime >= frameIntervalMs) {
      const frameInfo: FrameInfo = {
        /* ... */
      }
      const keyInfo: KeyInfo = {
        /* ... */
      }

      // Get raw controls from keyboard
      const rawControls = getControls(keyInfo, bindings)

      // Process controls for recording/replay
      let effectiveControls = rawControls

      if (recordingService.isRecording()) {
        // Recording mode: use keyboard controls
        recordingService.recordFrame(frameInfo.frameCount, rawControls)
        effectiveControls = rawControls
      } else if (recordingService.isReplaying()) {
        // Replay mode: use recorded controls
        const replayControls = recordingService.getReplayControls(frameInfo.frameCount)
        effectiveControls = replayControls ?? rawControls

        // Check if replay has ended
        if (replayControls === null) {
          console.log('Replay finished')
          recordingService.stopReplay()
          // Optionally: return to menu or allow normal play
        }
      }

      // Skip rendering when paused
      if (!paused) {
        // Render with processed controls
        const renderedBitmap = renderer(frameInfo, effectiveControls)

        // Capture state snapshot if recording
        if (recordingService.isRecording()) {
          const state = store.getState()
          snapshotService.captureSnapshot(frameInfo.frameCount, state)
        }

        // Validate state snapshot if replaying
        if (recordingService.isReplaying()) {
          const state = store.getState()
          const currentRecording = getCurrentRecording() // Need to track this
          if (currentRecording) {
            const isValid = replayValidator.validateStateSnapshot(
              frameInfo.frameCount,
              state,
              currentRecording
            )
            if (!isValid) {
              console.error('Replay validation failed - state diverged')
              // Optionally: stop replay or show warning
            }
          }
        }

        // ... display bitmap
      }

      // ... rest of loop
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }

  // ... rest of component
}
```

### Integration with loadLevel Thunk

Modify loadLevel to use replay seeds when in replay mode:

```typescript
// src/game/levelThunks.ts - MODIFIED

export const loadLevel =
  (levelNum: number): ThunkAction<void, RootState, GameServices, Action> =>
  (dispatch, getState, { galaxyService, randomService, recordingService }) => {
    // Generate or retrieve seed for this level
    let seed: number

    if (recordingService.isReplaying()) {
      // During replay: use recorded seed for this level
      const replaySeed = recordingService.getReplayLevelSeed(levelNum)
      if (replaySeed === null) {
        throw new Error(`No seed found for level ${levelNum} in replay`)
      }
      seed = replaySeed
    } else {
      // During normal play or recording: generate new seed
      seed = Date.now()
    }

    // Set the seed for this level
    randomService.setSeed(seed)

    // Record the seed if we're recording
    if (recordingService.isRecording()) {
      recordingService.recordLevelSeed(levelNum, seed)
    }

    // ... rest of existing loadLevel logic (unchanged)
    dispatch(statusSlice.actions.setLevel(levelNum))
    const planet = galaxyService.getPlanet(levelNum)
    // etc.
  }
```

### Game Lifecycle - Starting Replay

```typescript
// Example usage in app initialization

import { GAME_ENGINE_VERSION } from '@/game/version'

// Create services
const recordingService = createRecordingService()
const replayValidator = createReplayValidator()
const recordingStorage = createRecordingStorage()

// Start replay
const startReplay = (recordingId: string) => {
  const recording = recordingStorage.load(recordingId)
  if (!recording) {
    console.error('Recording not found')
    return
  }

  // Validate recording
  const validation = replayValidator.validateRecording(
    recording,
    getCurrentGalaxyId() // Get current galaxy ID from app state
  )

  if (!validation.valid) {
    console.error('Recording validation failed:')
    validation.errors.forEach(err => console.error(`- ${err}`))
    // Show error UI to user
    return
  }

  // Start replay mode
  recordingService.startReplay(recording)

  // Initialize game with recorded settings
  // Note: All recordings use modern collision mode
  dispatch(setMode('playing'))
  dispatch(setCollisionMode('modern'))

  // Restore initial state
  dispatch(statusSlice.actions.setLives(recording.initialState.lives))

  // Load starting level
  dispatch(loadLevel(recording.startLevel))

  // Note: loadLevel thunk will:
  // 1. Check if replaying: recordingService.isReplaying()
  // 2. If replaying, get seed: recordingService.getReplayLevelSeed(levelNum)
  // 3. Call randomService.setSeed(seed) with replay seed
}

// Stop replay (user action or replay finished)
const stopReplay = () => {
  if (recordingService.isReplaying()) {
    recordingService.stopReplay()
    dispatch(setMode('menu')) // Return to menu
  }
}
```

### File Import

Add functionality to import recordings from files:

```typescript
// src/game/recording/RecordingStorage.ts - EXTENDED

type RecordingStorage = {
  // ... existing methods ...
  importFromFile: (file: File) => Promise<string>
}

const createRecordingStorage = (): RecordingStorage => {
  // ... existing methods ...

  return {
    // ... existing methods ...

    importFromFile: async file => {
      const text = await file.text()
      const recording = JSON.parse(text) as GameRecording

      // Validate structure
      if (!recording.version || !recording.inputs || !recording.levelSeeds) {
        throw new Error('Invalid recording file format')
      }

      const id = generateId()
      localStorage.setItem(STORAGE_PREFIX + id, text)

      const index = getIndex()
      index.push({
        id,
        timestamp: recording.timestamp,
        galaxyId: recording.galaxyId,
        startLevel: recording.startLevel
      })
      saveIndex(index)

      return id
    }
  }
}
```

## Replay Features

### Basic Playback

1. **Automatic playback**: Replay runs at normal speed (20 FPS)
2. **State validation**: Compares state snapshots every 100 frames
3. **End detection**: Automatically stops when replay data ends

### User Controls

1. **Stop**: User can stop replay at any time
2. **Pause**: Standard pause functionality works during replay
3. **Keyboard disabled**: User inputs are ignored during replay

## Implementation Plan

### Phase 1: Core Replay Logic (2-3 hours)

1. Extend `RecordingService` with replay methods
2. Create `ReplayValidator.ts`
3. Update `GameRenderer.tsx` to handle replay controls
4. Update `loadLevel` thunk to use replay seeds
5. Test: basic replay playback works

### Phase 2: Validation (1-2 hours)

1. Implement state snapshot validation
2. Add error logging for divergence
3. Test: validation catches state mismatches
4. Test: incompatible recordings are rejected

### Phase 3: File Import (1 hour)

1. Add `importFromFile` to RecordingStorage
2. Test: can import exported recordings
3. Test: invalid files are rejected

### Phase 4: UI (3-4 hours)

1. Create `ReplayControls.tsx` component
2. Create `ReplayBrowser.tsx` component
3. Add file import UI
4. Integrate into game screens
5. Test: full user flow

**Total Estimated Time: 7-10 hours**

## Error Handling

### Validation Errors

Show clear error messages when:
- Engine version mismatch
- Galaxy ID mismatch
- Missing or corrupted data
- Invalid file format

### Runtime Errors

Handle gracefully:
- State divergence during playback
- Missing input frames
- Missing level seeds
- Unexpected end of replay

### User Feedback

Provide clear UI for:
- Why a recording can't be played
- Progress during replay
- When state validation fails
- When replay completes

## Future Enhancements

### Playback Speed Control

```typescript
// Add to RecordingService
setReplaySpeed: (speed: number) => void // 0.5x, 1x, 2x, 4x

// Implementation: adjust frame interval in game loop
const effectiveFrameInterval = frameIntervalMs / replaySpeed
```

### Seeking

```typescript
// Add to RecordingService
seekToFrame: (frameCount: number) => void

// Implementation:
// - Reset game state to nearest snapshot before target frame
// - Fast-forward through frames without rendering
// - Resume normal replay at target frame
```

### Ghost Mode

```typescript
// Overlay recorded run during live play
// - Show ghost ship following recorded path
// - Compare times/scores in real-time
```

## Testing Strategy

### Unit Tests

- RecordingService replay methods
- ReplayValidator validation logic
- Control override logic

### Integration Tests

1. Record a simple game
2. Replay and verify identical outcome
3. Test level transitions
4. Test death and respawn
5. Test pause during replay

### Edge Cases

- Empty recording
- Single frame recording
- Recording with no input changes
- Recording ending mid-level
- Version mismatch handling
- Galaxy mismatch handling

## Notes

- Replays always use modern collision mode
- User cannot provide input during replay
- State snapshots detect non-determinism
- Full state snapshots can be enabled for debugging
- Replays are portable via JSON export/import
