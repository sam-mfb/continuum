# Sound System Architecture

This document describes the complete flow of the sound system in Continuum, from game launch through cleanup.

## Overview

The sound system uses the Mac Sound Driver (deprecated API) with a VBL (Vertical Blanking) interrupt handler that generates waveforms 60 times per second. It implements a priority-based system to manage concurrent sound requests.

### Core Playback Mechanism

The sound system operates on a fixed-rate, real-time generation model:

- **Timing**: VBL interrupt fires at exactly 60 Hz (every 1/60th second)
- **Buffer Size**: Each interrupt generates exactly 370 bytes of audio data
- **Sample Rate**: 370 bytes × 60 Hz = 22,200 samples/second (22.2 kHz)
- **Format**: 8-bit unsigned audio (0x80 = silence/center)

This means:

1. Every 16.67 milliseconds, a new 370-byte buffer must be generated
2. Sound generation must complete quickly to avoid missing the next interrupt
3. Even silence requires generating 370 bytes of 0x80 values
4. The system is completely deterministic - no variable buffer sizes or timing

This fixed-rate architecture is why all sound generation functions are heavily optimized with assembly code - they must reliably produce 370 bytes of waveform data within the tight timing constraints of the VBL interrupt.

## Game Launch Flow

### 1. Initial Entry Point

- **main()** (Well.c:29) - True entry point
  - Calls **get_environment()** (Well.c:48) to determine machine type
  - Calls **main_2()** (Main.c:56) after environment setup

### 2. Main Game Loop Setup

- **main_2()** (Main.c:56) - Main game loop
  - Calls **init()** (Main.c:60) for global initialization

### 3. Global Sound Initialization

- **init()** (Main.c:89) - Global initialization
  - Calls **get_sine_wave()** (Main.c:939) - Loads sine wave table from resources
  - Calls **init_sound()** (Main.c:1090) - Initializes random noise arrays for sound effects

## Game Start Flow

### 4. Sound System Activation

When gameplay begins via **game()** (Main.c:654) or **do_cartoon()** (Main.c:699):

- Calls **open_sound()** (Sound.c:527) - Main sound system initialization that performs two core operations:

  **1. Memory Buffer Setup**

  - Checks system sound volume to determine if sound is enabled
  - Allocates/locates a 370-byte buffer for waveform data:
    - Mac Plus: Uses hard-coded memory location `HARDSNDBUF` at `MemTop - 0x300` (Sound.c:541)
    - Mac II: Dynamically allocates `FFSynthRec` structure (Sound.c:546)
  - Result: `soundbuffer` pointer references where waveforms will be generated

  **2. VBL Task Setup**

  - Creates VBL task record pointing to **do_sound()** function (Sound.c:554-556)
  - Configures task to run at 60Hz during vertical blanking interrupts
  - Calls **show_sound()** to install the VBL task via `VInstall()`
  - Result: **do_sound()** will be automatically called every screen refresh

- Calls **hide_sound()** (Sound.c:583) initially to prevent sounds during loading

### 5. Level Play Loop

(Main.c:675-684)

- **get_planet()** loads level data
- **show_sound()** (Sound.c:594) - Activates VBL interrupt handler
- **planet()** - Main gameplay (from Play.c)
- **hide_sound()** (Sound.c:583) - Deactivates sound between levels

## During Gameplay

### 6. Sound Triggering

Gameplay events trigger sounds by calling **start_sound()** (Sound.c:461):

- Takes a sound type constant (e.g., `FIRE_SOUND`, `THRU_SOUND`)
- Uses priority system to determine if new sound should override current (Sound.c:465)
- Sets up sound-specific parameters (frequency, amplitude, etc.) (Sound.c:469-519)
- Example triggers:
  - Level transitions: `FIZZ_SOUND` and `ECHO_SOUND` (Play.c:1248,1250)
  - Ship actions: `FIRE_SOUND`, `THRU_SOUND`, `SHLD_SOUND`
  - Collisions: `EXP1_SOUND`, `EXP2_SOUND`, `EXP3_SOUND`

### 7. Sound Generation (VBL Interrupt)

**do_sound()** (Sound.c:92) - Called by VBL interrupt 60 times/second:

- Sets up A5 register for interrupt context (Sound.c:94)
- Checks soundlock to avoid interrupt conflicts (Sound.c:96)
- Calls appropriate sound generation function based on `currentsound` (Sound.c:97)
  - The function writes waveform data to `soundbuffer`
- Platform-specific playback:
  - **Mac Plus**: No action needed - hardware automatically plays whatever is in the buffer
  - **Mac II**: Explicitly calls `StartSound(synthptr, SNDBUFLEN*2, NULL)` to send buffer to Sound Driver (Sound.c:100)
- Reschedules itself for next VBL by setting `taskrec.vblCount = 1` (Sound.c:101)
- Restores A5 register (Sound.c:103)

This design isolates platform differences in `do_sound()`, allowing the sound generation functions to be platform-agnostic - they just write waveform data to `soundbuffer` without needing to know how it will be played.

### 8. Sound Generation Functions

Each sound type has its own waveform generation function that must meet strict real-time constraints:

**Requirements for ALL sound functions:**

1. **Generate EXACTLY 370 bytes** of waveform data
2. **Write to buffer** starting at `soundbuffer` pointer
3. **Complete in < 16.67ms** before the next VBL interrupt

**Consequences of failure:**

- Too few bytes: Garbage/old data plays at the end
- Too many bytes: Buffer overflow, memory corruption
- Too slow: Next VBL fires during generation, causing audio glitches

**Implementation details:**

- All written in optimized assembly for speed
- Use techniques like `movep.l` for fast memory moves
- Unrolled loops to minimize overhead
- Careful register allocation to avoid memory access

**The sound generation functions:**

- **do_fire_sound()** (Sound.c:124) - Ship firing, uses sine wave with decreasing frequency
- **do_thru_sound()** (Sound.c:179) - Thrust sound, uses random noise patterns
- **do_expl_sound()** (Sound.c:153) - Explosions, uses random pulses with fading amplitude
- **do_bunk_sound()** (Sound.c:208) - Bunker sounds, square waves with changing period
- **do_shld_sound()** (Sound.c:236) - Shield sound, alternating tones
- **do_fuel_sound()** (Sound.c:248) - Fuel pickup, series of beeps
- **do_crack_sound()** (Sound.c:271) - Mission complete sound
- **do_fizz_sound()** (Sound.c:299) - Planet transition effect
- **do_echo_sound()** (Sound.c:330) - Echo effect after level completion
- **do_no_sound()** (Sound.c:107) - Silence, fills buffer with 0x80 values

## Game End Flow

### 9. Cleanup

**game()** cleanup (Main.c:685-694):

- **normal_screen()** (Play.c:1157) - Restores screen state
- **close_sound()** (Sound.c:561) - Complete sound cleanup:
  - Calls **hide_sound()** to remove VBL task
  - Restores sound hardware state
  - Deallocates buffers

### 10. Return to Main Loop

Returns to **main_2()** which either:

- Goes back to title screen (`NEXTTITLE`)
- Exits via **ExitToShell()** (Main.c:84)

## Key Design Elements

### Sound Buffer

- 370-byte buffer (`SNDBUFLEN`) for waveform data (Sound.c:17)
- Double-buffered for Mac II using FFSynthRec structure
- Direct hardware access for Mac Plus

### Priority System

Priority values defined in Sound.c:19-31:

- `NO_PRIOR`: 0 (no sound)
- `SOFT_PRIOR`: 30
- `THRU_PRIOR`: 35
- `BUNK_PRIOR`: 40
- `EXP3_PRIOR`: 50 (alien explosion)
- `FIRE_PRIOR`: 70
- `SHLD_PRIOR`: 70
- `FUEL_PRIOR`: 80
- `EXP1_PRIOR`: 90 (bunker explosion)
- `CRACK_PRIOR`: 92
- `FIZZ_PRIOR`: 93
- `ECHO_PRIOR`: 94
- `EXP2_PRIOR`: 100 (ship explosion - highest priority)

### Priority Decay System

The sound system implements a priority decay mechanism that allows sounds of the same type to interrupt each other after a brief delay. This creates the rapid-fire sound effects characteristic of intense combat.

**How it works:**

- When a sound starts playing, it has its initial priority (e.g., BUNK_PRIOR = 40)
- Each VBL interrupt (60Hz), certain sounds decay their priority
- New sounds can only play if their priority is **greater than** the current priority (Sound.c:465)
- This means after one VBL tick, a decayed sound can be interrupted by the same sound type

**Sounds with priority decay:**

- **FIRE_SOUND**: Decays by 5 per VBL (Sound.c:148) - allows rapid ship firing sounds
- **BUNK_SOUND**: Decays by 1 per VBL (Sound.c:230) - enables machine-gun effect
- **SOFT_SOUND**: Decays by 1 per VBL (Sound.c:230) - uses same function as BUNK_SOUND
- **EXP1_SOUND**: Decays by 2 per VBL (Sound.c:174 with ampchange from Sound.c:490)
- **EXP3_SOUND**: Decays by 3 per VBL (Sound.c:174 with ampchange from Sound.c:500)

**Sounds WITHOUT decay (stay at constant priority):**

- **EXP2_SOUND**: Ship explosion never decays (Sound.c:173-174 checks for this specifically)
- **THRU_SOUND**: Continuous thrust sound (Sound.c:179-206 has no decay)
- **SHLD_SOUND**: Shield sound (Sound.c:236-246 has no decay)
- **FUEL_SOUND**: Fuel pickup beeps (Sound.c:248-256 has no decay)
- **CRACK_SOUND**: Mission complete (Sound.c:271-296 has no decay)
- **FIZZ_SOUND**: Level transition (Sound.c:299-326 has no decay)
- **ECHO_SOUND**: Echo effect (Sound.c:330-365 has no decay)

**Example timing:**

For bunker sounds on a level with many bunkers:

- Frame 0: Bunker fires, BUNK_SOUND plays at priority 40
- VBL tick 1 (1/60 second): Priority decays to 39
- Frame 1 (1/20 second): New bunker fires, BUNK_SOUND at priority 40 interrupts (40 > 39)
- Result: Up to 40 bunker sounds per second can be heard (limited by decay rate)

This decay system is crucial for creating the intense audio feedback during combat, particularly on levels with many bunkers where the rapid-fire sound effect enhances the feeling of being under heavy fire.

### Machine-Specific Handling

- Mac Plus: Uses hard-coded memory addresses and direct hardware control
- Mac II: Uses Sound Driver with FFSynthRec for compatibility
- SE/30: Treated specially for performance optimization

### Interrupt Safety

- `soundlock` variable prevents concurrent modification (Sound.c:49,96,464,521)
- VBL task remains installed between levels but is temporarily disabled
- Sound generation happens in interrupt context, requiring careful timing

## Technical Notes

1. The system uses deprecated Sound Driver API (as noted in Sound.c:6-9)
2. Waveforms are generated in real-time during VBL interrupts
3. Sound is initialized once per game session, not per level
4. The sine wave table is loaded from resources, not generated
5. Random noise arrays are pre-generated during initialization for performance
