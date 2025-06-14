# Sound System Migration Plan

This document outlines the phased approach to replace the current sound engine with a new 370-byte buffer-based system that faithfully replicates the original Mac game's audio architecture.

## Overview

The new system will generate 370-byte chunks of 8-bit unsigned audio data at 22.2kHz, maintaining compatibility with the original game's sound generation while adapting to modern browser audio APIs.

## Phase 1: Strip Down to Redux Framework

**Goal**: Remove existing engine while keeping Redux integration and UI connections

**Tasks**:
1. Keep `soundSlice.ts` and `constants.ts` intact
2. Gut `soundEngine.ts` - just leave shell class with start/stop methods
3. Simplify `soundManager.ts` to just Redux bridge (no audio logic)
4. Keep `types.ts` but remove any audio-specific types we won't need
5. Update tests to pass with minimal functionality

**Deliverable**: App still runs, sound UI works, but no actual audio

## Phase 2: Implement Core Buffer System

**Goal**: Build the 370-byte generator and buffer system with mock data

**New modules to create**:
- `bufferManager.ts` - Manages the ring buffer and byte tracking
- `sampleGenerator.ts` - Generates 370-byte chunks (mock functions initially)
- `formatConverter.ts` - Converts 8-bit unsigned to float32

**Mock generators**:
- Sine wave at 440Hz
- White noise
- Silence (all 0x80)

**Key interfaces**:
```typescript
interface SampleGenerator {
  generate370Bytes(): Uint8Array;
}

interface BufferManager {
  fillBuffer(samplesNeeded: number): Float32Array;
}
```

**Deliverable**: System generates and buffers audio, plays test tones

## Phase 3: Testing Suite

**Goal**: Verify conversions and timing without browser dependency

**Test modules**:
1. **Format conversion tests** (`formatConverter.test.ts`)
   - 8-bit to float conversion accuracy
   - Verify 0x80 → 0.0, 0xFF → 1.0, 0x00 → -1.0

2. **Buffer management tests** (`bufferManager.test.ts`)
   - Verify proper 370-byte chunk generation
   - Test buffer wraparound
   - Verify no sample drops or duplicates

3. **Timing tests** (`timing.test.ts`)
   - Verify 16.67ms = 370 samples at 22.2kHz
   - Test sample count tracking
   - Verify frame boundaries

4. **Integration tests**
   - Mock time progression and verify output

**Deliverable**: Comprehensive test suite that runs in Node

## Phase 4: Port Original Generators

**Goal**: Implement the actual sound generation functions from Sound.c

**Tasks**:
1. Create `generators/` directory with one file per sound type:
   - `fireSound.ts` - Port `do_fire_sound()`
   - `thrustSound.ts` - Port `do_thru_sound()`
   - `explosionSound.ts` - Port `do_expl_sound()`
   - `explosionSound2.ts` - Port `do_expl_sound()` for EXP2_SOUND variant
   - `explosionSound3.ts` - Port `do_expl_sound()` for EXP3_SOUND variant
   - `bunkerSound.ts` - Port `do_bunk_sound()`
   - `softSound.ts` - Port `do_bunk_sound()` for SOFT_SOUND variant
   - `shieldSound.ts` - Port `do_shld_sound()`
   - `fuelSound.ts` - Port `do_fuel_sound()`
   - `crackSound.ts` - Port `do_crack_sound()`
   - `fizzSound.ts` - Port `do_fizz_sound()`
   - `echoSound.ts` - Port `do_echo_sound()`
   - `noSound.ts` - Port `do_no_sound()`

2. Port the lookup tables:
   - Sine wave table (from resources)
   - Random noise arrays (expl_rands, thru_rands, hiss_rands)
   - Any other data tables

3. Create `generatorFactory.ts` to manage switching between generators

4. Integration with the buffer system

**Deliverable**: Full sound system with all original sounds

## Architecture Principles

### Loose Coupling
- Generators don't know about buffers
- Buffers don't know about Web Audio
- Format conversion is a separate pure function
- Sound type management separate from generation

### Browser/Node Agnostic (where possible)
- Core buffer logic uses only TypedArrays
- Generators are pure functions
- Only the final `audioOutput.ts` knows about Web Audio
- Tests can run in Node without audio context

### Testability
- Each component can be tested in isolation
- Time can be mocked for deterministic tests
- No audio context needed for most tests
- Generator output can be verified byte-by-byte

## Implementation Notes

### Buffer Management Strategy
The system will maintain a ring buffer of generated samples:
- When browser requests N samples, generate ceil(N/370) * 370 bytes
- Keep unused samples for next request
- Track position in both 370-byte chunks and output samples

### Sample Rate Handling
- Generate at 22.2kHz (original rate)
- Let AudioContext handle resampling to system rate (typically 48kHz)
- No manual interpolation needed initially

### State Management
- Current sound type (from Redux)
- Current position in 370-byte chunk
- Buffer fill level
- Per-sound state (frequencies, counters, etc.)

## Success Criteria

1. **Accuracy**: Sounds match original game exactly
2. **Performance**: No audio glitches or dropouts
3. **Maintainability**: Clear separation of concerns
4. **Testability**: >90% test coverage without browser
5. **Compatibility**: Works in all modern browsers