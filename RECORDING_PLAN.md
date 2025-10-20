# Recording System

## Overview

This document describes the design for implementing game recording functionality in Continuum. The system captures player inputs and level seeds to create reproducible game sessions. Playback and validation are covered in separate documents (REPLAY_PLAN.md and VALIDATION_PLAN.md).

## Architecture Principles

1. **Recording as injectable service** - Not managed in Redux state
2. **Transparent to game code** - Recording logic separate from game state
3. **Integrated into game loop** - Called once per frame (20 FPS)
4. **Global RNG management** - Seed managed via existing RandomService
5. **Clean separation** - Recording logic separate from game state
6. **Integrated snapshots** - State snapshot functionality built into RecordingService
7. **DEBUG-aware snapshots** - Hash snapshots always captured, full state only in DEBUG mode

## Prerequisites

✅ **Seeded RNG**: Already implemented via RandomService

- Service is injected into GameServices
- Provides `setSeed()` and `random()` methods
- Used throughout game logic for deterministic randomness

## Game Engine Versioning

The recording system requires strict versioning to ensure replays work correctly.

### Version File

Create a version constant to track breaking changes to game logic:

```typescript
// src/game/version.ts - NEW FILE

/**
 * Game engine version - only increment for breaking changes to:
 * - Physics/collision detection
 * - Game state structure
 * - Core game logic
 * - Random number generation behavior
 *
 * Does NOT need to increment for:
 * - UI changes
 * - Sound changes
 * - Visual/rendering changes
 * - Performance optimizations that don't affect logic
 *
 * HISTORY:
 * - Version 1: Initial implementation with seeded RNG
 */
export const GAME_ENGINE_VERSION = 1
```

This version is stored in every recording and validated during replay to ensure compatibility.

## Core Components

### 1. Recording Service

Injectable service that handles recording of player inputs and state snapshots.

```typescript
// src/game/recording/RecordingService.ts

import type { ControlMatrix } from '@/core/controls'
import type { RootState } from '@/game/store'
import type {
  GameRecording,
  RecordingMetadata,
  InputFrame,
  LevelSeed,
  StateSnapshot,
  FullStateSnapshot
} from './types'

const SNAPSHOT_INTERVAL = 100 // Capture every 100 frames (~5 seconds at 20 FPS)

type RecordingMode = 'idle' | 'recording'

type RecordingService = {
  // Control recording
  startRecording: (
    metadata: RecordingMetadata,
    enableFullSnapshots?: boolean
  ) => void
  stopRecording: () => GameRecording | null
  isRecording: () => boolean

  // Capture level seeds, inputs, and state snapshots
  recordLevelSeed: (level: number, seed: number) => void
  recordFrame: (
    frameCount: number,
    controls: ControlMatrix,
    state: RootState
  ) => void

  // Current mode
  getMode: () => RecordingMode
}

const controlsEqual = (a: ControlMatrix, b: ControlMatrix): boolean => {
  return (
    a.thrust === b.thrust &&
    a.left === b.left &&
    a.right === b.right &&
    a.fire === b.fire &&
    a.shield === b.shield &&
    a.selfDestruct === b.selfDestruct &&
    a.pause === b.pause &&
    a.quit === b.quit &&
    a.nextLevel === b.nextLevel &&
    a.extraLife === b.extraLife &&
    a.map === b.map
  )
}

const hashState = (state: RootState): string => {
  // Hash relevant game state slices (exclude UI state)
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

  // Simple hash function
  const stateString = JSON.stringify(relevantState)
  let hash = 0
  for (let i = 0; i < stateString.length; i++) {
    const char = stateString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

const createRecordingService = (): RecordingService => {
  let mode: RecordingMode = 'idle'
  let currentRecording: Partial<GameRecording> | null = null
  let lastControls: ControlMatrix | null = null
  let inputFrames: InputFrame[] = []
  let levelSeeds: LevelSeed[] = []
  let snapshots: StateSnapshot[] = []
  let fullSnapshots: FullStateSnapshot[] = []
  let fullSnapshotsEnabled = false

  return {
    startRecording: (metadata, enableFullSnapshots = false) => {
      if (mode !== 'idle') {
        throw new Error(
          `Cannot start recording: currently in ${mode} mode. Call stopRecording() first.`
        )
      }
      mode = 'recording'
      currentRecording = { ...metadata, levelSeeds: [], inputs: [] }
      inputFrames = []
      levelSeeds = []
      snapshots = []
      fullSnapshots = []
      fullSnapshotsEnabled = enableFullSnapshots
      lastControls = null
    },

    recordLevelSeed: (level, seed) => {
      if (mode !== 'recording') return
      levelSeeds.push({ level, seed })
    },

    recordFrame: (frameCount, controls, state) => {
      if (mode !== 'recording') return

      // Sparse storage: only record when controls change
      if (!lastControls || !controlsEqual(lastControls, controls)) {
        inputFrames.push({ frame: frameCount, controls: { ...controls } })
        lastControls = { ...controls }
      }

      // Capture state snapshot at intervals
      if (frameCount % SNAPSHOT_INTERVAL === 0) {
        // Always capture hash-based snapshot
        snapshots.push({
          frame: frameCount,
          hash: hashState(state)
        })

        // Optionally capture full state snapshot (DEBUG mode)
        if (fullSnapshotsEnabled) {
          fullSnapshots.push({
            frame: frameCount,
            state: {
              ship: state.ship,
              shots: state.shots,
              planet: state.planet,
              screen: state.screen,
              status: state.status,
              explosions: state.explosions,
              walls: state.walls,
              transition: state.transition
            }
          })
        }
      }
    },

    stopRecording: () => {
      if (mode !== 'recording') return null
      const recording = {
        ...currentRecording,
        levelSeeds,
        inputs: inputFrames,
        snapshots,
        fullSnapshots: fullSnapshots.length > 0 ? fullSnapshots : undefined
      } as GameRecording
      mode = 'idle'
      currentRecording = null
      inputFrames = []
      levelSeeds = []
      snapshots = []
      fullSnapshots = []
      fullSnapshotsEnabled = false
      lastControls = null
      return recording
    },

    isRecording: () => mode === 'recording',

    getMode: () => mode
  }
}

export { createRecordingService, type RecordingService, type RecordingMode }
```

### 2. Recording Types

```typescript
// src/game/recording/types.ts

import type { ControlMatrix } from '@/core/controls'

export type RecordingMetadata = {
  engineVersion: number
  galaxyId: string
  startLevel: number
  timestamp: number
  initialState: RecordingInitialState
}

export type RecordingInitialState = {
  lives: number
}

export type InputFrame = {
  frame: number
  controls: ControlMatrix
}

export type StateSnapshot = {
  frame: number
  hash: string // Hash of relevant game state slices
}

export type FullStateSnapshot = {
  frame: number
  state: {
    ship: ShipState
    shots: ShotsState
    planet: PlanetState
    screen: ScreenState
    status: StatusState
    explosions: ExplosionsState
    walls: WallsState
    transition: TransitionState
  }
}

export type LevelSeed = {
  level: number
  seed: number
}

export type GameRecording = {
  version: string // Recording format version
  engineVersion: number // Game engine version (physics/logic)
  levelSeeds: LevelSeed[] // Seeds for each level played
  galaxyId: string // Hash of galaxy file
  startLevel: number
  timestamp: number
  initialState: RecordingInitialState
  inputs: InputFrame[]
  snapshots: StateSnapshot[] // Hash-based snapshots for validation
  fullSnapshots?: FullStateSnapshot[] // Optional full state snapshots for debugging
}

// Note about levelSeeds:
// Each level gets its own random seed (set in loadLevel thunk via randomService.setSeed()).
// During recording, we capture the seed used for each level.
// During replay, we restore each level's seed when that level loads.
// This ensures:
// - Each level's randomness is deterministic
// - Level transitions are handled correctly
// - Replays work even if levels are played in different orders

// Note: Recordings only work with modern collision mode.
// Original collision mode ties state updates to rendering, making
// deterministic replay impossible. Recording is silently disabled
// when the user plays in original collision mode.
```

### 3. Storage Service

Handles persistence of recordings to localStorage and file export.

```typescript
// src/game/recording/RecordingStorage.ts

import type { GameRecording } from './types'

const STORAGE_PREFIX = 'continuum_recording_'
const STORAGE_INDEX_KEY = 'continuum_recording_index'
const CURRENT_VERSION = '1.0'

type RecordingIndex = {
  id: string
  timestamp: number
  galaxyId: string
  startLevel: number
}[]

type RecordingStorage = {
  save: (recording: GameRecording) => string
  load: (id: string) => GameRecording | null
  list: () => RecordingIndex
  delete: (id: string) => void
  exportToFile: (id: string) => void
}

const createRecordingStorage = (): RecordingStorage => {
  const generateId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const getIndex = (): RecordingIndex => {
    const indexJson = localStorage.getItem(STORAGE_INDEX_KEY)
    return indexJson ? JSON.parse(indexJson) : []
  }

  const saveIndex = (index: RecordingIndex): void => {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index))
  }

  return {
    save: recording => {
      const id = generateId()
      const recordingWithVersion = {
        ...recording,
        version: CURRENT_VERSION
      }

      // Save recording data
      localStorage.setItem(
        STORAGE_PREFIX + id,
        JSON.stringify(recordingWithVersion)
      )

      // Update index
      const index = getIndex()
      index.push({
        id,
        timestamp: recording.timestamp,
        galaxyId: recording.galaxyId,
        startLevel: recording.startLevel
      })
      saveIndex(index)

      return id
    },

    load: id => {
      const json = localStorage.getItem(STORAGE_PREFIX + id)
      if (!json) return null

      try {
        return JSON.parse(json) as GameRecording
      } catch (e) {
        console.error('Failed to parse recording:', e)
        return null
      }
    },

    list: () => {
      return getIndex()
    },

    delete: id => {
      localStorage.removeItem(STORAGE_PREFIX + id)

      const index = getIndex()
      const filtered = index.filter(item => item.id !== id)
      saveIndex(filtered)
    },

    exportToFile: id => {
      const recording = localStorage.getItem(STORAGE_PREFIX + id)
      if (!recording) return

      const blob = new Blob([recording], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `continuum_recording_${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}

export { createRecordingStorage, type RecordingStorage }
```

Note: State snapshot functionality is integrated directly into RecordingService (see above). Snapshots are captured automatically during recording at regular intervals.

## Integration Points

### Files to Modify

The following files need to be modified to integrate the recording system:

1. **`src/game/store.ts`** - Add `RecordingService` to `GameServices` type
2. **`src/game/main.tsx`** - Create `recordingService` and pass to components
3. **`src/game/App.tsx`** - Receive and pass `recordingService` prop, handle start/stop
4. **`src/game/components/GameRenderer.tsx`** - Add prop, call `recordFrame()` in game loop
5. **`src/game/levelThunks.ts`** - Call `recordLevelSeed()` when loading levels

### 1. Add RecordingService to GameServices

**File: `src/game/store.ts`**

Add RecordingService to the GameServices type (around line 48-55):

```typescript
import type { RecordingService } from './recording/RecordingService'

export type GameServices = {
  galaxyService: GalaxyService
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
  soundService: GameSoundService
  collisionService: CollisionService
  randomService: RandomService // Already exists
  recordingService: RecordingService // NEW - for recording
}
```

No changes needed to `createGameStore` function - it already accepts services parameter.

### 2. Integrate into GameRenderer

**File: `src/game/components/GameRenderer.tsx`**

Add `recordingService` prop to component (around line 23-34):

```typescript
import type { RecordingService } from '@/game/recording/RecordingService'

type GameRendererProps = {
  renderer: (frame: FrameInfo, controls: ControlMatrix) => MonochromeBitmap
  rendererNew: (frame: FrameInfo, controls: ControlMatrix) => Frame
  collisionService: CollisionService
  spriteService: SpriteService
  spriteRegistry: SpriteRegistry<ImageData>
  renderMode: 'original' | 'modern'
  width: number
  height: number
  scale: number
  fps: number
  recordingService: RecordingService // NEW PROP
}
```

Access the store (already available via `useStore()` on line 67):

```typescript
const store = useStore() // Already exists at line 67
```

In the game loop, add recording call after rendering (around line 176-301):

```typescript
// Game loop (around line 115)
const gameLoop = (currentTime: number): void => {
  const deltaTime = currentTime - lastFrameTimeRef.current

  if (deltaTime >= frameIntervalMs) {
    // ... existing frameInfo and keyInfo setup ...
    // ... existing controls calculation ...

    // Skip rendering when paused but keep the loop running
    if (!paused) {
      if (renderMode === 'original') {
        // Original bitmap renderer
        const renderedBitmap = renderer(frameInfo, controls)

        // ... existing rendering code ...

        // Record frame AFTER state updates (add after line 294)
        if (recordingService.isRecording()) {
          const state = store.getState() as RootState

          // Stop recording if user switched to original collision mode
          if (state.app.collisionMode !== 'modern') {
            console.warn(
              'Collision mode changed to original - stopping recording'
            )
            recordingService.stopRecording()
          } else {
            recordingService.recordFrame(frameCountRef.current, controls, state)
          }
        }
      } else {
        // Modern frame-based renderer
        const renderedFrame = rendererNew(frameInfo, controls)

        // ... existing rendering code ...

        // Record frame AFTER state updates (add after line 300)
        if (recordingService.isRecording()) {
          const state = store.getState() as RootState

          // Stop recording if user switched to original collision mode
          if (state.app.collisionMode !== 'modern') {
            console.warn(
              'Collision mode changed to original - stopping recording'
            )
            recordingService.stopRecording()
          } else {
            recordingService.recordFrame(frameCountRef.current, controls, state)
          }
        }
      }

      lastFrameTimeRef.current = currentTime
      frameCountRef.current++
    }
    // ... rest of loop
  }
}
```

Add `recordingService` to dependency array (around line 324-342):

```typescript
  }, [
    renderer,
    rendererNew,
    renderMode,
    width,
    height,
    scale,
    fps,
    frameIntervalMs,
    bindings,
    paused,
    showMapState,
    dispatch,
    collisionService,
    spriteService,
    spriteRegistry,
    store,
    touchControls,
    recordingService // NEW
  ])
```

### 3. Update loadLevel Thunk

**File: `src/game/levelThunks.ts`**

Modify the `loadLevel` thunk to record level seeds (around line 22-28):

```typescript
export const loadLevel =
  (levelNum: number): ThunkAction<void, RootState, GameServices, Action> =>
  (dispatch, _getState, { galaxyService, randomService, recordingService }) => {
    // Set random seed at the start of each level
    // For new games, use timestamp for non-deterministic gameplay
    const seed = Date.now()
    randomService.setSeed(seed)

    // Record the seed if we're recording
    if (recordingService.isRecording()) {
      recordingService.recordLevelSeed(levelNum, seed)
    }

    // ... rest of existing loadLevel logic (unchanged)
    dispatch(statusSlice.actions.setLevel(levelNum))
    // ... etc
  }
```

This ensures that during recording, we capture the seed used for each level.

### 4. Create RecordingService and Pass to Components

**File: `src/game/main.tsx`**

Create the recording service and storage alongside other services (around line 89-90):

```typescript
const randomService = createRandomService()
console.log('Random service created')

// NEW: Create recording service
const recordingService = createRecordingService()
console.log('Recording service created')
```

Add to store creation (around line 93-107):

```typescript
const store = createGameStore(
  {
    galaxyService,
    spriteService,
    fizzTransitionService,
    soundService,
    collisionService,
    randomService,
    recordingService // NEW
  },
  {
    soundVolume: DEFAULT_SOUND_VOLUME,
    soundEnabled: !DEFAULT_SOUND_MUTED,
    initialLives: TOTAL_INITIAL_LIVES
  }
)
```

**File: `src/game/App.tsx`**

Add `recordingService` prop to App component (around line 33-40):

```typescript
type AppProps = {
  renderer: GameRenderLoop
  rendererNew: NewGameRenderLoop
  soundService: GameSoundService
  spriteService: SpriteService
  collisionService: CollisionService
  spriteRegistry: SpriteRegistry<ImageData>
  recordingService: RecordingService // NEW
}

export const App: React.FC<AppProps> = ({
  renderer,
  rendererNew,
  collisionService,
  soundService,
  spriteService,
  spriteRegistry,
  recordingService // NEW
}) => {
```

Pass to GameRenderer when rendering (around line 206-220):

```typescript
      case 'playing':
        return (
          <GameRenderer
            renderer={renderer}
            rendererNew={rendererNew}
            collisionService={collisionService}
            spriteService={spriteService}
            spriteRegistry={spriteRegistry}
            renderMode={renderMode}
            width={BASE_GAME_WIDTH}
            height={BASE_TOTAL_HEIGHT}
            scale={scale}
            fps={FPS}
            recordingService={recordingService} // NEW
          />
        )
```

Back in **`src/game/main.tsx`**, pass recordingService to App (around line 155-166):

```typescript
  root.render(
    <Provider store={store}>
      <App
        renderer={renderer}
        rendererNew={rendererNew}
        collisionService={collisionService}
        soundService={soundService}
        spriteService={spriteService}
        spriteRegistry={spriteRegistry}
        recordingService={recordingService} // NEW
      />
    </Provider>
  )
```

### 5. Start/Stop Recording on Game Lifecycle

**File: `src/game/App.tsx`** (or wherever game start/end is handled)

When starting a new game (around line 198-202 where `loadLevel` and `startGame` are called):

```typescript
// In StartScreen's onStartGame handler
onStartGame={(level: number) => {
  // Check if we should record (only in modern collision mode)
  const state = store.getState()
  const collisionMode = state.app.collisionMode

  if (collisionMode === 'modern') {
    // Enable full snapshots in DEBUG mode
    const enableFullSnapshots = state.ui?.showDebugInfo ?? false

    recordingService.startRecording(
      {
        engineVersion: GAME_ENGINE_VERSION, // Import from @/game/version
        galaxyId: currentGalaxyId,
        startLevel: level,
        timestamp: Date.now(),
        initialState: {
          lives: state.status.lives
        }
      },
      enableFullSnapshots
    )
  }

  // Load the selected level
  dispatch(loadLevel(level))

  // Start the game
  dispatch(startGame())
}}
```

On game over, stop recording and optionally save:

```typescript
// When switching to game over mode
const handleGameOver = () => {
  if (recordingService.isRecording()) {
    const recording = recordingService.stopRecording()

    if (recording) {
      // Option 1: Auto-save all recordings
      const recordingStorage = createRecordingStorage()
      recordingStorage.save(recording)

      // Option 2: Show UI to let user decide whether to save
      // (implement later in Phase 4)
    }
  }

  dispatch(setMode('gameOver'))
}
```

## Data Format

### Recording Structure

```json
{
  "version": "1.0",
  "engineVersion": 1,
  "levelSeeds": [
    {
      "level": 1,
      "seed": 1234567890
    },
    {
      "level": 2,
      "seed": 1234568950
    },
    {
      "level": 3,
      "seed": 1234570023
    }
  ],
  "galaxyId": "a3f5e8d9c2b1f4a6",
  "startLevel": 1,
  "timestamp": 1704067200000,
  "initialState": {
    "lives": 3
  },
  "snapshots": [
    {
      "frame": 100,
      "hash": "a3f5e8d9c2b1f4a6..."
    },
    {
      "frame": 200,
      "hash": "b4e6f9c0d3a2e5b7..."
    }
  ],
  "inputs": [
    {
      "frame": 0,
      "controls": {
        "thrust": false,
        "left": false,
        "right": false,
        "fire": false,
        "shield": false,
        "selfDestruct": false,
        "pause": false,
        "quit": false,
        "nextLevel": false,
        "extraLife": false,
        "map": false
      }
    },
    {
      "frame": 45,
      "controls": {
        "thrust": true,
        "left": false,
        "right": false,
        "fire": false,
        "shield": false,
        "selfDestruct": false,
        "pause": false,
        "quit": false,
        "nextLevel": false,
        "extraLife": false,
        "map": false
      }
    }
  ]
}
```

### Storage Efficiency

At 20 FPS with sparse encoding:

- Average input change every ~30 frames (1.5 seconds)
- ~0.67 input records per second
- ~40 records per minute
- Each record: ~30 bytes JSON
- **Storage rate: ~1.2 KB/minute**
- 10-minute game: ~12 KB
- 100 recordings: ~1.2 MB

Hash snapshots add ~4 KB for 10-minute game. Very manageable for localStorage (5-10 MB typical limit).

## Galaxy Versioning

### Galaxy ID from Content Hash

Galaxy IDs are generated from the hash of the galaxy file content. This ensures:

- Recordings are tied to specific galaxy data
- If galaxy file changes, old recordings are automatically invalidated
- No manual version tracking needed for level data

```typescript
// Example galaxy ID generation (pseudocode)
import crypto from 'crypto'

const generateGalaxyId = (galaxyFileContent: string): string => {
  return crypto
    .createHash('sha256')
    .update(galaxyFileContent)
    .digest('hex')
    .substring(0, 16) // Use first 16 chars
}
```

## Implementation Plan

### Phase 1: Core Recording (2-3 hours)

1. Create `src/game/version.ts`
2. Create `src/game/recording/types.ts`
3. Create `src/game/recording/RecordingService.ts` (includes snapshot functionality)
4. Add to `GameServices` injection
5. Test: recording captures inputs and snapshots correctly
6. Commit

### Phase 2: Storage & Export (2 hours)

1. Create `src/game/recording/RecordingStorage.ts`
2. Implement localStorage persistence
3. Add file export functionality
4. Test: save/load/list/export operations
5. Commit

### Phase 3: Integration (2-3 hours)

1. Integrate into GameRenderer.tsx
   - Pass store to GameRenderer for state access
   - Update recordFrame call to include state
2. Hook recording start/stop into game lifecycle
   - Use `showDebugInfo` flag to enable full snapshots
3. Update loadLevel thunk to record seeds
4. Test: end-to-end recording flow
5. Test edge cases:
   - Level transitions
   - Death and respawn
   - Pause during recording
   - Game over conditions
6. Verify snapshot behavior:
   - Hash snapshots always captured
   - Full snapshots only in DEBUG mode
7. Commit

### Phase 4: UI (3-4 hours)

1. Game over screen with export options
2. [for now exporting current is only option -- saving multiple to local storage will be done later]

**Total Estimated Time: 9-12 hours**

## Determinism Requirements

For recordings to replay accurately, the following must be deterministic:

### 1. Random Number Generation

✅ **Already implemented via RandomService**

- Seeded RNG with `setSeed()` method
- All game logic uses `randomService.random()`

### 2. Frame Timing

- **Current**: Uses `frame.frameCount` (incremented each frame)
- **Status**: ✓ Already deterministic
- Game runs at fixed 20 FPS

### 3. Floating Point Math

- **Status**: ✓ Should be stable across architectures
- JavaScript uses IEEE 754 double precision (standardized)
- Modern browsers ensure consistent FP behavior across platforms
- Game uses mostly integer math, reducing FP risk

### 4. State Updates

- **Current**: Redux with predictable reducers
- **Status**: ✓ Already deterministic
- No external timers or async operations in game logic

### 5. Input Handling

- **Current**: Keyboard state captured per frame
- **Status**: ✓ Deterministic
- Inputs are recorded exactly as received

## Notes

- Recording is automatic in modern collision mode
- Only works with modern collision mode (original mode ties state to rendering)
- **Recording stops automatically if user switches to original collision mode during gameplay**
- User chooses whether to save after game over
- Recordings can be exported as JSON files
- Perfect for debugging, speedrunning, or showcasing epic runs
- Strict versioning ensures recordings only work on compatible game versions

### State Snapshots

- **Hash snapshots**: Always captured every 100 frames (~5 seconds)

  - Compact: ~4 KB for 10-minute game
  - Used for validation during replay
  - Detect when state diverges from expected

- **Full snapshots**: Only when DEBUG mode enabled (`showDebugInfo` flag)
  - Large: ~2.4 MB for 10-minute game
  - Complete state at each snapshot frame
  - Used for debugging divergence issues
  - Not needed for normal gameplay
