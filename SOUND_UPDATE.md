# Sound Service Upgrade Proposal

## Current Issues

1. **Deprecated API**: Uses `ScriptProcessorNode` (deprecated) instead of `AudioWorkletNode` (audioOutput.ts:156)
2. **No Sound Mixing**: Single-channel architecture with priority system prevents simultaneous sounds
3. **No Background Music**: No support for continuous background music tracks

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

### Two Sound Service Implementations

Organize into separate directories to keep original and modern services completely isolated:

```
src/core/
├── sound-original/
│   ├── service.ts           (current service upgraded to worklet)
│   ├── soundEngine.ts
│   ├── audioOutput.ts
│   ├── bufferManager.ts
│   ├── worklet/
│   │   └── basicProcessor.worklet.ts
│   ├── types.ts
│   └── index.ts            (exports createSoundService)
│
├── sound-modern/
│   ├── service.ts          (modern service with mixing + music)
│   ├── mixer.ts
│   ├── musicPlayer.ts
│   ├── soundEngine.ts
│   ├── audioOutput.ts
│   ├── worklet/
│   │   └── mixerProcessor.worklet.ts
│   ├── types.ts
│   └── index.ts            (exports createModernSoundService)
│
└── sound-shared/
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

### Phase 1: Upgrade Current Service to AudioWorklet

**Goal**: Migrate current service to `sound-original/` with AudioWorklet

- Create `sound-original/` directory
- Copy current implementation (service, soundEngine, audioOutput, bufferManager, types)
- Replace ScriptProcessorNode with AudioWorkletNode in `audioOutput.ts`
- Create `worklet/basicProcessor.worklet.ts`
- **Keep exact same behavior**: single sound, priority-based
- **Keep exact same API**: all existing methods unchanged
- No mixing, no music - just modernized internals
- Update imports to use `sound-shared/`

**Result**: Drop-in replacement with better performance

### Phase 2: Create Modern Service

**Goal**: Build modern service in `sound-modern/` with mixing + music

- Create `sound-modern/` directory
- Implement new `service.ts` with `SoundService` interface
- All existing methods work identically
- **Plus** new music methods (ModernSoundService type)
- **Plus** multi-channel mixing for SFX
- Create `mixer.ts` component
- Create `musicPlayer.ts` component
- Create `worklet/mixerProcessor.worklet.ts`
- Update imports to use `sound-shared/`

### Phase 3: Selection Mechanism

Each directory exports its own factory:

```typescript
// src/core/sound-original/index.ts
export { createSoundService }
export type { SoundService }

// src/core/sound-modern/index.ts
export { createModernSoundService }
export type { ModernSoundService }

// Usage in game code:
import { createSoundService } from '@/core/sound-original'
// OR
import { createModernSoundService } from '@/core/sound-modern'
```

Could add a top-level selector if desired:

```typescript
// src/core/sound/index.ts (optional convenience wrapper)
export type SoundServiceType = 'original' | 'modern'

export async function createSoundService(
  initialSettings: { volume: number; muted: boolean },
  type: SoundServiceType = 'modern'
): Promise<SoundService> {
  if (type === 'original') {
    return (await import('./sound-original')).createSoundService(initialSettings)
  } else {
    return (await import('./sound-modern')).createModernSoundService(initialSettings)
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

### Phase 1: AudioWorklet Migration (Foundation)

- Create `worklet/basicProcessor.worklet.ts`
- Migrate buffer manager logic to worklet
- Update `audioOutput.ts` to use AudioWorkletNode
- **Ensure all existing tests pass**
- **Ensure backward compatibility**

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

### Phase 0: Shared Code Extraction

Move existing shared code to `sound-shared/`:

- `src/core/sound-shared/constants.ts` (move from `sound/constants.ts`)
- `src/core/sound-shared/sampleGenerator.ts` (move from `sound/sampleGenerator.ts`)
- `src/core/sound-shared/formatConverter.ts` (move from `sound/formatConverter.ts`)
- `src/core/sound-shared/generators-asm/` (move entire directory from `sound/generators-asm/`)
- `src/core/sound-shared/__tests__/` (move shared tests)

### Phase 1: Original Service Files

New directory `sound-original/` with:

- `src/core/sound-original/service.ts` (copy from `sound/service.ts`, update for worklet)
- `src/core/sound-original/soundEngine.ts` (copy from `sound/soundEngine.ts`)
- `src/core/sound-original/audioOutput.ts` (copy from `sound/audioOutput.ts`, upgrade to worklet)
- `src/core/sound-original/bufferManager.ts` (copy from `sound/bufferManager.ts`)
- `src/core/sound-original/types.ts` (copy from `sound/types.ts`)
- `src/core/sound-original/worklet/basicProcessor.worklet.ts` (new)
- `src/core/sound-original/index.ts` (new - exports)
- `src/core/sound-original/__tests__/` (copy and update existing tests)

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

### Phase 3: Integration

- Update `src/game/store.ts` to import from `sound-original` or `sound-modern`
- Update `src/game/soundListenerMiddleware.ts` if needed
- Update any other files importing from `src/core/sound/`

### Cleanup (After All Phases)

- Remove old `src/core/sound/` directory entirely
- Verify all imports updated
- Verify all tests pass
