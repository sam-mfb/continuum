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

## Phase 2: Implement Sample Generator

**Goal**: Build the 370-byte chunk generator with unit tests

**Module**: `sampleGenerator.ts`

- Interface for generating exactly 370 bytes of 8-bit unsigned audio
- Mock implementations for testing:
  - Sine wave at 440Hz
  - White noise
  - Silence (all 0x80)
  - Musical intervals (for later browser testing)

**Unit Tests**: `sampleGenerator.test.ts`

- Verify exactly 370 bytes generated
- Verify Uint8Array type
- Verify value ranges (0-255)
- Test multiple consecutive calls
- Verify different generators produce expected patterns

**Deliverable**: Working generators with comprehensive tests

## Phase 3: Implement Format Converter

**Goal**: Build the 8-bit to float32 converter with unit tests

**Module**: `formatConverter.ts`

- Converts 8-bit unsigned (0-255) to float32 (-1.0 to 1.0)
- Bridges original Mac format (center=128) to Web Audio (center=0.0)
- Pure function, no side effects

**Unit Tests**: `formatConverter.test.ts`

- Verify 0x80 → 0.0 (silence)
- Verify 0x00 → -1.0 (min)
- Verify 0xFF → 1.0 (max)
- Test all edge cases
- Test full 370-byte array conversion
- Performance benchmarks

**Deliverable**: Working converter with full test coverage

## Phase 4: Implement Buffer Manager

**Goal**: Build the ring buffer system with unit tests

**Module**: `bufferManager.ts`

- Manages ring buffer of generated samples
- Handles misaligned requests (e.g., 512 samples from 370-byte chunks)
- Calls generator as needed
- Tracks buffer state

**Unit Tests**: `bufferManager.test.ts`

- Test various request sizes (256, 512, 1024, 333)
- Test buffer wraparound
- Test partial chunk usage
- Verify no sample drops or duplicates
- Test buffer state persistence
- Test generator switching mid-buffer

**Deliverable**: Working buffer manager with edge case coverage

## Phase 5: Integration Tests

**Goal**: Test the complete pipeline without browser

**Test Suite**: `integration.test.ts`

- Mock browser audio requests:
  - Various buffer sizes
  - Rapid consecutive requests
- Timing verification:
  - Generation under 16.67ms
  - Target under 3ms
- Data flow verification:
  - Generator → Buffer → Converter → Output
  - Correct sample counts throughout
- Continuous operation:
  - 1000+ consecutive requests
  - No memory leaks
  - Stable timing

**Deliverable**: Full system validation in Node environment

## Phase 6: Browser Integration & Manual Testing

**Goal**: Connect to Web Audio API and verify with recognizable sounds

**Tasks**:

1. Implement `audioOutput.ts` to connect buffer manager to Web Audio
2. Update `soundEngine.ts` to use new system
3. Create test page with buttons for different sounds
4. Use musical intervals for verification:
   - 440Hz (A4)
   - 880Hz (A5)
   - 220Hz (A3)
   - Major chord
   - Check pitch accuracy

**Manual Tests**:

- Verify no clicking/popping
- Verify correct pitch
- Test start/stop
- Test switching between sounds
- Monitor CPU usage

**Deliverable**: Working audio in browser with test sounds

## Phase 7: Port Original Sound Generators

**Goal**: Implement all original game sounds

**Tasks**:

1. Create `generators/` directory with one file per sound type:

   - `fireSound.ts` - Port `do_fire_sound()`
   - `thrustSound.ts` - Port `do_thru_sound()`
   - `explosionSound.ts` - Port `do_expl_sound()`
   - `bunkerSound.ts` - Port `do_bunk_sound()`
   - `shieldSound.ts` - Port `do_shld_sound()`
   - `fuelSound.ts` - Port `do_fuel_sound()`
   - `crackSound.ts` - Port `do_crack_sound()`
   - `fizzSound.ts` - Port `do_fizz_sound()`
   - `echoSound.ts` - Port `do_echo_sound()`
   - `noSound.ts` - Port `do_no_sound()`

2. Port lookup tables:

   - Sine wave table
   - Random arrays (expl_rands, thru_rands, hiss_rands)

3. Implement sound state management:

   - Per-sound parameters
   - State transitions
   - Priority system

4. Integration with game events

**Deliverable**: All original sounds working in game

## Architecture Principles

### Loose Coupling

- Generators don't know about buffers
- Buffers don't know about Web Audio
- Format conversion is a separate pure function
- Each module has a single responsibility

### Browser/Node Agnostic (where possible)

- Core modules use only TypedArrays and standard JS
- Only `audioOutput.ts` knows about Web Audio
- All tests except Phase 6 run in Node

### Testability

- Each component tested in isolation
- No audio context needed until Phase 6
- Deterministic output from generators
- Time can be mocked

## Implementation Notes

### Buffer Management Strategy

- Ring buffer with automatic wraparound
- Generate ceil(N/370) × 370 bytes for N samples
- Track both byte position and sample position
- Reuse leftover bytes from previous requests

### Sample Rate Handling

- Generate at authentic 22.2kHz
- AudioContext handles resampling to system rate
- No manual interpolation needed
- Browser's high-quality resampling is automatic

### Performance Considerations

- 370 bytes must generate in << 16.67ms
- Target < 3ms for safety margin
- Use TypedArrays for efficiency
- Minimize object allocation in hot path

### Endianness Note

- Original Mac was big-endian, but since we're working with 8-bit audio samples (1 byte each), endianness doesn't affect the audio data
- If any lookup tables or calculations use 16-bit values, we'll need to handle endianness during porting

## Success Criteria

1. **Accuracy**: Bit-identical to original generators
2. **Performance**: < 3ms generation time
3. **Reliability**: No glitches in 1hr continuous play
4. **Maintainability**: Clean module boundaries
5. **Testability**: 100% coverage without browser
