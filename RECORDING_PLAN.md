# Recording and Replay System

## Overview

This document describes the design for implementing game recording and deterministic replay functionality in Continuum. The system allows capturing player inputs and using seeded random number generation to create reproducible game sessions.

## Architecture Principles

1. **Recording/replay as injectable service** - Not managed in Redux state
2. **Transparent to game code** - No signature changes to `rint()` or game logic
3. **Integrated into game loop** - Called once per frame (20 FPS)
4. **Global RNG management** - Seed managed via service, transparent to callers
5. **Clean separation** - Recording logic separate from game state

## Core Components

### 1. Seeded RNG Service

Provides deterministic random number generation with optional seeding.

```typescript
// src/core/shared/RandomService.ts
type RandomService = {
  setSeed: (seed: number) => void
  getSeed: () => number
  rint: (n: number) => number
}

const createRandomService = (): RandomService => {
  let seed = 0
  let state = 0

  // Mulberry32 PRNG - simple, fast, deterministic
  const mulberry32 = () => {
    let t = (state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    setSeed: (s: number) => {
      seed = s
      state = s
    },
    getSeed: () => seed,
    rint: (n: number) => Math.floor(mulberry32() * n)
  }
}

let randomService: RandomService | undefined

export const initializeRandomService = (): void => {
  randomService = createRandomService()
}

export const getRandomService = (): RandomService => {
  if (!randomService) {
    throw new Error('RandomService not initialized. Call initializeRandomService() first.')
  }
  return randomService
}

export type { RandomService }
```

### 2. Transparent rint() Integration

Modify existing `rint()` to use the singleton RandomService.

```typescript
// src/core/shared/rint.ts - MODIFIED
import { getRandomService } from './RandomService'

export function rint(n: number): number {
  return getRandomService().rint(n)
}
```

### Initialization

The RandomService must be initialized at application startup before any game code runs:

```typescript
// src/main.tsx (or wherever the app initializes)
import { initializeRandomService } from '@/core/shared/RandomService'

// Initialize services before app renders
initializeRandomService()

// ... rest of app setup
```

When starting a new game, set the random seed:

```typescript
import { getRandomService } from '@/core/shared/RandomService'

const startNewGame = () => {
  const randomService = getRandomService()
  randomService.setSeed(Date.now())  // Or use seed from recording
  // ... start game
}
```

### 3. Recording Service

Injectable service that handles recording and replay of player inputs.

```typescript
// src/game/recording/RecordingService.ts

import type { ControlMatrix } from '@/core/controls'
import type { GameRecording, RecordingMetadata, InputFrame } from './types'

type RecordingMode = 'idle' | 'recording' | 'replaying'

type RecordingService = {
  // Control recording
  startRecording: (seed: number, metadata: RecordingMetadata) => void
  stopRecording: () => GameRecording | null
  isRecording: () => boolean

  // Capture inputs each frame
  recordFrame: (frameCount: number, controls: ControlMatrix) => void

  // Replay mode
  startReplay: (recording: GameRecording) => void
  stopReplay: () => void
  isReplaying: () => boolean

  // Get controls for current frame during replay
  getReplayControls: (frameCount: number) => ControlMatrix | null

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

const createRecordingService = (): RecordingService => {
  let mode: RecordingMode = 'idle'
  let currentRecording: Partial<GameRecording> | null = null
  let lastControls: ControlMatrix | null = null
  let inputFrames: InputFrame[] = []
  let replayData: GameRecording | null = null
  let replayIndex = 0

  return {
    startRecording: (seed, metadata) => {
      if (mode !== 'idle') {
        throw new Error(
          `Cannot start recording: currently in ${mode} mode. Call stop${mode === 'recording' ? 'Recording' : 'Replay'}() first.`
        )
      }
      mode = 'recording'
      currentRecording = { seed, ...metadata, inputs: [] }
      inputFrames = []
      lastControls = null
    },

    recordFrame: (frameCount, controls) => {
      if (mode !== 'recording') return

      // Sparse storage: only record when controls change
      if (!lastControls || !controlsEqual(lastControls, controls)) {
        inputFrames.push({ frame: frameCount, controls: { ...controls } })
        lastControls = { ...controls }
      }
    },

    stopRecording: () => {
      if (mode !== 'recording') return null
      const recording = {
        ...currentRecording,
        inputs: inputFrames
      } as GameRecording
      mode = 'idle'
      currentRecording = null
      inputFrames = []
      lastControls = null
      return recording
    },

    isRecording: () => mode === 'recording',

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

### 4. Recording Types

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
  hash: string  // Hash of relevant game state slices
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

export type GameRecording = {
  version: string          // Recording format version
  engineVersion: number    // Game engine version (physics/logic)
  seed: number
  galaxyId: string        // Hash of galaxy file
  startLevel: number
  timestamp: number
  initialState: RecordingInitialState
  inputs: InputFrame[]
  snapshots: StateSnapshot[]  // Hash-based snapshots (always included)
  fullSnapshots?: FullStateSnapshot[]  // Optional full state snapshots for debugging
}

// Note: Recordings only work with modern collision mode.
// Original collision mode ties state updates to rendering, making
// deterministic replay impossible. Recording is silently disabled
// when the user plays in original collision mode.
```

### 5. Storage Service

Handles persistence of recordings to localStorage.

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
  importFromFile: (file: File) => Promise<string>
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
    },

    importFromFile: async file => {
      const text = await file.text()
      const recording = JSON.parse(text) as GameRecording

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

export { createRecordingStorage, type RecordingStorage }
```

## Integration Points

### Game Loop Integration

Control processing happens in GameRenderer.tsx before passing controls to the game renderer.
This keeps the renderer pure and allows different components to use the same rendering engine.

```typescript
// src/game/gameLoop/index.ts - NO CHANGES NEEDED
// createGameRenderer stays pure - just takes controls and renders

export const createGameRenderer = (
  store: GameStore,
  spriteService: SpriteService,
  galaxyService: GalaxyService,
  fizzTransitionService: FizzTransitionService
): GameRenderLoop => {
  return (frame, controls) => {
    let bitmap = createGameBitmap()

    updateGameState({
      store,
      frame,
      controls,
      bitmap,
      galaxyService,
      fizzTransitionService
    })

    const state = store.getState()

    if (state.app.collisionMode === 'original') {
      bitmap = renderGameOriginal({
        bitmap,
        state,
        spriteService,
        store,
        fizzTransitionService
      })
    } else {
      bitmap = renderGame({
        bitmap,
        state,
        spriteService,
        fizzTransitionService
      })
    }

    return bitmap
  }
}
```

```typescript
// src/game/components/GameRenderer.tsx - MODIFIED
// Add recordingService prop and control processing logic

import { createRecordingService } from '@/game/recording/RecordingService'
import type { RecordingService } from '@/game/recording/RecordingService'

type GameRendererProps = {
  renderer: (frame: FrameInfo, controls: ControlMatrix) => MonochromeBitmap
  recordingService: RecordingService  // NEW PROP
  // ... other props
}

const GameRenderer: React.FC<GameRendererProps> = ({
  renderer,
  recordingService,
  // ... other props
}) => {
  // ... existing setup code

  // Game loop
  const gameLoop = (currentTime: number): void => {
    const deltaTime = currentTime - lastFrameTimeRef.current

    if (deltaTime >= frameIntervalMs) {
      const frameInfo: FrameInfo = { /* ... */ }
      const keyInfo: KeyInfo = { /* ... */ }

      // Get raw controls from keyboard
      const rawControls = getControls(keyInfo, bindings)

      // Process controls for recording/replay
      let effectiveControls = rawControls
      if (recordingService.isRecording()) {
        recordingService.recordFrame(frameInfo.frameCount, rawControls)
        effectiveControls = rawControls  // Pass through
      } else if (recordingService.isReplaying()) {
        effectiveControls = recordingService.getReplayControls(frameInfo.frameCount) ?? rawControls
      }

      // Skip rendering when paused
      if (!paused) {
        // Render with processed controls
        const renderedBitmap = renderer(frameInfo, effectiveControls)
        // ... display bitmap
      }

      // ... rest of loop
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }

  // ... rest of component
}
```

### Service Injection

```typescript
// src/game/store.ts - MODIFIED

import type { RecordingService } from './recording/RecordingService'

export type GameServices = {
  galaxyService: GalaxyService
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
  soundService: SoundService
  collisionService: CollisionService
  // Note: RecordingService is NOT injected via GameServices
  // It's created and passed directly to GameRenderer component
}

export const createGameStore = (
  services: GameServices,
  initialSettings: GameInitialSettings
) => {
  // Note: RandomService is initialized as singleton in main.tsx
  // Game code accesses it via:
  //   - rint(n) for random numbers (transparent)
  //   - getRandomService() for setSeed/getSeed (game start/recording logic)

  const { store, soundListenerMiddleware } = createStoreAndListeners(
    rootReducer,
    services,
    initialSettings
  )

  setupSoundListener(
    soundListenerMiddleware.startListening.withTypes<RootState, AppDispatch>(),
    services.soundService
  )

  return store
}
```

### Game Lifecycle Hooks

```typescript
// Example usage in app initialization

import { getRandomService } from '@/core/shared/RandomService'

// Create services
const recordingService = createRecordingService()
const recordingStorage = createRecordingStorage()

// Start a new game with recording
const startNewGame = () => {
  const seed = Date.now()

  // Set RNG seed for determinism
  const randomService = getRandomService()
  randomService.setSeed(seed)

  // Transparently record all games (if in modern collision mode)
  // User decides whether to save at end of game
  if (state.app.collisionMode === 'modern') {
    recordingService.startRecording(seed, {
      galaxyId: state.app.currentGalaxyId,
      startLevel: 1,
      timestamp: Date.now(),
      initialState: {
        lives: 3
      }
    })
  }

  // Start game...
  dispatch(setMode('playing'))
  dispatch(loadLevel(1))
}

// On game over
const handleGameOver = () => {
  let recording: GameRecording | null = null

  if (recordingService.isRecording()) {
    recording = recordingService.stopRecording()
  }

  // Show game over screen with optional save/replay UI
  // Only show recording options if we have a recording (i.e., was in modern mode)
  dispatch(setMode('gameOver'))
  if (recording) {
    // Show UI: "Save this game?" "Watch replay?" etc.
    // User can choose to save: recordingStorage.save(recording)
  }

  // Note: Next game will call setSeed() with a new seed
}

// Start replay
const startReplay = (recordingId: string) => {
  const recording = recordingStorage.load(recordingId)
  if (!recording) {
    console.error('Recording not found')
    return
  }

  // Set up deterministic playback
  const randomService = getRandomService()
  randomService.setSeed(recording.seed)
  recordingService.startReplay(recording)

  // Initialize game with recorded settings
  // Note: All recordings use modern collision mode
  dispatch(setMode('playing'))
  dispatch(setCollisionMode('modern'))
  dispatch(loadLevel(recording.startLevel))
}
```

## Data Format

### Recording Structure

```json
{
  "version": "1.0",
  "engineVersion": 1,
  "seed": 1234567890,
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

Very manageable for localStorage (5-10 MB typical limit).

## Determinism Requirements

For recordings to replay accurately, the following must be deterministic:

### 1. Random Number Generation

- **Current**: Uses `Math.random()` via `rint()` helper
- **Solution**: Replace with seeded PRNG (mulberry32)
- **Files to update** (~23 files use `rint()`):
  - `src/game/gameLoop/stateUpdates.ts` - Bunker shooting
  - `src/core/shots/bunkShoot.ts` - Shot trajectories
  - `src/core/explosions/explosionsSlice.ts` - Explosion debris
    // NOTE: there's no harm in having these use the new rint() but they
    // are in fact irrelevant to game play
  - All sound generators using random values
  - Transition effects (fizz, etc.)

### 2. Frame Timing

- **Current**: Uses `frame.frameCount` (incremented each frame)
- **Status**: ✓ Already deterministic
- Game runs at fixed 20 FPS

### 3. Floating Point Math

- **Status**: ✓ Should be stable across architectures
- JavaScript uses IEEE 754 double precision (standardized)
- Modern browsers ensure consistent FP behavior across platforms
- Game uses mostly integer math, reducing FP risk
- **Known limitation**: Cross-platform replay (ARM ↔ x86) should work but isn't guaranteed
  - If divergence occurs in practice, treat as bug and investigate
  - Can add state checksums for validation if needed

### 4. State Updates

- **Current**: Redux with predictable reducers
- **Status**: ✓ Already deterministic
- No external timers or async operations in game logic

### 5. Input Handling

- **Current**: Keyboard state captured per frame
- **Solution**: Replay system overrides with recorded inputs
- Pausing/map handled via recorded inputs

## Implementation Plan

### Phase 0: Preliminary Refactoring (1 hour)

1. Move `killShipNextFrame` from `gameSlice` to `shipSlice`
2. Rename to `killNextFrame` for clarity
3. Update all references in game code

### Phase 1: Seeded RNG (2-3 hours)

1. Create `src/core/shared/RandomService.ts`
2. Modify `src/core/shared/rint.ts` for global service
3. Create `src/game/version.ts` with `GAME_ENGINE_VERSION`
4. Wire up RandomService initialization in main.tsx
5. Test: same seed → same random sequence

### Phase 2: Recording Service (2-3 hours)

1. Create `src/game/recording/types.ts`
2. Create `src/game/recording/RecordingService.ts`
3. Add to `GameServices` injection
4. Integrate into `createGameRenderer()` in `gameLoop/index.ts`
5. Test: recording captures inputs correctly

### Phase 3: Storage (2 hours)

1. Create `src/game/recording/RecordingStorage.ts`
2. Implement localStorage persistence
3. Add export/import functionality
4. Test: save/load/list operations

### Phase 4: Integration & Testing (3-4 hours)

1. Hook recording start/stop into game lifecycle
2. Seed RNG on game start
3. Auto-save recordings on game over
4. Verify replays are deterministic
5. Test edge cases:
   - Level transitions
   - Death and respawn
   - Pause during recording/replay
   - Game over conditions

### Phase 5: UI (4-6 hours)

1. Add recording controls to start screen
2. Recording indicator during gameplay
3. Create replay browser component
4. Playback controls (pause, speed, progress)
5. Export/import UI

**Total Estimated Time: 13-18 hours**

## Testing Strategy

### Determinism Validation

Recordings include state snapshots for validation:

**Hash-based snapshots (always enabled):**
- Captured every 100 frames (~5 seconds at 20 FPS)
- Hash of relevant game state slices:
  - Included: ship, shots, planet, screen, status, explosions, walls, transition
  - Excluded: game, app, controls, highscore (UI state, not game logic)
- Compact: ~4 KB for 10-minute game
- During replay: compare hashes at each snapshot frame
- On mismatch: log error with frame number where divergence occurred

**Full state snapshots (optional, for debugging):**
- Enable in settings or for bug reporting
- Same frequency (every 100 frames)
- Stores complete state objects instead of hash
- Large: ~2.4 MB for 10-minute game
- Allows debugging exact state divergence
- User can enable when experiencing replay issues

**Validation process:**
1. Record game with snapshots
2. Replay and compare snapshots at each checkpoint
3. If hash mismatch detected:
   - Log frame number of divergence
   - If full snapshots enabled: show diff of state
   - Report as determinism bug

### Edge Cases

**Pause handling during recording:**
- When user pauses, stop recording (don't capture pause frames)
- Resume recording when unpaused
- This keeps pauses out of replays

**Quit handling:**
- Treat quit like game over
- Stop recording and offer to save
- Saved recording is complete up to quit point

**JSON validation:**
- Validate recording structure on load
- Check for required fields, correct types
- Handle corrupted data gracefully with clear error messages

**Version mismatch:**
- Already handled via engineVersion validation (see Game Versioning section)

Note: Level transitions, death/respawn, etc. are deterministic and require no special handling.

### Performance

- Measure recording overhead (should be negligible)
- Test with 100+ saved recordings
- Verify localStorage limits aren't exceeded

## Future Enhancements

### Phase 6+ (Optional)

1. **Fast-forward/Rewind**: Jump to arbitrary frame, rebuild state (could use snapshots as checkpoints)
2. **Slow-motion replay**: Render at half speed
3. **Ghost mode**: Overlay recorded run during live play
4. **Replay editing**: Cut/splice recordings
5. **Leaderboards**: Submit recordings as proof of score
6. **Compression**: Further reduce storage with binary format
7. **State snapshot seeking**: Use snapshots as checkpoints for faster seeking to arbitrary frames

## Game Versioning

### Game Engine Version

A separate version number tracks breaking changes to game logic, independent of the app version.

```typescript
// src/game/version.ts
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
 */
export const GAME_ENGINE_VERSION = 1
```

### Galaxy ID from Content Hash

Galaxy IDs are generated from the hash of the galaxy file content. This ensures:
- Recordings are tied to specific galaxy data
- If galaxy file changes, old recordings are automatically invalidated
- No manual version tracking needed for level data

```typescript
// Example galaxy ID generation (pseudocode)
import crypto from 'crypto'

const generateGalaxyId = (galaxyFileContent: string): string => {
  return crypto.createHash('sha256')
    .update(galaxyFileContent)
    .digest('hex')
    .substring(0, 16)  // Use first 16 chars
}
```

### Replay Validation

When loading a replay:

```typescript
import { GAME_ENGINE_VERSION } from '@/game/version'

const startReplay = (recordingId: string) => {
  const recording = recordingStorage.load(recordingId)
  if (!recording) {
    throw new Error('Recording not found')
  }

  // Strict engine version check
  if (recording.engineVersion !== GAME_ENGINE_VERSION) {
    throw new Error(
      `Recording requires game engine v${recording.engineVersion}, but you're running v${GAME_ENGINE_VERSION}. ` +
      `This recording is incompatible with your current game version.`
    )
  }

  // Galaxy ID is automatically validated by galaxyService.load()
  // If the galaxy file changed (different hash), galaxyId won't match
  const galaxy = galaxyService.load(recording.galaxyId)
  if (!galaxy) {
    throw new Error(
      `Galaxy "${recording.galaxyId}" not found. ` +
      `This recording may be from a different or modified galaxy file.`
    )
  }

  // Proceed with replay...
}
```

### Creating Recordings

Include engine version and galaxy hash in all recordings:

```typescript
import { GAME_ENGINE_VERSION } from '@/game/version'

const startNewGame = () => {
  const seed = Date.now()
  const randomService = getRandomService()
  randomService.setSeed(seed)

  if (state.app.collisionMode === 'modern') {
    const currentGalaxy = galaxyService.getCurrent()
    recordingService.startRecording(seed, {
      engineVersion: GAME_ENGINE_VERSION,  // From constant
      galaxyId: currentGalaxy.id,          // Hash from galaxy file
      startLevel: 1,
      timestamp: Date.now(),
      initialState: { lives: 3 }
    })
  }

  dispatch(setMode('playing'))
  dispatch(loadLevel(1))
}
```

## Notes

- All game logic remains unchanged (zero refactoring needed)
- `rint()` signature stays the same
- Recording is opt-in (doesn't affect normal gameplay)
- Replays can be shared as JSON files
- Perfect for debugging, speedrunning, or showcasing epic runs
- Strict versioning ensures recordings only work on compatible game versions
