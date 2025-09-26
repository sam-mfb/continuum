/**
 * TypeScript interfaces for the sound system
 * Phase 1: Minimal types for Redux integration
 */

import type { SoundType } from './constants'

/**
 * Represents the current state of the sound system
 * Mirrors the original's use of currentsound, priority, and soundlock
 */
export type SoundState = {
  currentSound: SoundType // Currently playing sound (Sound.c:51)
  priority: number // Priority of current sound (Sound.c:51)
  enabled: boolean // Whether sound is enabled
  volume: number // Master volume (0-1)
  activeSource: AudioBufferSourceNode | null // Currently playing audio source
}

import type { GameSoundType } from './soundEngine'

/**
 * The main sound engine interface
 * Exposes only the methods needed by external consumers
 */
export type SoundEngine = {
  /**
   * Set the master volume level
   * @param volume - Volume level between 0.0 (muted) and 1.0 (full volume)
   * @throws Logs an error if volume is not a valid number between 0.0 and 1.0
   */
  setVolume: (volume: number) => void
  start: () => void // Start audio playback
  stop: () => void // Stop audio playback
  play: (soundType: GameSoundType, onEnded?: () => void) => void // Play a sound
  resumeContext: () => Promise<void> // Resume suspended audio context
}
