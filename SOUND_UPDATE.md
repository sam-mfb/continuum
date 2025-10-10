# Sound Service Upgrade

## Status: Phase 1 Complete ✅

Phase 1 (AudioWorklet migration) has been completed, refined, and integrated into the game.

## Recent Refinements (Post-Phase 1)

- ✅ **Ring Buffer Extraction** (2024): Separated ring buffer logic into dedicated module in `sound-shared/`
- ✅ **Explicit Engine Startup** (2024): Added `startEngine()` method to eliminate first-sound delay
- ✅ **Volume Control Refactoring** (2024): Moved volume handling from worklet to GainNode (idiomatic Web Audio)
- ✅ **Dependency Inversion** (2024): Game defines `GameSoundService` interface (what it needs), service provides `SoundService` (what it offers)
- ✅ **Code Reduction** (2024): Removed redundant soundEngine.ts layer
- ✅ All 611 tests passing

## Remaining Work

Split into three new phases:

1. **Phase 2**: Create modern service with multi-channel mixing (no music yet)
2. **Phase 3**: Integrate modern service into game
3. **Phase 4**: Add optional background music channel

## Audio Format Recommendation

**Use OGG Vorbis** for background music (Phase 4):

**Pros**:

- Excellent compression (smaller files than MP3)
- Better quality at same bitrate
- No patent/licensing issues (fully open)
- Well-supported in modern browsers (Chrome, Firefox, Edge, Safari 14.1+)
- Native Web Audio API support

**Fallback**: Since we don't support old browsers (dropping ScriptProcessorNode), OGG-only is fine. All browsers that support AudioWorklet also support OGG.

For **generated SFX**: Keep current approach (procedural generation from original Mac code)

## Current Architecture (After Phase 1 + Refinements)

```
src/core/
├── sound/                   ✅ AudioWorklet-based implementation
│   ├── service.ts          ✅ Main service with startEngine() support
│   ├── audioOutput.ts      ✅ AudioWorkletNode with GainNode volume control
│   ├── bufferManager.ts    ✅ Kept for compatibility
│   ├── worklet/
│   │   ├── basicProcessor.worklet.ts  ✅ Uses RingBuffer from sound-shared
│   │   └── worklet.d.ts
│   ├── types.ts            ✅ SoundService interface
│   ├── index.ts            ✅ Exports createSoundService, SoundService
│   └── __tests__/
│
└── sound-shared/            ✅ Shared code (used by worklet and service)
    ├── constants.ts         ✅ SoundType, priorities, decay rates
    ├── sampleGenerator.ts   ✅ Base generator interface
    ├── formatConverter.ts   ✅ 8-bit unsigned → Float32 conversion
    ├── ringBuffer.ts        ✅ NEW: Circular buffer for audio samples
    ├── generators-asm/      ✅ All 13 procedural sound generators
    │   ├── fireGenerator.ts
    │   ├── explosionGenerator.ts
    │   ├── thrusterGenerator.ts
    │   └── ...etc
    └── __tests__/
        ├── ringBuffer.test.ts      ✅ NEW: 25 tests
        ├── sampleGenerator.test.ts
        └── formatConverter.test.ts
```

### Game Integration

```
src/game/
├── types.ts                ✅ GameSoundService interface (DIP - game defines needs)
├── store.ts                ✅ Uses GameSoundService
├── soundListenerMiddleware.ts  ✅ Redux middleware for sound events
├── App.tsx                 ✅ Calls startEngine() on game start
└── main.tsx                ✅ Creates sound service
```

## Future Architecture (Phase 2-4)

When implementing Phase 2-4, we will add:

```
src/core/
├── sound/                   (current AudioWorklet implementation - kept as-is)
├── sound-modern/           (TODO: modern service with mixing)
│   ├── service.ts          (implements SoundService + music methods)
│   ├── mixer.ts            (channel management)
│   ├── musicPlayer.ts      (Phase 4 only)
│   ├── audioOutput.ts      (mixer-aware output)
│   ├── worklet/
│   │   └── mixerProcessor.worklet.ts  (uses RingBuffer from sound-shared)
│   ├── types.ts            (ModernSoundService type)
│   └── index.ts
└── sound-shared/           (shared by both implementations)
```

## Phase 1: AudioWorklet Migration ✅ COMPLETE

**Goal**: Migrate current service to use AudioWorklet

**Completed Work**:

### Core AudioWorklet Implementation

- ✅ Created `sound-shared/` directory with all shared code (generators, constants, utilities)
- ✅ Replaced ScriptProcessorNode with AudioWorkletNode in `audioOutput.ts`
- ✅ Created `worklet/basicProcessor.worklet.ts` with audio processing in audio rendering thread
- ✅ Used Vite's `?worker&url` import pattern to bundle worklet with TypeScript and dependencies
- ✅ Implemented onEnded callback support for discrete sounds
- ✅ **Kept exact same behavior**: single sound, priority-based
- ✅ **Kept exact same API**: all existing methods unchanged
- ✅ Fixed unmute issue where continuous sounds weren't restarting
- ✅ Integrated into game and verified all sounds work correctly

### Post-Phase 1 Refinements (2024)

- ✅ **Removed redundant soundEngine.ts** - Service now calls audioOutput directly (226 lines removed)
- ✅ **Refactored volume control** - Moved from worklet to GainNode (idiomatic Web Audio API pattern)
- ✅ **Extracted ring buffer module** - Created `ringBuffer.ts` in `sound-shared/` with 25 comprehensive tests
  - Factory function `createRingBuffer(size)` following builder pattern
  - Explicit count tracking (can hold full `size` items, no "sacrifice one slot")
  - Worklet focuses solely on audio processing, delegates buffer management
- ✅ **Added explicit engine startup** - New `startEngine()` method eliminates first-sound delay
  - Called proactively on "Start Game" button (user gesture for AudioContext.resume())
  - Non-blocking, graceful fallback to lazy initialization
- ✅ **Applied Dependency Inversion Principle**
  - Game defines `GameSoundService` (what it needs - 15 methods)
  - Service provides `SoundService` (what it offers - 18 methods)
  - TypeScript verifies compatibility
- ✅ **Removed unused types** - Cleaned up vestigial SoundState type

### Results

- ✅ Drop-in replacement using modern, non-deprecated Web Audio APIs
- ✅ Old ScriptProcessorNode-based implementation removed (4,943 lines)
- ✅ All 611 tests passing (26 new tests added for ring buffer)
- ✅ Cleaner separation of concerns
- ✅ Better alignment with Web Audio API best practices

## Phase 2: Multi-Channel Mixer Service (TODO)

**Goal**: Build modern service with multi-channel mixing for simultaneous sounds

**Key Design Decision**: NO music support in Phase 2. Focus purely on SFX mixing.

### Architecture Changes

```
Mixer Architecture (Phase 2):
┌─────────────────────────────────────┐
│ Mixer (up to 8 simultaneous sounds) │
├─────────────────────────────────────┤
│ Channel 1: SFX (procedural)         │
│ Channel 2: SFX (procedural)         │
│ Channel 3: SFX (procedural)         │
│ Channel 4: SFX (procedural)         │
│ Channel 5: SFX (procedural)         │
│ Channel 6: SFX (procedural)         │
│ Channel 7: SFX (procedural)         │
│ Channel 8: SFX (procedural)         │
└─────────────────────────────────────┘
         ↓ (mix all channels)
    AudioWorklet Output
```

**Channel Management**:

- 8 channels all available for SFX (game sounds)
- Each channel has own ring buffer + generator (from `sound-shared/`)
- Mixer combines all active channels (simple addition with clipping prevention)
- Auto-cleanup: channels release when sound ends

**Priority System Evolution**:

- Keep existing priority for **backward compatibility**
- Change behavior: priority now determines **channel selection** instead of blocking
- High-priority sound can claim channel from lower-priority sound
- Multiple copies of same sound can play if channels available
- Falls back to current blocking behavior if all channels busy

### Files to Create

**New directory `sound-modern/`**:

- `service.ts` - Implements `SoundService` interface (exact same API as current service)
- `mixer.ts` - Channel allocation and mixing logic
- `audioOutput.ts` - Mixer-aware audio output
- `worklet/mixerProcessor.worklet.ts` - Multi-channel worklet (uses `RingBuffer` from `sound-shared/`)
- `types.ts` - Type definitions
- `index.ts` - Exports `createModernSoundService`
- `__tests__/` - Unit tests for mixer and multi-sound playback

### Implementation Tasks

1. Create `mixer.ts`:

   - Channel allocation logic (8 channels)
   - Priority-based channel selection
   - Channel cleanup on sound end
   - Mix algorithm (sum all active channels with overflow protection)

2. Create `worklet/mixerProcessor.worklet.ts`:

   - 8 ring buffers (one per channel) using `createRingBuffer()` from `sound-shared/`
   - 8 generator slots (one per channel) using generators from `sound-shared/`
   - Message handling for channel control
   - Mix all active channels in `process()` callback
   - Post messages back for sound ended events (per channel)

3. Create `service.ts`:

   - Implements **exact same** `SoundService` interface
   - Internally uses mixer for all sounds
   - Maintains priority system (now for channel allocation)
   - All existing methods work identically from caller's perspective

4. Create `audioOutput.ts`:
   - Similar to current `audioOutput.ts` but mixer-aware
   - Loads mixer worklet instead of basic worklet
   - Handles multi-channel message passing

### Testing Strategy

- Unit tests for mixer channel allocation
- Unit tests for priority-based channel selection
- Integration tests: play 8 simultaneous sounds, verify all audible
- Integration tests: play 9 sounds, verify priority system works
- Backward compatibility: run existing game tests, verify behavior unchanged
- Performance tests: ensure worklet doesn't add latency

## Phase 3: Game Integration (TODO)

**Goal**: Switch game to use modern service

**Prerequisites**: Phase 2 complete and tested

### Implementation Tasks

1. Update game imports:

   - Change `import { createSoundService } from '@/core/sound'`
   - To `import { createModernSoundService } from '@/core/sound-modern'`

2. Update service creation in `src/game/main.tsx`:

   ```typescript
   // Before
   const soundService = await createSoundService({ volume, muted })

   // After
   const soundService = await createModernSoundService({ volume, muted })
   ```

3. Verify all game sounds work:

   - Ship fire (simultaneous shots now possible)
   - Ship thrust (can overlap with other sounds)
   - Shield (can overlap with other sounds)
   - Explosions (multiple simultaneous explosions)
   - Bunker shots (multiple bunkers shooting simultaneously)
   - Fuel collection
   - Level transitions

4. Test edge cases:
   - Many simultaneous sounds (>8)
   - Priority system still works correctly
   - Continuous sounds (thrust/shield) don't monopolize channels

### Rollback Plan

If issues arise, can easily revert to current service:

```typescript
// Rollback: change one line
import { createSoundService } from '@/core/sound' // instead of sound-modern
```

### Success Criteria

- ✅ All 611+ tests passing
- ✅ No regressions in sound behavior
- ✅ Noticeable improvement: simultaneous bunker shots, multiple explosions
- ✅ Performance: no audio dropouts or latency issues

## Phase 4: Background Music Channel (TODO)

**Goal**: Add optional background music support

**Prerequisites**: Phase 3 complete and stable

### Architecture Changes

```
Mixer Architecture (Phase 4):
┌─────────────────────────────────────┐
│ Mixer (up to 8 simultaneous sounds) │
├─────────────────────────────────────┤
│ Channel 1-7: SFX (procedural)       │
│ Channel 8: Background Music (file)  │ ← NEW
└─────────────────────────────────────┘
         ↓ (mix all channels)
    AudioWorklet Output
```

**Music Channel Design**:

- Dedicated channel 8 (never used for SFX)
- Plays audio files (OGG format)
- Independent volume control
- Crossfade support for smooth transitions
- Loop mode support
- Music files stored in `public/assets/music/`

### New Service Methods

Extend `SoundService` interface with music methods:

```typescript
// Phase 4: extends existing SoundService interface
export type ModernSoundService = SoundService & {
  // New methods - don't break existing API
  playBackgroundMusic(
    trackId: string,
    options?: {
      loop?: boolean
      fadeIn?: number // ms
      volume?: number // 0-1, independent of SFX volume
    }
  ): Promise<void>

  stopBackgroundMusic(options?: {
    fadeOut?: number // ms
  }): Promise<void>

  pauseBackgroundMusic(): void
  resumeBackgroundMusic(): void

  setBackgroundMusicVolume(volume: number): void

  // Query methods
  isBackgroundMusicPlaying(): boolean
  getCurrentTrack(): string | null
}
```

### Implementation Tasks

1. Create `musicPlayer.ts`:

   - Audio file loading (fetch + AudioContext.decodeAudioData)
   - Playback control (play, pause, stop, loop)
   - Fade in/out logic
   - Volume control (independent of SFX)

2. Update `mixer.ts`:

   - Reserve channel 8 for music
   - Add music channel to mix algorithm
   - Handle music-specific messages

3. Update `worklet/mixerProcessor.worklet.ts`:

   - Add music buffer on channel 8
   - Music samples come from decoded audio file (not procedural generator)
   - Mix music channel with same algorithm as SFX channels

4. Update `service.ts`:

   - Add music methods to service instance
   - Wire up music player to mixer
   - Implement fade logic

5. Create music assets:
   - Convert/create music tracks in OGG format
   - Store in `public/assets/music/`
   - Document track IDs and usage

### Game Integration (Optional)

Music is **optional** - game works fine without it. If desired:

```typescript
// Example: play music on start screen
soundService.playBackgroundMusic('menu-theme', {
  loop: true,
  volume: 0.6
})

// Example: change music during gameplay
soundService.playBackgroundMusic('gameplay-theme', {
  loop: true,
  fadeIn: 1000 // 1 second fade in
})

// Example: stop on game over
soundService.stopBackgroundMusic({ fadeOut: 500 })
```

### Testing Strategy

- Unit tests for musicPlayer (loading, playback, fade)
- Integration tests: music + SFX playing simultaneously
- Integration tests: fade in/out, crossfade
- Performance tests: ensure music doesn't impact SFX performance
- Browser compatibility tests (OGG support)

## Benefits of This Phased Approach

1. **Incremental Risk**: Each phase is independently testable and deployable
2. **Phase 2 Focus**: Multi-channel mixing for SFX (immediate value, no music complexity)
3. **Phase 3 Safety**: Easy rollback if integration issues arise
4. **Phase 4 Optional**: Music is completely optional, can be deferred indefinitely
5. **Code Reuse**: All phases share generators, ring buffer, and constants from `sound-shared/`
6. **Clean Separation**: Current `sound/` implementation stays as fallback option

## Testing Strategy

**Critical**: Existing tests must pass after each phase

### Phase 2 Tests

- Unit tests for mixer channel allocation
- Unit tests for priority-based channel selection
- Integration tests for multi-sound playback
- Performance tests (worklet shouldn't add latency)
- All existing 611 tests must pass

### Phase 3 Tests

- Backward compatibility tests (run existing game, verify no regressions)
- Multi-sound scenarios (multiple simultaneous explosions, bunker shots)
- All 611+ tests must pass

### Phase 4 Tests

- Music loading and playback
- Fade in/out functionality
- Music + SFX mixing
- Loop mode
- Browser compatibility (OGG support)
- All 611+ tests must pass

## Files Modified/Created (Summary)

### Phase 0: Shared Code Extraction ✅ COMPLETE

**Completed**:

- ✅ Created `src/core/sound-shared/constants.ts`
- ✅ Created `src/core/sound-shared/sampleGenerator.ts`
- ✅ Created `src/core/sound-shared/formatConverter.ts`
- ✅ Created `src/core/sound-shared/ringBuffer.ts` (Phase 1 refinement)
- ✅ Moved `src/core/sound-shared/generators-asm/` (all 13 generators)
- ✅ Moved shared tests to `src/core/sound-shared/__tests__/`

### Phase 1: AudioWorklet Service ✅ COMPLETE

**Completed in `sound/` directory**:

- ✅ `src/core/sound/service.ts` (upgraded for worklet + startEngine)
- ✅ `src/core/sound/audioOutput.ts` (AudioWorkletNode + GainNode)
- ✅ `src/core/sound/bufferManager.ts` (kept for compatibility)
- ✅ `src/core/sound/types.ts` (SoundService interface + startEngine)
- ✅ `src/core/sound/worklet/basicProcessor.worklet.ts` (uses RingBuffer)
- ✅ `src/core/sound/worklet/worklet.d.ts`
- ✅ `src/core/sound/index.ts` (exports)
- ✅ `src/core/sound/__tests__/` (all tests passing)

**Completed in `game/` directory**:

- ✅ `src/game/types.ts` (GameSoundService interface - DIP)
- ✅ `src/game/store.ts` (uses GameSoundService)
- ✅ `src/game/soundListenerMiddleware.ts` (Redux middleware)
- ✅ `src/game/App.tsx` (calls startEngine on game start)
- ✅ `src/game/main.tsx` (creates sound service)

**Removed**:

- ✅ `src/core/sound/soundEngine.ts` (redundant layer - 99 lines removed)
- ✅ `src/core/sound/__tests__/soundEngine.test.ts` (4 tests - redundant)
- ✅ Old ScriptProcessorNode implementation (4,943 lines total removed)

### Phase 2: Multi-Channel Mixer (TODO)

New directory `sound-modern/` with:

- `src/core/sound-modern/service.ts` (implements SoundService)
- `src/core/sound-modern/mixer.ts` (channel management)
- `src/core/sound-modern/audioOutput.ts` (mixer output)
- `src/core/sound-modern/worklet/mixerProcessor.worklet.ts` (8 channels)
- `src/core/sound-modern/types.ts` (type definitions)
- `src/core/sound-modern/index.ts` (exports createModernSoundService)
- `src/core/sound-modern/__tests__/` (mixer tests)

### Phase 3: Game Integration (TODO)

**Files to modify**:

- `src/game/main.tsx` (switch to createModernSoundService)

### Phase 4: Background Music (TODO)

**New files in `sound-modern/`**:

- `src/core/sound-modern/musicPlayer.ts` (music playback logic)

**Update existing files**:

- `src/core/sound-modern/service.ts` (add music methods)
- `src/core/sound-modern/mixer.ts` (reserve channel 8 for music)
- `src/core/sound-modern/worklet/mixerProcessor.worklet.ts` (add music channel)
- `src/core/sound-modern/types.ts` (add ModernSoundService type)

**New assets**:

- `public/assets/music/*.ogg` (music tracks)

## Current Status Summary

- ✅ **Phase 0**: Complete - Shared code extracted
- ✅ **Phase 1**: Complete - AudioWorklet migration + refinements
- ✅ **611 tests passing**
- ✅ **Production ready** - Current single-channel service works great
- ⏳ **Phase 2**: TODO - Multi-channel mixer (SFX only)
- ⏳ **Phase 3**: TODO - Game integration
- ⏳ **Phase 4**: TODO - Background music (optional)
