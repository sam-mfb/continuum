# Recording Validation

This directory contains the headless game engine and recording validator used to verify that game recordings replay correctly.

## Overview

The validator replays a game recording frame-by-frame in a headless Redux store (no rendering, no sound) and compares the state against recorded snapshots to ensure deterministic gameplay.

## Performance Monitoring

The validator includes built-in performance instrumentation to identify bottlenecks and measure optimization improvements.

### Running with Performance Metrics

```bash
npm run validate-recording <path-to-recording.bin>
```

The validator automatically displays performance metrics after validation completes:

```
=== Performance Metrics ===
Total time: 6847.12ms
Frame loop time: 6842.45ms (99.9%)
  - getReplayControls: 12.78ms (0.2%)
  - Snapshot finding: 2.57ms (0.0%)
  - Snapshot validation: 27.38ms (0.4%)
  - Engine step: 6796.42ms (99.3%)
  - Other overhead: 3.30ms
Final validation: 0.09ms

Average time per frame: 1.015ms
Frames per second: 985.3 FPS
```

### Metrics Explained

| Metric                     | Description                                         |
| -------------------------- | --------------------------------------------------- |
| **Total time**             | Complete validation duration from start to finish   |
| **Frame loop time**        | Time spent processing all game frames               |
| **getReplayControls**      | Time spent retrieving input controls for each frame |
| **Snapshot finding**       | Time spent looking up snapshots with `Array.find()` |
| **Snapshot validation**    | Time spent validating state (hashing or comparing)  |
| **Engine step**            | Time spent simulating game physics/logic            |
| **Other overhead**         | Remaining frame loop time (level transitions, etc.) |
| **Final validation**       | Time validating final score/fuel/level              |
| **Average time per frame** | Mean time to process one frame                      |
| **Frames per second**      | Theoretical FPS if validation ran in real-time      |

### Interpreting Results

**Normal Distribution:**

- ~99% of time should be in **Engine step** (game simulation)
- <1% in validator infrastructure (finding controls, snapshots)

**What to Optimize:**

- If **Engine step** dominates (>99%), any speedup requires game engine optimization
- If **getReplayControls** or **Snapshot finding** is high (>5%), optimization needed in lookup algorithms
- If **Snapshot validation** is high (>5%), consider optimizing `hashState()` or comparison logic

**Performance Targets:**

- Modern hardware: ~1000 FPS (1ms per frame)
- Validation should complete in <10 seconds for typical recordings (<10,000 frames)

## Code Locations

### Performance Instrumentation

**RecordingValidator.ts** (`src/core/validation/RecordingValidator.ts`)

- Lines 21-30: `PerformanceMetrics` type definition
- Lines 101-106: Performance timer initialization
- Lines 143-145: `getReplayControls` timing
- Lines 158-165: Snapshot finding timing
- Lines 169-196: Snapshot validation timing
- Lines 200-202: Engine step timing
- Lines 291-312: Performance metrics calculation

**validate-recording.ts** (`scripts/validate-recording.ts`)

- Lines 103-129: Performance metrics output formatting

### Core Validation Logic

**RecordingValidator.ts** - Main validation loop
**HeadlessGameEngine.ts** - Game engine without rendering
**createHeadlessStore.ts** - Redux store configuration for validation
**hashState.ts** - State hashing for snapshot validation

## Optimization History

### v1.3.1 - Performance Profiling & Redux Optimization (2025-11)

**Added:**

- Performance instrumentation to measure validation bottlenecks
- Detailed timing for all major operations in validation loop

**Optimization:**

- Disabled `immutableCheck` in headless Redux store
- **Result:** 5% speedup (357ms saved on 6,742 frame recording)
- **Before:** 7,204ms total (936.5 FPS)
- **After:** 6,847ms total (985.3 FPS)

**Key Finding:**

- 99.3% of validation time is game simulation (engine step)
- Validator infrastructure is highly optimized (<1% overhead)
- Redux immutability checks added ~5% overhead on every action
- Further speedup would require game engine optimization

### Configuration Optimizations

The headless store disables Redux Toolkit development features for performance:

```typescript
getDefaultMiddleware({
  serializableCheck: false, // Don't check if values are serializable
  immutableCheck: false // Don't check for state mutations
})
```

These checks add overhead on every Redux action dispatch, which is significant during validation with thousands of frames.

## Architecture

### Validation Flow

1. **Initialize** headless store with recorded galaxy and start level
2. **Load** first level with recorded seed for determinism
3. **Frame Loop** - For each frame in recording:
   - Get control input from replay
   - Check snapshot (if present) before stepping
   - Step game engine (Redux state updates)
   - Track level transitions
4. **Final Validation** - Verify final score, fuel, level match recording
5. **Report** - Return success/errors with performance metrics

### Headless vs. Game Store

| Feature             | Game Store      | Headless Store       |
| ------------------- | --------------- | -------------------- |
| Rendering           | ✅ Full UI      | ❌ No rendering      |
| Sound               | ✅ Audio system | ❌ No sound          |
| Persistence         | ✅ localStorage | ❌ No persistence    |
| Redux DevTools      | ❌ Disabled     | ❌ Disabled          |
| Serializable checks | ⚠️ Enabled      | ❌ Disabled          |
| Immutability checks | ⚠️ Enabled      | ❌ Disabled          |
| Middleware          | 7+ middlewares  | 2 (thunk, syncThunk) |

The headless store is optimized for speed and determinism, removing all unnecessary features.

## Future Optimization Ideas

1. **Binary search for replay controls** - Current linear search is fast enough (<0.2%)
2. **Index snapshots by frame number** - Current `Array.find()` is fast enough (<0.1%)
3. **Incremental state hashing** - Only hash changed slices instead of entire state
4. **Game engine optimizations**:
   - Profile collision detection (largest component of engine step)
   - Optimize Redux action dispatch overhead
   - Cache expensive calculations

**Note:** Current performance (985 FPS) is excellent. Optimizations should be data-driven based on profiling results.
