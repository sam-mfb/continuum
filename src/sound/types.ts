/**
 * TypeScript interfaces for the sound system
 * Based on the original Continuum sound architecture
 */

import type { SoundType } from './constants';

/**
 * Represents the current state of the sound system
 * Mirrors the original's use of currentsound, priority, and soundlock
 */
export type SoundState = {
  currentSound: SoundType;              // Currently playing sound (Sound.c:51)
  priority: number;                     // Priority of current sound (Sound.c:51)
  enabled: boolean;                     // Whether sound is enabled
  volume: number;                       // Master volume (0-1)
  activeSource: AudioBufferSourceNode | null;  // Currently playing audio source
}

/**
 * A playable sound instance
 */
export type PlayableSound = {
  play: () => AudioBufferSourceNode;    // Start playing, returns source for stopping
}

/**
 * The main sound engine interface
 */
export type SoundEngine = {
  audioContext: AudioContext;           // Web Audio API context
  masterGain: GainNode;                 // Master volume control
  createThrustSound: () => PlayableSound;  // Factory for thrust sound
  setVolume: (volume: number) => void;  // Set master volume
  // Additional sound factories will be added here
}

/**
 * Lookup table data matching the original arrays
 */
export type LookupTables = {
  thruRands: Uint8Array;    // thru_rands[128] (Sound.c:63)
  explRands?: Uint8Array;   // expl_rands[128] (Sound.c:62) - for future use
  hissRands?: Uint8Array;   // hiss_rands[256] (Sound.c:64) - for future use
  sineWave?: Uint8Array;    // sine_wave[256] (Sound.c:60) - for future use
}