# Thrust Sound Implementation Analysis

This document provides a detailed comparison between the original 68k assembly implementation of the thrust sound and our JavaScript recreation.

## Original Implementation

### 1. VBL Sound Generation - do_thru_sound() (Sound.c:179-206)

```c
do_thru_sound()
{
    register char *pers;
    register int count;
    
    pers = thru_rands + (Random() & 63);  // Start at random position in lookup table
    asm {
            move.l  soundbuffer(A5), A0      ; A0 = destination buffer
            move.w  #SNDBUFLEN/37-1, count   ; count = 9 (10 iterations of 37 bytes)
        @biglp  moveq   #0, D0               ; Clear D0
            move.b  (pers)+, D0              ; Get byte from thru_rands table
            lsr.w   #1, D0                   ; Logical shift right by 1
            lsl.w   #8, D0                   ; Shift left 8 (to high byte)
            move.w  D0, D1                   ; Copy to D1
            swap    D0                       ; Swap words in D0
            move.w  D1, D0                   ; Now D0 = D1:D1 (same value in both words)
            move.w  #(37-1)/6-1, D2          ; D2 = 5 (6 iterations)
        @loop   move.l  D0, (A0)+            ; Write 4 bytes
            move.l  D0, (A0)+                ; Write 4 bytes  
            move.l  D0, (A0)+                ; Write 4 bytes (total 12 bytes)
            dbf D2, @loop                    ; Loop 6 times = 36 bytes
            move.w  D0, (A0)+                ; Write final 2 bytes (total 37)
            dbf count, @biglp                ; Next chunk
    }

    if (!thrusting)
        clear_sound();
}
```

### Key Algorithm Components:

1. **Random Starting Position**: 
   - `Random() & 63` gives 0-63 starting offset in thru_rands table

2. **Value Processing**:
   - Read byte from thru_rands (64-191 range)
   - Shift right by 1: gives 32-95
   - Shift left by 8: puts in high byte of 16-bit word (8192-24320)

3. **Buffer Filling**:
   - Fills 370 bytes total (SNDBUFLEN)
   - Uses 10 chunks of 37 bytes each
   - Each chunk filled with the same value
   - Efficient filling using long word (4 byte) moves

4. **Playback Rate**:
   - 370 bytes filled per VBL tick (60Hz)
   - Effective sample rate ~11.1kHz (370 * 60 / 2 for 16-bit samples)

## Our JavaScript Implementation

### soundEngine.ts - createThrustSound()

```typescript
const createThrustSound = (): PlayableSound => {
  // Original implementation:
  // - Fills SNDBUFLEN (370) bytes per VBL tick
  // - Uses chunks of 37 bytes, each filled with same value
  // - Value comes from thru_rands table, shifted right 1, then left 8

  // Create one second buffer
  const bufferDuration = 1.0
  const sampleRate = audioContext.sampleRate
  const bufferSize = Math.floor(bufferDuration * sampleRate)

  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate)
  const channelData = buffer.getChannelData(0)

  // Start at random position in lookup table (Sound.c:184)
  const startOffset = Math.floor(Math.random() * 64) // Random() & 63

  // Original fills SNDBUFLEN/37 chunks (10 chunks of 37 bytes each)
  const chunksPerBuffer = Math.floor(SNDBUFLEN / 37)
  const bytesPerChunk = 37

  // Calculate how many samples we need
  let bufferPos = 0
  let tablePos = startOffset

  while (bufferPos < bufferSize) {
    // Process chunks like the original
    for (let chunk = 0; chunk < chunksPerBuffer && bufferPos < bufferSize; chunk++) {
      // Get value from lookup table (Sound.c:189)
      const value = thruRands[tablePos & 127] ?? 0
      tablePos++

      // Original: lsr.w #1, D0 (shift right 1)
      // Then: lsl.w #8, D0 (shift left 8 to high byte)
      // This puts the value in range 32-95 in the high byte of a 16-bit word
      const shiftedValue = (value >>> 1) << 8 // Results in 8192-24320

      // Convert to normalized audio range
      // Original uses 16-bit signed, so -32768 to 32767
      const normalized = (shiftedValue - 16384) / 32768

      // Fill this chunk with the same value
      // Calculate samples for 37 bytes at original playback rate
      // Original plays at ~11kHz (370 bytes at 60Hz)
      const originalRate = (SNDBUFLEN * 60) / 2 // Approx 11.1kHz
      const samplesPerChunk = Math.floor((bytesPerChunk * sampleRate) / originalRate)

      for (let i = 0; i < samplesPerChunk && bufferPos < bufferSize; i++) {
        channelData[bufferPos++] = normalized
      }
    }
  }

  return {
    play: (): AudioBufferSourceNode => {
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.loop = true // Thrust sound loops
      source.connect(masterGain)
      source.start()
      return source
    }
  }
}
```

## Mapping Analysis

### 1. Random Start Position
**Original**: `pers = thru_rands + (Random() & 63)`
**Our Code**: `const startOffset = Math.floor(Math.random() * 64)`

### 2. Value Processing
**Original**: 
```asm
move.b  (pers)+, D0    ; Get byte (64-191)
lsr.w   #1, D0         ; Shift right by 1 (32-95)
lsl.w   #8, D0         ; Shift left by 8 (8192-24320)
```
**Our Code**:
```typescript
const value = thruRands[tablePos & 127]
const shiftedValue = (value >>> 1) << 8
```

### 3. Chunk Filling
**Original**: Fills 37 bytes with same value, 10 chunks = 370 bytes
**Our Code**: Calculates equivalent samples at Web Audio rate and fills chunks

### 4. Sample Rate Conversion
**Original**: 370 bytes at 60Hz = ~11.1kHz effective rate
**Our Code**: Converts chunk sizes to match Web Audio sample rate while preserving timing

## Key Insights

1. The thrust sound is much simpler than initially thought - it's just noise with repeating values
2. The "chunky" quality comes from filling 37-byte chunks with the same value
3. The randomness comes from:
   - Starting at a random position in the lookup table
   - The lookup table itself containing random values (64-191)
4. No phase accumulation or complex waveform generation is involved