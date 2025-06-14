# Sound System Implementation Plan

## Phase 1: Core Sound Infrastructure

Following the existing patterns, create a new `sound/` module in `src/`:

### Directory Structure
```
src/sound/
├── constants.ts          # Sound type enums, priorities, and parameters
├── types.ts             # TypeScript interfaces for sound system
├── soundSlice.ts        # Redux slice for sound state management
├── waveformGenerators.ts # Functions to generate lookup tables
├── soundEngine.ts       # Core Web Audio API sound generation
└── __tests__/
    ├── waveformGenerators.test.ts
    └── soundEngine.test.ts
```

### Constants (`constants.ts`)
```typescript
// Sound types from GW.h:150-153
export enum SoundType {
  NO_SOUND = 0,
  FIRE_SOUND = 1,
  EXP1_SOUND = 2,    // Bunker explosion
  THRU_SOUND = 3,
  BUNK_SOUND = 4,
  SOFT_SOUND = 5,
  SHLD_SOUND = 6,
  FUEL_SOUND = 7,
  EXP2_SOUND = 8,    // Ship explosion
  EXP3_SOUND = 9,    // Alien explosion
  CRACK_SOUND = 10,  // Mission complete
  FIZZ_SOUND = 11,   // Planet fizz-out
  ECHO_SOUND = 12    // Echoing away
}

// Sound priorities from Sound.c:86-89
export const SOUND_PRIORITIES = {
  [SoundType.NO_SOUND]: 0,      // NO_PRIOR (Sound.c:19)
  [SoundType.FIRE_SOUND]: 70,   // FIRE_PRIOR (Sound.c:20)
  [SoundType.EXP1_SOUND]: 90,   // EXP1_PRIOR (Sound.c:21)
  [SoundType.THRU_SOUND]: 35,   // THRU_PRIOR (Sound.c:22)
  [SoundType.BUNK_SOUND]: 40,   // BUNK_PRIOR (Sound.c:23)
  [SoundType.SOFT_SOUND]: 30,   // SOFT_PRIOR (Sound.c:24)
  [SoundType.SHLD_SOUND]: 70,   // SHLD_PRIOR (Sound.c:25)
  [SoundType.FUEL_SOUND]: 80,   // FUEL_PRIOR (Sound.c:26)
  [SoundType.EXP2_SOUND]: 100,  // EXP2_PRIOR (Sound.c:27)
  [SoundType.EXP3_SOUND]: 50,   // EXP3_PRIOR (Sound.c:28)
  [SoundType.CRACK_SOUND]: 92,  // CRACK_PRIOR (Sound.c:29)
  [SoundType.FIZZ_SOUND]: 93,   // FIZZ_PRIOR (Sound.c:30)
  [SoundType.ECHO_SOUND]: 94    // ECHO_PRIOR (Sound.c:31)
};

// Original constants from GW.h:155-159
export const EXPL_LO_PER = 50;    // Lowest period in an explosion
export const EXPL_ADD_PER = 206;  // Random amount to add to above
export const THRU_LO_AMP = 64;
export const THRU_ADD_AMP = 128;

// Sound system constants from Sound.c:16-17
export const SNDBUFLEN = 370;     // Buffer length

// Additional sound-specific constants
export const FUELBEEPFREQ = 26;   // Frequency of beeps in fuel pickup (Sound.c:33)
export const SHLD_FREQ = 50;      // Frequency of shield sound (Sound.c:34)
export const FUELBEEPS = 3;       // Number of beeps in fuel pickup (GW.h:142)
```

## Phase 2: Implement Thrust Sound First

### Waveform Generators (`waveformGenerators.ts`)
```typescript
// Generate thrust random table matching original algorithm
// From Main.c:1097-1098 in init_sound()
export const generateThruRands = (): Uint8Array => {
  const thruRands = new Uint8Array(128);
  for (let i = 0; i < 128; i++) {
    // thru_rands[i] = (char) THRU_LO_AMP + rint(THRU_ADD_AMP);
    thruRands[i] = THRU_LO_AMP + Math.floor(Math.random() * THRU_ADD_AMP);
  }
  return thruRands;
};
```

### Sound Engine (`soundEngine.ts`)
Using factory/builder patterns:

```typescript
// Factory function for creating sound generators
export const createSoundEngine = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  
  // Pre-generate lookup tables
  const thruRands = generateThruRands();
  
  // Factory for thrust sound based on do_thru_sound() from Sound.c:179-206
  const createThrustSound = () => {
    // The original uses SNDBUFLEN (370 bytes) with every other byte
    const bufferSize = SNDBUFLEN * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Implement original thrust pattern from Sound.c:184-202
    // The assembly code shows:
    // - Picks random value from thru_rands using Random() & 63
    // - Shifts right by 1 (divides by 2)
    // - Shifts left by 8 (multiplies by 256 for 16-bit)
    // - Repeats each value multiple times for low frequency
    
    let bufferPos = 0;
    const persIndex = Math.floor(Math.random() * 64); // Random() & 63
    
    // Original uses SNDBUFLEN/37 iterations (Sound.c:187)
    for (let count = 0; count < Math.floor(SNDBUFLEN / 37); count++) {
      const randIndex = (persIndex + count) % 128;
      let value = thruRands[randIndex];
      
      // Original: lsr.w #1, D0 (shift right 1)
      value = value >> 1;
      
      // Convert to normalized audio range (-1 to 1)
      const normalizedValue = (value - 64) / 64;
      
      // Original repeats value 37 times (Sound.c:195-201)
      for (let repeat = 0; repeat < 37 && bufferPos < bufferSize; repeat++) {
        data[bufferPos++] = normalizedValue;
      }
    }
    
    return {
      play: () => {
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(masterGain);
        source.start();
        return source; // Return for later stopping
      }
    };
  };
  
  return {
    audioContext,
    masterGain,
    createThrustSound,
    // Add other sound factories here
  };
};
```

### Redux Slice (`soundSlice.ts`)
```typescript
interface SoundState {
  currentSound: SoundType;
  priority: number;
  enabled: boolean;
  volume: number;
  activeSource: AudioBufferSourceNode | null;
}

const initialState: SoundState = {
  currentSound: SoundType.NO_SOUND,
  priority: 0,
  enabled: true,
  volume: 0.5,
  activeSource: null
};

// Actions: startSound, stopSound, setVolume, toggleSound
```

## Phase 3: UI Integration

### Sound Test Component (`app/components/SoundTest.tsx`)
Create a simple test interface:
- List of all sound types with play/stop buttons
- Master volume control
- Sound on/off toggle
- Visual indicator of currently playing sound

### Integration into App
Add new tab/section in App.tsx similar to existing viewers:
- Add "Sound Test" to navigation
- Include SoundTest component in appropriate route/tab

## Implementation Order

1. **Create basic infrastructure**
   - Set up directory structure
   - Define constants and types
   - Create empty files with exports

2. **Implement waveform generators**
   - Write generator functions
   - Add comprehensive tests
   - Verify output matches expected ranges

3. **Build sound engine**
   - Initialize Web Audio API
   - Create thrust sound generator
   - Test audio playback

4. **Create Redux integration**
   - Implement soundSlice
   - Connect to store
   - Add sound state management

5. **Build test UI**
   - Create SoundTest component
   - Wire up to Redux
   - Add to main app

6. **Test and refine**
   - Verify thrust sound character
   - Adjust parameters to match original
   - Add remaining sounds incrementally