# Seeded Random Number Generator Implementation

## Overview

This document describes the implementation of deterministic random number generation for Continuum. This adds a seeded PRNG (Pseudo-Random Number Generator) for gameplay-critical randomness while keeping the existing `rint()` for non-deterministic visual/audio effects.

**Prerequisite for**: [RECORDING_PLAN.md](./RECORDING_PLAN.md) - The recording system depends on deterministic RNG to ensure replays are accurate.

## Why Seeded RNG?

For gameplay-critical elements (bunker shooting, shot trajectories), we need deterministic randomness:

- **Determinism**: Same seed → same random sequence every time
- **Replayability**: Can recreate exact game sessions
- **Control**: Can set seed for testing, recording, or debugging
- **Fast**: Optimized algorithms like Mulberry32 are very performant

For visual/audio effects, we keep `Math.random()` via existing `rint()`:

- **Non-deterministic**: Creates variety across sessions
- **No replay requirement**: Visual effects don't need to be reproduced exactly
- **Simpler**: No need to manage seeds for non-gameplay code

## Current Usage of rint()

The existing `rint(n)` function is currently used in ~6 files:

- `src/game/gameLoop/stateUpdates.ts` - Bunker shooting timing
- `src/core/shots/bunkShoot.ts` - Shot angle randomization
- `src/core/planet/planetSlice.ts` - Planet generation
- `src/render/transition/starmapPixels.ts` - Transition effects
- `src/dev/demos/bunkerDrawBitmap.ts` - Demo code
- `src/dev/demos/shipMoveBitmap.ts` - Demo code

## Implementation Strategy

We will **split** random number usage into two categories:

### Gameplay-Critical (Use New Seeded RNG)

Files that will use the new seeded `rnumber()` function:

- `src/game/gameLoop/stateUpdates.ts` - Bunker shooting timing
- `src/core/shots/bunkShoot.ts` - Shot angle randomization

These must be deterministic for accurate replay.

**Architecture Note**: RandomService will be a singleton service (like `collisionService`, `soundService`) that is instantiated once and passed as a dependency to the game. It will use a `setSeed()` method to reset the RNG state at the start of each game, rather than being stored in Redux state (which requires serializable data).

### Visual/Audio Only (Keep Existing rint())

Files that will continue using `rint()` with `Math.random()`:

- `src/core/planet/planetSlice.ts` - Planet generation
- `src/render/transition/starmapPixels.ts` - Transition effects
- `src/dev/demos/bunkerDrawBitmap.ts` - Demo code
- `src/dev/demos/shipMoveBitmap.ts` - Demo code
- Sound generators (not shown but use random values)
- Explosion debris animations

These don't need to be deterministic and can remain non-reproducible.

## Implementation

### 1. RandomService Factory

A factory function that creates a seeded random number generator service using the singleton pattern.

```typescript
// src/core/shared/RandomService.ts

/**
 * Random number service providing deterministic PRNG
 *
 * Uses Mulberry32 algorithm - simple, fast, deterministic
 * See: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 *
 * This service is instantiated once and passed as a dependency to the game.
 * Call setSeed() at the start of each game to reset the RNG state.
 */

export type RandomService = {
  getSeed: () => number
  setSeed: (seed: number) => void
  rnumber: (n: number) => number
}

export const createRandomService = (): RandomService => {
  let seed = 0
  let state = 0

  // Mulberry32 PRNG - simple, fast, deterministic
  // Period: 2^32
  // Quality: Passes PractRand, decent statistical properties
  const mulberry32 = (): number => {
    let t = (state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    getSeed: () => seed,
    setSeed: (newSeed: number) => {
      seed = newSeed
      state = newSeed
    },
    rnumber: (n: number) => Math.floor(mulberry32() * n)
  }
}
```

### 2. Keep rint() Unchanged

The existing `rint()` function remains completely unchanged and continues to use `Math.random()`:

```typescript
// src/core/shared/rint.ts - NO CHANGES

/**
 * Random integer from 0 to n-1
 *
 * @param n - Upper bound (exclusive)
 * @returns Random integer in range [0, n)
 */
export function rint(n: number): number {
  return Math.floor(Math.random() * n)
}
```

**Key design decision**: `rint()` is used only for visual/audio effects that don't need to be deterministic. Gameplay-critical code will use `RandomService.rnumber()` instead.

### 3. Add RandomService to Game Services

Add the RandomService to the `GameServices` type so it's injected as a dependency throughout the game.

```typescript
// src/game/store.ts

import type { RandomService } from '@/core/shared/RandomService'

// Define the services that will be injected
export type GameServices = {
  galaxyService: GalaxyService
  spriteService: SpriteService
  fizzTransitionService: FizzTransitionService
  soundService: GameSoundService
  collisionService: CollisionService
  randomService: RandomService // ADD THIS
}
```

Then when creating the store, instantiate the RandomService and pass it in:

```typescript
// src/game/main.tsx (or wherever store is created)

import { createRandomService } from '@/core/shared/RandomService'

const randomService = createRandomService()

const services: GameServices = {
  galaxyService,
  spriteService,
  fizzTransitionService,
  soundService,
  collisionService,
  randomService // ADD THIS
}

const store = createGameStore(services, initialSettings)
```

**Key design decision**: RandomService is a singleton service (like `collisionService` and `soundService`) that is instantiated once at application startup. The `setSeed()` method is called at the start of each game to reset the RNG state with a new seed, but the same service instance is reused across games.

### 4. Export from Shared Module

Make RandomService available throughout the codebase.

```typescript
// src/core/shared/index.ts - ADD EXPORTS

// Random number generation
export { rint } from './rint' // Unchanged - still uses Math.random()
export { createRandomService, type RandomService } from './RandomService'
```

## Game Engine Versioning

Create a version constant to track breaking changes to game logic.

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

This version will be used by the recording system to validate that recordings are compatible with the current game version.

## Setting the Seed

### During Normal Gameplay

When starting a new game, call `setSeed()` on the existing RandomService with a timestamp seed:

```typescript
// In the game initialization logic (e.g., a thunk or game start action)

const startNewGame = (randomService: RandomService) => {
  // Use timestamp as seed for non-deterministic gameplay
  const seed = Date.now()
  randomService.setSeed(seed)

  // Continue with game initialization...
}
```

Or in a Redux thunk:

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit'
import type { GameServices } from './store'

export const startNewGameThunk = createAsyncThunk<
  void,
  void,
  { extra: GameServices }
>('game/startNewGame', async (_, { extra: { randomService } }) => {
  // Use timestamp as seed for non-deterministic gameplay
  const seed = Date.now()
  randomService.setSeed(seed)

  // Continue with game initialization...
})
```

### During Replay (Future)

When replaying a recording, call `setSeed()` with the recorded seed:

```typescript
const startReplay = (
  randomService: RandomService,
  recording: GameRecording
) => {
  // Use recorded seed for deterministic replay
  randomService.setSeed(recording.seed)

  // Continue with replay initialization...
}
```

## Determinism Guarantees

### What This Provides

✅ **Same seed → same random sequence**: Given the same seed, `rint()` will produce identical outputs
✅ **Frame-perfect reproduction**: Random events occur at exactly the same frames
✅ **Cross-session consistency**: Recordings can be replayed weeks/months later
✅ **Fast performance**: Mulberry32 is highly optimized

### What's Not Guaranteed (Yet)

⚠️ **Cross-platform consistency**: JavaScript floating-point math should be consistent across platforms (IEEE 754), but hasn't been tested extensively

- Should work: Same browser, same OS
- Should work: Different browsers (modern engines)
- Uncertain: ARM vs x86 architectures
- If issues arise: Will investigate and potentially add state validation

### Other Determinism Requirements

The seeded RNG only solves randomness. For full determinism, we also need:

✅ **Fixed frame timing**: Game runs at constant 20 FPS (already implemented)
✅ **Deterministic state updates**: Redux reducers are pure (already implemented)
✅ **No async operations in game logic**: All updates are synchronous (already implemented)
✅ **Input recording**: Player inputs must be captured (handled by recording system)

## Testing Strategy

### Basic Verification

Test that same seed produces same sequence:

```typescript
// Manual test or unit test
import { createRandomService } from '@/core/shared/RandomService'

const service = createRandomService()

// First sequence
service.setSeed(12345)
const sequence1 = [
  service.rnumber(100),
  service.rnumber(100),
  service.rnumber(100)
]

// Reset to same seed
service.setSeed(12345)
const sequence2 = [
  service.rnumber(100),
  service.rnumber(100),
  service.rnumber(100)
]

// Should be identical
console.assert(JSON.stringify(sequence1) === JSON.stringify(sequence2))
```

### Game Integration Testing

1. **Visual verification**: Play game normally, ensure randomness "feels" random
2. **Bunker shooting**: Verify bunkers still shoot at appropriate times and angles
3. **Shot trajectories**: Ensure shots behave as expected
4. **No crashes**: Game runs without errors about uninitialized service

### Future: Recording Validation

Once recording is implemented:

1. Record a game session
2. Replay it immediately
3. Verify game state matches exactly (using state snapshots)

## Implementation Steps

### Step 1: Create RandomService (20 min)

- [ ] Create `src/core/shared/RandomService.ts`
- [ ] Implement `createRandomService()` factory with Mulberry32
- [ ] Export `RandomService` type
- [ ] Include `setSeed(seed)`, `getSeed()`, and `rnumber(n)` methods

### Step 2: Create Version File (5 min)

- [ ] Create `src/game/version.ts`
- [ ] Add `GAME_ENGINE_VERSION = 1` with documentation

### Step 3: Update Exports (5 min)

- [ ] Add RandomService exports to `src/core/shared/index.ts`
- [ ] Ensure `rint` is still exported (unchanged)

### Step 4: Add RandomService to GameServices (15 min)

- [ ] Add `randomService: RandomService` to `GameServices` type in `src/game/store.ts`
- [ ] Import `createRandomService` in main.tsx (or wherever services are created)
- [ ] Instantiate RandomService: `const randomService = createRandomService()`
- [ ] Add to services object passed to `createGameStore()`

### Step 5: Call setSeed() on Game Start (10 min)

- [ ] Find where new games are started (likely a thunk or action handler)
- [ ] Add `randomService.setSeed(Date.now())` at the start of new game
- [ ] Access randomService from thunk extra argument: `{ extra: { randomService } }`

### Step 6: Update stateUpdates.ts (10 min)

- [ ] Modify bunker shooting logic to use `randomService.rnumber()` instead of `rint()`
- [ ] Pass RandomService from thunk extra argument to the update functions

### Step 7: Update bunkShoot.ts (10 min)

- [ ] Modify shot angle logic to use `randomService.rnumber()` instead of `rint()`
- [ ] Pass RandomService from caller (stateUpdates.ts) to the function

### Step 8: Testing (20 min)

- [ ] Run `npm run typecheck` - verify no type errors
- [ ] Run `npm run lint` - verify no lint issues
- [ ] Run `npm run format` - format code
- [ ] Manual test: Play game, verify bunker behavior unchanged
- [ ] Manual test: Verify same seed produces same sequence (console test)

### Step 9: Commit (5 min)

- [ ] Commit changes with message: "Add seeded RNG for gameplay-critical randomness"

**Total Estimated Time: ~1.5 hours**

## Migration Notes

### Breaking Changes for Gameplay Code

This is a **breaking change** for gameplay-critical randomness:

- ⚠️ `stateUpdates.ts` and `bunkShoot.ts` must be updated to use `randomService.rnumber()`
- ⚠️ These functions need to receive RandomService as a parameter (from thunk extra argument)
- ✅ All other `rint()` call sites remain unchanged
- ✅ Visual/audio randomness continues to use `Math.random()`

### Developer Experience

**Gameplay-critical code** (bunker shooting, shot angles):

```typescript
// Before:
import { rint } from '@/core/shared'
const angle = rint(360)

// After:
// RandomService passed from thunk extra argument
const angle = randomService.rnumber(360)
```

**In Redux thunks**:

```typescript
// Before:
import { rint } from '@/core/shared'

export const someGameThunk = createAsyncThunk('game/something', async () => {
  const value = rint(100)
  // ...
})

// After:
import type { GameServices } from '@/game/store'

export const someGameThunk = createAsyncThunk<
  void,
  void,
  { extra: GameServices }
>('game/something', async (_, { extra: { randomService } }) => {
  const value = randomService.rnumber(100)
  // ...
})
```

**Visual/audio code** (transitions, explosions, sound):

```typescript
// Before:
import { rint } from '@/core/shared'
const debris = rint(10)

// After: NO CHANGE
import { rint } from '@/core/shared'
const debris = rint(10)
```

### When to Call setSeed()

**Call setSeed()** when:

- Starting a new game (use `Date.now()` as seed for random gameplay)
- Starting a replay (use recorded seed for deterministic replay)
- Running tests (use fixed seed for deterministic testing)

**Never call setSeed()** in:

- Library code or utility functions
- Render functions
- Sound generators
- Visual effects
- Mid-game (would break determinism)

## Future Work

This implementation enables:

- ✅ Game recording and replay (RECORDING_PLAN.md)
- ✅ Deterministic testing
- ✅ Reproducible bug reports (users can share seeds)
- ✅ Speedrun verification
- ✅ Tool-assisted gameplay
- ✅ State validation and debugging

## Notes

- **Why Mulberry32?**: Simple (4 lines), fast (no loops), good statistical quality, well-tested
- **Why not Xorshift?**: Slightly lower quality, similar performance
- **Why not MT19937?**: Overkill for our needs, larger code size
- **Why singleton pattern?**: Matches the existing service architecture (collisionService, soundService) and avoids storing non-serializable objects in Redux state
- **Why setSeed() instead of creating new instances?**: Reusing the same service instance is more efficient and aligns with Redux best practices (services should not be stored in state)
- **Why not keep Math.random()?**: No way to seed it in JavaScript
