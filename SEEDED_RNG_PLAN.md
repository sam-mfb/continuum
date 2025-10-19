# Seeded Random Number Generator Implementation

## Overview

This document describes the implementation of deterministic random number generation for Continuum. This is a foundational change that enables game recording and replay by making all randomness reproducible from a seed value.

**Prerequisite for**: [RECORDING_PLAN.md](./RECORDING_PLAN.md) - The recording system depends on deterministic RNG to ensure replays are accurate.

## Why Seeded RNG?

The current implementation uses `Math.random()`, which is:

- **Non-deterministic**: Different random sequence every time
- **Cannot be replayed**: No way to reproduce the exact same game
- **Not seedable**: Can't control or predict the sequence

A seeded PRNG (Pseudo-Random Number Generator) provides:

- **Determinism**: Same seed → same random sequence every time
- **Replayability**: Can recreate exact game sessions
- **Control**: Can set seed for testing, recording, or debugging
- **Fast**: Optimized algorithms like Mulberry32 are very performant

## Current Usage

The `rint(n)` function is currently used in ~6 files:

- `src/game/gameLoop/stateUpdates.ts` - Bunker shooting timing
- `src/core/shots/bunkShoot.ts` - Shot angle randomization
- `src/core/planet/planetSlice.ts` - Planet generation
- `src/render/transition/starmapPixels.ts` - Transition effects
- `src/dev/demos/bunkerDrawBitmap.ts` - Demo code
- `src/dev/demos/shipMoveBitmap.ts` - Demo code

**Critical for gameplay**:

- Bunker shooting (timing and trajectories)
- Shot angle selection
- Planet generation

**Non-critical** (visual/audio only):

- Transition effects
- Sound generators (not shown in list but use random values)
- Explosion debris animations

## Implementation

### 1. RandomService

A singleton service that provides seeded random number generation.

```typescript
// src/core/shared/RandomService.ts

/**
 * Random number service providing deterministic PRNG
 *
 * Uses Mulberry32 algorithm - simple, fast, deterministic
 * See: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */

type RandomService = {
  setSeed: (seed: number) => void
  getSeed: () => number
  rint: (n: number) => number
}

const createRandomService = (): RandomService => {
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
    setSeed: (s: number) => {
      seed = s
      state = s
    },
    getSeed: () => seed,
    rint: (n: number) => Math.floor(mulberry32() * n)
  }
}

// Singleton instance
let randomService: RandomService | undefined

export const initializeRandomService = (): void => {
  randomService = createRandomService()
}

export const getRandomService = (): RandomService => {
  if (!randomService) {
    throw new Error(
      'RandomService not initialized. Call initializeRandomService() first.'
    )
  }
  return randomService
}

export type { RandomService }
```

### 2. Transparent rint() Integration

Modify the existing `rint()` function to use RandomService internally. This keeps all calling code unchanged.

```typescript
// src/core/shared/rint.ts - MODIFIED

import { getRandomService } from './RandomService'

/**
 * Random integer from 0 to n-1
 *
 * Now uses seeded PRNG for deterministic behavior
 *
 * @param n - Upper bound (exclusive)
 * @returns Random integer in range [0, n)
 */
export function rint(n: number): number {
  return getRandomService().rint(n)
}
```

**Key design decision**: The signature of `rint()` stays exactly the same. All existing game code continues to work without any changes.

### 3. Service Initialization

Initialize the RandomService at application startup, before any game code runs.

```typescript
// src/game/main.tsx - ADD THIS

import { initializeRandomService } from '@/core/shared/RandomService'

// Initialize RandomService FIRST, before any other services
initializeRandomService()

// ... rest of initialization (sprites, galaxy, sound, etc.)
```

**Critical**: Must be called before creating any services that might use `rint()`.

### 4. Export from Shared Module

Make RandomService available for game lifecycle management.

```typescript
// src/core/shared/index.ts - ADD EXPORTS

// Random number generation
export { rint } from './rint'
export {
  initializeRandomService,
  getRandomService,
  type RandomService
} from './RandomService'
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

When starting a new game, set a random seed:

```typescript
import { getRandomService } from '@/core/shared/RandomService'

const startNewGame = () => {
  // Use timestamp as seed for non-deterministic gameplay
  const seed = Date.now()

  const randomService = getRandomService()
  randomService.setSeed(seed)

  // Continue with game initialization...
}
```

### During Replay (Future)

When replaying a recording, use the recorded seed:

```typescript
import { getRandomService } from '@/core/shared/RandomService'

const startReplay = (recording: GameRecording) => {
  // Use recorded seed for deterministic replay
  const randomService = getRandomService()
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
import {
  initializeRandomService,
  getRandomService
} from '@/core/shared/RandomService'

initializeRandomService()
const service = getRandomService()

// First sequence
service.setSeed(12345)
const sequence1 = [service.rint(100), service.rint(100), service.rint(100)]

// Second sequence with same seed
service.setSeed(12345)
const sequence2 = [service.rint(100), service.rint(100), service.rint(100)]

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

### Step 1: Create RandomService (30 min)

- [ ] Create `src/core/shared/RandomService.ts`
- [ ] Implement `createRandomService()` with Mulberry32
- [ ] Implement singleton pattern with `initializeRandomService()` and `getRandomService()`
- [ ] Export types

### Step 2: Create Version File (5 min)

- [ ] Create `src/game/version.ts`
- [ ] Add `GAME_ENGINE_VERSION = 1` with documentation

### Step 3: Modify rint() (5 min)

- [ ] Update `src/core/shared/rint.ts` to use `getRandomService()`
- [ ] Keep existing function signature
- [ ] Update JSDoc comment

### Step 4: Update Exports (5 min)

- [ ] Add RandomService exports to `src/core/shared/index.ts`
- [ ] Ensure `rint` is still exported

### Step 5: Initialize in main.tsx (5 min)

- [ ] Import `initializeRandomService`
- [ ] Call it at the very start of initialization
- [ ] Add comment explaining why it's first

### Step 6: Testing (20 min)

- [ ] Run `npm run typecheck` - verify no type errors
- [ ] Run `npm run lint` - verify no lint issues
- [ ] Run `npm run format` - format code
- [ ] Manual test: Play game, verify normal behavior
- [ ] Manual test: Verify same seed produces same sequence (console test)

### Step 7: Commit (5 min)

- [ ] Commit changes with message: "Implement seeded RNG for deterministic gameplay"

**Total Estimated Time: ~1.5 hours**

## Migration Notes

### No Breaking Changes

This is a **non-breaking change**:

- ✅ All existing code continues to work
- ✅ No changes needed to any `rint()` call sites
- ✅ Game behavior is identical (just reproducible now)
- ✅ No API changes to any modules

### Developer Experience

**Before**:

```typescript
import { rint } from '@/core/shared'

const value = rint(10) // Random 0-9
```

**After**:

```typescript
import { rint } from '@/core/shared'

const value = rint(10) // Still random 0-9, but deterministic if seed is set
```

Same code, new capability.

### When to Set Seeds

**Don't set seeds** in library code or game logic. Seeds should only be set at:

- Game start (main game flow)
- Replay start (recording system)
- Tests (when determinism is needed)

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
