/**
 * Sound system constants from the original Continuum game
 * Based on GW.h and Sound.c from the original source
 */

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
export const SOUND_PRIORITIES: Record<SoundType, number> = {
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