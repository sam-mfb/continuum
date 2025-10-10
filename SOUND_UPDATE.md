# Sound Service Upgrade

## Status: Phase 1 Complete ✅

Phase 1 (AudioWorklet migration) has been completed and integrated into the game.

## Remaining Work

1. **No Sound Mixing**: Single-channel architecture with priority system prevents simultaneous sounds
2. **No Background Music**: No support for continuous background music tracks

## Audio Format Recommendation

**Use OGG Vorbis** for background music:

**Pros**:

- Excellent compression (smaller files than MP3)
- Better quality at same bitrate
- No patent/licensing issues (fully open)
- Well-supported in modern browsers (Chrome, Firefox, Edge, Safari 14.1+)
- Native Web Audio API support

**Fallback**: Since we don't support old browsers (dropping ScriptProcessorNode), OGG-only is fine. All browsers that support AudioWorklet also support OGG.

For **generated SFX**: Keep current approach (procedural generation from original Mac code)

## Proposed Architecture

### Current Architecture (After Phase 1)

```
src/core/
├── sound/                   ✅ AudioWorklet-based implementation
│   ├── service.ts          (current service using AudioWorklet)
│   ├── soundEngine.ts
│   ├── audioOutput.ts      (uses AudioWorkletNode)
│   ├── bufferManager.ts
│   ├── worklet/
│   │   ├── basicProcessor.worklet.ts
│   │   └── worklet.d.ts
│   ├── types.ts
│   ├── index.ts            (exports createSoundService)
│   └── __tests__/
│
└── sound-shared/            ✅ Shared code
    ├── constants.ts         (SoundType, priorities, etc.)
    ├── sampleGenerator.ts
    ├── formatConverter.ts
    ├── generators-asm/      (all procedural sound generators)
    │   ├── fireGenerator.ts
    │   ├── explosionGenerator.ts
    │   ├── thrusterGenerator.ts
    │   └── ...etc
    └── __tests__/
```

### Future Architecture (Phase 2+)

When implementing Phase 2, we would add:

```
src/core/
├── sound/                   (current AudioWorklet implementation)
├── sound-modern/           (TODO: modern service with mixing + music)
│   ├── service.ts
│   ├── mixer.ts
│   ├── musicPlayer.ts
│   ├── soundEngine.ts
│   ├── audioOutput.ts
│   ├── worklet/
│   │   └── mixerProcessor.worklet.ts
│   ├── types.ts
│   └── index.ts
└── sound-shared/           (shared by both implementations)
```

### Phase 1: Upgrade Current Service to AudioWorklet ✅ COMPLETE

**Goal**: Migrate current service to use AudioWorklet

**Completed Work**:

- ✅ Created `sound-shared/` directory with all shared code (generators, constants, utilities)
- ✅ Replaced ScriptProcessorNode with AudioWorkletNode in `audioOutput.ts`
- ✅ Created `worklet/basicProcessor.worklet.ts` with all audio processing in audio rendering thread
- ✅ Used Vite's `?worker&url` import pattern to bundle worklet with TypeScript and dependencies
- ✅ Implemented onEnded callback support for discrete sounds
- ✅ **Kept exact same behavior**: single sound, priority-based
- ✅ **Kept exact same API**: all existing methods unchanged
- ✅ No mixing, no music - just modernized internals
- ✅ Fixed unmute issue where continuous sounds weren't restarting
- ✅ Integrated into game and verified all sounds work correctly
- ✅ All 590 tests passing

**Result**: Drop-in replacement using modern, non-deprecated Web Audio APIs. The old ScriptProcessorNode-based implementation has been removed.

### Phase 2: Create Modern Service (TODO)

**Goal**: Build modern service in `sound-modern/` with mixing + music

**Remaining Work**:

- Create `sound-modern/` directory
- Implement new `service.ts` with `SoundService` interface
- All existing methods work identically
- **Plus** new music methods (ModernSoundService type)
- **Plus** multi-channel mixing for SFX
- Create `mixer.ts` component
- Create `musicPlayer.ts` component
- Create `worklet/mixerProcessor.worklet.ts`
- Update imports to use `sound-shared/`

**Note**: The current `sound/` directory now contains the AudioWorklet-based implementation and serves as the foundation for the modern service.

### Phase 3: Selection Mechanism (TODO)

When Phase 2 is complete, each directory would export its own factory:

```typescript
// src/core/sound/index.ts
export { createSoundService }
export type { SoundService }

// src/core/sound-modern/index.ts
export { createModernSoundService }
export type { ModernSoundService }

// Usage in game code:
import { createSoundService } from '@/core/sound'
// OR (for new features)
import { createModernSoundService } from '@/core/sound-modern'
```

Could add a top-level selector if desired:

```typescript
// Optional convenience wrapper
export type SoundServiceType = 'basic' | 'modern'

export async function createSoundService(
  initialSettings: { volume: number; muted: boolean },
  type: SoundServiceType = 'modern'
): Promise<SoundService> {
  if (type === 'basic') {
    return (await import('./sound')).createSoundService(initialSettings)
  } else {
    return (await import('./sound-modern')).createModernSoundService(
      initialSettings
    )
  }
}
```

## Detailed Architecture

### Multi-Channel Mixer (Modern Service Only)

```
Mixer Architecture:
┌─────────────────────────────────────┐
│ Mixer (up to 8 simultaneous sounds) │
├─────────────────────────────────────┤
│ Channel 1: SFX (game sounds)        │
│ Channel 2: SFX (game sounds)        │
│ Channel 3: SFX (game sounds)        │
│ ...                                 │
│ Channel 7: SFX (game sounds)        │
│ Channel 8: Background Music         │
└─────────────────────────────────────┘
         ↓ (mix all channels)
    AudioWorklet Output
```

**Channel Management**:

- 7 channels for SFX (game sounds)
- 1 dedicated channel for background music
- Each channel has own buffer manager + generator
- Mixer combines all active channels (simple addition)
- Auto-cleanup: channels release when sound ends

**Priority System Evolution**:

- Keep existing priority for **backward compatibility**
- Change behavior: priority now determines **channel selection** instead of blocking
- High-priority sound can claim channel from lower-priority sound
- Multiple copies of same sound can play if channels available
- Falls back to current blocking behavior if all channels busy

### Background Music Support (Modern Service Only)

**New Service Methods** (backward compatible additions):

```typescript
// Extends SoundService interface
export type ModernSoundService = SoundService & {
  // New methods - don't break existing API
  playBackgroundMusic(
    trackId: string,
    options?: {
      loop?: boolean
      fadeIn?: number // ms
      volume?: number // 0-1, independent of SFX volume
    }
  ): void

  stopBackgroundMusic(options?: {
    fadeOut?: number // ms
  }): void

  setBackgroundMusicVolume(volume: number): void
}
```

**Music System**:

- Dedicated channel 8 (never used for SFX)
- Support for loading audio files (OGG)
- Independent volume control
- Crossfade support for smooth transitions
- Optional loop mode
- Music files stored in assets folder

### AudioWorklet Implementation

Both worklets will:

- Run in audio rendering thread (better performance)
- Receive messages from main thread (play, stop, volume)
- Generate samples using existing generator code
- Post messages back (sound ended callbacks)

**Basic Worklet** (for original service):

- Single channel
- Priority-based blocking
- Exact current behavior

**Mixer Worklet** (for modern service):

- 8 channels (7 SFX + 1 music)
- Mix all active channels
- Priority determines channel allocation

## Benefits of This Approach

1. **Incremental Risk**: Upgrade existing service first, verify stability
2. **Easy Comparison**: Can A/B test original vs modern
3. **Backward Compatible**: Original behavior always available
4. **Code Reuse**: Both share generators, buffer logic, constants
5. **Clean Separation**: Easy to understand which is which

## Implementation Phases

### Phase 1: AudioWorklet Migration (Foundation) ✅ COMPLETE

**Completed**:

- ✅ Created `worklet/basicProcessor.worklet.ts`
- ✅ Migrated buffer manager logic to worklet
- ✅ Updated `audioOutput.ts` to use AudioWorkletNode
- ✅ All 590 tests passing
- ✅ Full backward compatibility maintained
- ✅ Integrated into game and verified working

### Phase 2: Multi-Channel Mixer

- Build `mixer.ts` component
- Create `worklet/mixerProcessor.worklet.ts`
- Implement channel allocation
- Update priority system to use channels
- Create `serviceModern.ts`
- **Ensure backward compatibility**

### Phase 3: Background Music

- Create `musicPlayer.ts`
- Add music channel to mixer
- Implement file loading (OGG)
- Add fade in/out
- Add new service methods to `serviceModern.ts`

## Testing Strategy

**Critical**: Existing tests must pass after each phase

- Unit tests for mixer
- Integration tests for multi-sound playback
- Backward compatibility tests (run existing game, verify no regressions)
- Performance tests (worklet shouldn't add latency)

## Files to Create/Modify

### Phase 0: Shared Code Extraction ✅ COMPLETE

**Completed**:

- ✅ Created `src/core/sound-shared/constants.ts`
- ✅ Created `src/core/sound-shared/sampleGenerator.ts`
- ✅ Created `src/core/sound-shared/formatConverter.ts`
- ✅ Moved `src/core/sound-shared/generators-asm/` (all 13 generators)
- ✅ Moved shared tests to `src/core/sound-shared/__tests__/`

### Phase 1: AudioWorklet Service Files ✅ COMPLETE

**Completed in `sound/` directory**:

- ✅ `src/core/sound/service.ts` (upgraded for worklet)
- ✅ `src/core/sound/soundEngine.ts` (updated imports)
- ✅ `src/core/sound/audioOutput.ts` (upgraded to AudioWorkletNode)
- ✅ `src/core/sound/bufferManager.ts` (kept for compatibility)
- ✅ `src/core/sound/types.ts` (updated)
- ✅ `src/core/sound/worklet/basicProcessor.worklet.ts` (new - runs in audio thread)
- ✅ `src/core/sound/worklet/worklet.d.ts` (new - TypeScript definitions)
- ✅ `src/core/sound/index.ts` (exports)
- ✅ `src/core/sound/__tests__/` (all tests passing)

### Phase 2: Modern Service Files

New directory `sound-modern/` with:

- `src/core/sound-modern/service.ts` (new - extends SoundService)
- `src/core/sound-modern/mixer.ts` (new)
- `src/core/sound-modern/musicPlayer.ts` (new)
- `src/core/sound-modern/soundEngine.ts` (new - mixer-aware)
- `src/core/sound-modern/audioOutput.ts` (new - mixer output)
- `src/core/sound-modern/types.ts` (new - ModernSoundService type, etc.)
- `src/core/sound-modern/worklet/mixerProcessor.worklet.ts` (new)
- `src/core/sound-modern/index.ts` (new - exports)
- `src/core/sound-modern/__tests__/` (new - tests for mixer/music)

### Phase 3: Integration ✅ COMPLETE (for Phase 1)

**Completed**:

- ✅ Updated `src/game/store.ts` to use `@/core/sound`
- ✅ Updated `src/game/soundListenerMiddleware.ts` to use `@/core/sound`
- ✅ Updated `src/game/main.tsx` to use `@/core/sound`
- ✅ Updated `src/dev/components/SoundTestPanel.tsx` to use `@/core/sound`
- ✅ All game sounds verified working
- ✅ Fixed unmute issue for continuous sounds

### Cleanup ✅ COMPLETE (for Phase 1)

**Completed**:

- ✅ Removed old ScriptProcessorNode-based implementation
- ✅ All imports updated to use AudioWorklet-based system
- ✅ All 590 tests passing
- ✅ 4,943 lines of deprecated code removed
