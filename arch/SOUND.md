# Sound Generation in Original Continuum

Based on analysis of the original Sound.c file, here's how sound generation worked in the original Continuum:

## Sound Generation Architecture

### 1. Hardware-Level Sound Buffer
The system wrote directly to Mac sound hardware using a 370-byte buffer:
```c
#define SNDBUFLEN 370
char *soundbuffer; /* holds free form sound description */
```
- On Mac Plus: Direct memory access at `MemTop - 0x300` (Sound.c:16)
- On Mac II: Used Sound Driver with `myFFSynthRec` structure (Sound.c:39-44)

### 2. VBL (Vertical Blank) Interrupt System
Sound generation was tied to the display refresh (60Hz):
```c
pascal void do_sound() // Sound.c:92
{
    SetUpA5();
    if (!soundlock)
        (*snd_fcns[currentsound])(); /* call appropriate sound routine */
    if (Screen_Type != MACHINE_PLUS)
        StartSound(synthptr, (long) SNDBUFLEN*2, NULL);
    taskrec.vblCount = 1; // Re-trigger next VBL
}
```

### 3. Waveform Data Sources
The game used pre-calculated lookup tables:
- `sine_wave[256]` - Sine wave lookup table (Sound.c:60)
- `expl_rands[128]` - Random values for explosions (Sound.c:62)
- `thru_rands[128]` - Random values for thrust (Sound.c:63)
- `hiss_rands[256]` - Random values for hissing sounds (Sound.c:64)

### 4. Sound Generation Techniques

#### Fire Sound (Sound.c:124-151)
Used phase accumulation through a sine table with decreasing frequency:
```asm
@loop move.b 0(wave, pos), (A0)  ; Read from sine table
      addq.w #2, A0               ; Skip byte (interleaved)
      add.b D1, pos               ; Advance phase by frequency
```

#### Explosion Sounds (Sound.c:153-177)
Created by alternating amplitude values with random-length runs:
```asm
@biglp eor.w #0xFF00, D0  ; Flip between positive/negative
       moveq #0, D2
       move.b (pers)+, D2  ; Get random run length
       asr.w #1, D2        ; Divide by 2
```

#### Thrust Sound (Sound.c:179-206)
Generated low-frequency noise by repeating random values:
```asm
move.b (pers)+, D0  ; Get random value
lsr.w #1, D0        ; Shift right (reduce amplitude)
lsl.w #8, D0        ; Shift to high byte
; Then write D0 multiple times for low frequency
```

#### Shield Sound (Sound.c:236-246)
Alternated between two frequencies using square waves:
```c
freq = SHLD_FREQ;        // Base frequency 50
if (hi = !hi) freq += 2; // Alternate between 50 and 52
unclear_tone(freq, 96);  // Generate square wave
```

### 5. Priority System
Sounds had priorities to prevent less important sounds from interrupting critical ones:
```c
static int priorities[] = {NO_PRIOR, FIRE_PRIOR, EXP1_PRIOR, THRU_PRIOR,
    BUNK_PRIOR, SOFT_PRIOR, SHLD_PRIOR, FUEL_PRIOR,
    EXP2_PRIOR, EXP3_PRIOR, CRACK_PRIOR, FIZZ_PRIOR,
    ECHO_PRIOR}; // Sound.c:86-89
```
- Ship explosion (EXP2_SOUND): Priority 100 - highest
- Bunker explosion (EXP1_SOUND): Priority 90
- Firing (FIRE_SOUND): Priority 70

### 6. Buffer Format
The 370-byte buffer used 8-bit unsigned samples (0x80 = silence):
```asm
move.l #0x80808080, D0  ; Fill with center value (silence)
```
Every other byte was used, suggesting stereo or hardware requirements:
```asm
move.b 0(wave, pos), (A0)
addq.w #2, A0  ; Skip alternate bytes
```

### 7. Timing and Synchronization
- Sounds were updated every VBL (16.67ms)
- The `soundlock` variable prevented race conditions (Sound.c:49)
- Mac Plus had special timing compensation with `SOFFSET` (Sound.c:369)

## Sound Types Reference

From GW.h:150-153:
```c
enum {NO_SOUND = 0, FIRE_SOUND, EXP1_SOUND, THRU_SOUND, BUNK_SOUND,
    SOFT_SOUND, SHLD_SOUND, FUEL_SOUND,
    EXP2_SOUND, EXP3_SOUND, CRACK_SOUND, FIZZ_SOUND, ECHO_SOUND};
```

This low-level approach gave precise control over waveform generation but required manual implementation of every sound effect through assembly code manipulation of the audio buffer.