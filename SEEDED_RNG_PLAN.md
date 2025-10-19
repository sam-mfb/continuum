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

A factory function that creates a seeded random number generator instance.

```typescript
// src/core/shared/RandomService.ts

/**
 * Random number service providing deterministic PRNG
 *
 * Uses Mulberry32 algorithm - simple, fast, deterministic
 * See: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */

export type RandomService = {
  getSeed: () => number
  rnumber: (n: number) => number
}

export const createRandomService = (seed: number): RandomService => {
  let state = seed

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

### 3. Store RandomService in Game State

Add the RandomService instance to the game state so it's available throughout the game lifecycle.

```typescript
// In the appropriate game state slice (e.g., gameSlice.ts or similar)

import {
  createRandomService,
  type RandomService
} from '@/core/shared/RandomService'

type GameState = {
  // ... existing fields
  randomService: RandomService
}

// When initializing a new game:
const newGameState = {
  // ... other initialization
  randomService: createRandomService(Date.now()) // or any seed value
}
```

**Key design decision**: Each game gets its own RandomService instance created with a seed. The instance is stored in the game state and passed to functions that need deterministic randomness.

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

When starting a new game, create a new RandomService with a timestamp seed:

```typescript
import { createRandomService } from '@/core/shared/RandomService'

const startNewGame = () => {
  // Use timestamp as seed for non-deterministic gameplay
  const seed = Date.now()
  const randomService = createRandomService(seed)

  // Store in game state
  // ... continue with game initialization
}
```

### During Replay (Future)

When replaying a recording, create a RandomService with the recorded seed:

```typescript
import { createRandomService } from '@/core/shared/RandomService'

const startReplay = (recording: GameRecording) => {
  // Use recorded seed for deterministic replay
  const randomService = createRandomService(recording.seed)

  // Store in game state
  // ... continue with replay initialization
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

// First sequence
const service1 = createRandomService(12345)
const sequence1 = [
  service1.rnumber(100),
  service1.rnumber(100),
  service1.rnumber(100)
]

// Second sequence with same seed
const service2 = createRandomService(12345)
const sequence2 = [
  service2.rnumber(100),
  service2.rnumber(100),
  service2.rnumber(100)
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
- [ ] Implement `createRandomService(seed)` factory with Mulberry32
- [ ] Export `RandomService` type
- [ ] Include `rnumber(n)` method (not `rint`)

### Step 2: Create Version File (5 min)

- [ ] Create `src/game/version.ts`
- [ ] Add `GAME_ENGINE_VERSION = 1` with documentation

### Step 3: Update Exports (5 min)

- [ ] Add RandomService exports to `src/core/shared/index.ts`
- [ ] Ensure `rint` is still exported (unchanged)

### Step 4: Add RandomService to Game State (15 min)

- [ ] Identify where game state is initialized for a new game
- [ ] Add `randomService` field to game state type
- [ ] Create RandomService instance with `Date.now()` seed on new game
- [ ] Store instance in game state

### Step 5: Update stateUpdates.ts (10 min)

- [ ] Modify bunker shooting logic to use `randomService.rnumber()` instead of `rint()`
- [ ] Pass RandomService from game state to the update functions

### Step 6: Update bunkShoot.ts (10 min)

- [ ] Modify shot angle logic to use `randomService.rnumber()` instead of `rint()`
- [ ] Pass RandomService from game state to the function

### Step 7: Testing (20 min)

- [ ] Run `npm run typecheck` - verify no type errors
- [ ] Run `npm run lint` - verify no lint issues
- [ ] Run `npm run format` - format code
- [ ] Manual test: Play game, verify bunker behavior unchanged
- [ ] Manual test: Verify same seed produces same sequence (console test)

### Step 8: Commit (5 min)

- [ ] Commit changes with message: "Add seeded RNG for gameplay-critical randomness"

**Total Estimated Time: ~1.5 hours**

## Migration Notes

### Breaking Changes for Gameplay Code

This is a **breaking change** for gameplay-critical randomness:

- ⚠️ `stateUpdates.ts` and `bunkShoot.ts` must be updated to use `randomService.rnumber()`
- ⚠️ These functions need to receive RandomService as a parameter
- ✅ All other `rint()` call sites remain unchanged
- ✅ Visual/audio randomness continues to use `Math.random()`

### Developer Experience

**Gameplay-critical code** (bunker shooting, shot angles):

```typescript
// Before:
import { rint } from '@/core/shared'
const angle = rint(360)

// After:
// RandomService passed from game state
const angle = randomService.rnumber(360)
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

### When to Create RandomService

**Create new instances** only when:

- Starting a new game (use `Date.now()` as seed)
- Starting a replay (use recorded seed)
- Running tests (use fixed seed for determinism)

**Never create instances** in:

- Library code or utility functions
- Render functions
- Sound generators
- Visual effects

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
- **Why singleton?**: Simpler than dependency injection, matches original game architecture
- **Why not keep Math.random()?**: No way to seed it in JavaScript
