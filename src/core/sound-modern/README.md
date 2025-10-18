# Modern Multi-Channel Sound System (Phase 2)

Modern implementation of the Continuum sound system using AudioWorklet with multi-channel mixing capabilities.

## Architecture

- **8 simultaneous sound channels**: Allows multiple sounds to play at once
- **AudioWorklet-based**: Audio processing runs in the audio rendering thread for low latency
- **Singleton management**: Certain sounds (thrust, shield, explosions) limited to one instance
- **Ring buffer per channel**: Each channel has its own 8192-sample ring buffer

## Key Files

- `service.ts` - Main sound service API with sound playback methods
- `mixer.ts` - Channel allocation and sound routing logic
- `audioOutput.ts` - AudioWorklet node management and Web Audio setup
- `worklet/mixerProcessor.worklet.ts` - Audio worklet that mixes all channels

## Critical Implementation Details

### 1. Ring Buffer clear() vs reset()

The ring buffer provides two methods for clearing:

- **`reset()`**: Resets positions AND fills buffer with silence (128 center value)

  - Used when stopping/clearing a channel completely
  - Ensures no garbage data in buffer
  - Slower due to memory fill operation

- **`clear()`**: Only synchronizes read/write positions
  - Used when starting a new sound (in `handlePlay`)
  - Immediately followed by `generateChunk()` to fill with new samples
  - **Critical for zero-latency sound start** - no delay filling silence
  - Eliminates artifacts from old samples while maintaining instant playback

**Why this matters**: Using `clear()` + immediate `generateChunk()` instead of `reset()` eliminates first-sound latency and prevents old samples from playing.

### 2. Buffer Draining After Generator Ends

When a sound generator finishes (`hasEnded()` returns true), the channel behavior is critical:

```typescript
if (!channel.hasReportedEnded && channel.generator.hasEnded()) {
  channel.hasReportedEnded = true

  this.port.postMessage({...})  // Notify main thread

  // Clear generator but keep channel active so buffer can drain
  // Channel will become inactive when buffer is empty
  channel.generator = null
  channel.soundType = SoundType.NO_SOUND

  // NOTE: channel.active is NOT set to false here!
}
```

**Why this matters**:

- The ring buffer may still contain 370+ samples when generator ends
- Setting `channel.active = false` immediately would cause `process()` to skip the channel
- This truncates the sound tail, making it sound "thinner" and end "sharply"
- Keeping channel active allows the buffer to drain naturally
- Matches the original single-channel system's behavior
- Preserves the full waveform including the "thunk" at the end

### 3. Volume Control Location

Volume is **ONLY** applied via the GainNode in the main thread, **NOT** in the worklet.

```typescript
// In audioOutput.ts:
gainNode.gain.value = clampedVolume * MASTER_GAIN_SCALE

// In worklet - no volume multiplication:
for (let j = 0; j < sampleCount; j++) {
  outputChannel[j]! += channelSamples[j]! // Simple summation
}
```

**Why this matters**:

- Applying volume in worklet before mixing would distort the waveform
- Volume applied before clipping changes frequency content (removes bass)
- Original system applies volume at the final stage only
- GainNode is the proper Web Audio way to handle volume

### 4. No Clipping in Worklet

The mixer worklet does **NO** clipping of samples:

```typescript
// No clipping - matches original system behavior
// Volume and any necessary limiting handled by GainNode in main thread

// Copy to other channels if stereo
for (let channel = 1; channel < output.length; channel++) {
  output[channel]!.set(outputChannel)
}
```

**Why this matters**:

- Original single-channel system does no clipping
- Clipping alters the waveform and changes the sound character
- Web Audio's GainNode and destination handle any necessary limiting
- Preserves the natural waveform shape and frequency content

### 5. Immediate Chunk Generation on Sound Start

When a sound starts, the worklet immediately generates a chunk after setting up the generator:

```typescript
// Set up the channel
channel.generator = generator
channel.soundType = soundType
channel.active = true
channel.hasReportedEnded = false

// Clear buffer (synchronize positions without filling with silence)
// Then immediately generate new samples to eliminate latency
channel.buffer.clear()
this.generateChunk(channelId) // ← Critical for zero-latency start
```

**Why this matters**:

- Ensures buffer has samples ready for the very next `process()` callback
- Eliminates first-sound delay/latency
- Combined with `clear()` (not `reset()`), provides instant sound start
- Matches the tight timing of the original system

## Differences from Original Single-Channel System

1. **Multiple simultaneous sounds**: Original could only play one sound at a time with priority-based interruption
2. **Singleton sounds**: New concept - certain sounds limited to one instance across all channels
3. **No priority interruption**: Sounds play simultaneously instead of interrupting each other
4. **Channel allocation**: Dynamic channel selection using oldest-available strategy

## Testing

Use `SoundTestPanel` component in dev environment to test:

- Multi-instance sounds (fire, bunker shoot, explosions)
- Singleton sounds (thrust, shield, level complete)
- Sound quality comparison with original system
- Buffer draining (listen for complete sound tail)

## Traced From

- `orig/Sources/Sound.c` - Original Macintosh sound system
- `src/core/sound/` - Phase 1 single-channel AudioWorklet implementation
