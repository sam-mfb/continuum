# Continuum Sound System Architecture

This directory contains a faithful recreation of the original Continuum (1986 Mac game) sound system, implemented in TypeScript for modern web browsers.

## Overview

The original Continuum used the Mac's Sound Driver to generate real-time audio through a clever 370-byte buffer system. (See arch/SOUND.md)

This implementation recreates that system using the Web Audio API while maintaining the exact sound characteristics of the original game.

To do this it needs to handle the fact the original samples were 8bit and that they were generated in the unusual chunk size of 370 bytes, i.e., 370 samples per chunk. Modern APIs typically expect higher preceision and powers of 2. The precision is a simple conversion to floats. The sample size mismatch is solved by a ring buffer that allows for reads and writes to have different chunk sizes. (In essence the buffer generates and holds extra data ahead of what might need to be read.)

My ear isn't very good, so while I _think_ these capture the original sounds, I'm not positive. There could be an error in the machine code translation somewhere.

## Architecture

### Core Components

#### 1. **Sound Manager** (`soundManager.ts`)

- Top-level interface for the application
- Handles initialization and lifecycle management
- Provides simple start/stop controls

#### 2. **Sound Engine** (`soundEngine.ts`)

- Central coordinator for the sound system
- Manages generator switching and audio pipeline
- Handles volume control and sound selection [TODO: Volume control not working currently]
- Special handling for sound sequences (e.g., fizz+echo)

#### 3. **Audio Output** (`audioOutput.ts`)

- Interfaces with the Web Audio API
- Uses ScriptProcessorNode for real-time audio generation [TODO: This API is deprecated so will need to move]
- Handles format conversion (8-bit unsigned to float32)
- Manages timing and performance monitoring

#### 4. **Buffer Manager** (`bufferManager.ts`)

- Implements a circular buffer system
- Manages read/write positions
- Handles buffer underruns gracefully
- Ensures smooth audio playback

#### 5. **Sample Generator Interface** (`sampleGenerator.ts`)

- Defines the contract for all sound generators
- Each generator produces 370-byte chunks of 8-bit unsigned audio
- Matches the original game's buffer size

### Sound Generators (`generators/`)

Each generator recreates a specific sound from the original game:

- **thrusterGenerator.ts** - Ship thruster noise
- **shieldGenerator.ts** - Shield activation sound
- **explosionGenerator.ts** - Three explosion types (bunker, ship, alien)
- **fuelGenerator.ts** - Fuel pickup beeps
- **fireGenerator.ts** - Player firing sound ("pew")
- **bunkerGenerator.ts** - Bunker firing sound (two variants)
- **crackGenerator.ts** - Unused crackling sound
- **fizzGenerator.ts** - Planet dissolution effect
- **echoGenerator.ts** - Echo effect after planet completion

### Data Files

- **sineTableData.ts** - 256-byte sine wave lookup table from original Mac resource fork
- **hissRandsData.ts** - Pseudo-random data for noise generation [TODO: get this from the resource fork]

## Technical Details

### Original System Specifications

- **Sample Rate**: 22.2kHz (Mac's default)
- **Sample Format**: 8-bit unsigned (0-255, center at 128)
- **Buffer Size**: 370 bytes per chunk
- **Update Rate**: ~60Hz (tied to vertical blank interrupt)

### Implementation Strategy

1. **Faithful Assembly Translation**

   - Each generator closely follows the original 68K assembly code
   - Preserves timing, amplitude calculations, and pattern generation
   - Maintains original quirks and behaviors

2. **Buffer Management**

   - Circular buffer prevents audio glitches
   - Generators produce chunks ahead of playback
   - Graceful handling of underruns

3. **Format Conversion**
   - Generators produce 8-bit unsigned samples (0-255)
   - Converted to float32 (-1.0 to 1.0) for Web Audio
   - Preserves original sound characteristics

### Sound Generation Patterns

Most sounds follow one of these patterns:

1. **Tone-based** (fuel, shield)

   - Use sine wave lookup table
   - Phase accumulator for frequency control

2. **Noise-based** (crack, fizz, echo)

   - Use pre-generated random period tables
   - Alternate between two amplitude values
   - Period determines duration at each amplitude

3. **Mixed** (explosions, thruster)
   - Combine random periods with amplitude envelopes
   - Create complex timbres

## Usage

```typescript
import { soundManager } from './sound'

// Initialize and start
soundManager.start()

// Change volume
soundManager.setVolume(0.5)

// Access the engine for sound selection
const engine = soundManager.getEngine()
engine.playTestSound('explosionShip')

// Stop all sounds
soundManager.stop()
```

## Testing

The system includes:

- Unit tests for each component
- Integration tests for the full pipeline
- Manual testing interface (`SoundTestPanel`)
- Performance benchmarking tools

## Historical Accuracy

This implementation prioritizes accuracy to the original game:

- Exact buffer sizes and timing
- Faithful amplitude and frequency calculations
- Preservation of original algorithms
- Matching sound priorities and interruption behavior

The goal is to make the sounds indistinguishable from the original 1986 Mac version.

## Note on ASM code reconstructions

I used LLMs to help with this. One thing I learned is that current models (June 2025) will do better if you first have them translate the assembly line by line to something modern and then try to understand what is going on. If you just ask them to explain what the assembly is doing without the interim step, they make more mistakes.
