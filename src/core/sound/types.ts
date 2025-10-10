/**
 * TypeScript interfaces for the sound system
 * Phase 1: Minimal types for Redux integration
 */

import type { SoundType } from '@/core/sound-shared'

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

/**
 * Sound types available in the engine
 */
export type GameSoundType =
  | 'silence'
  | 'fire'
  | 'thruster'
  | 'shield'
  | 'explosionBunker'
  | 'explosionShip'
  | 'explosionAlien'
  | 'bunker'
  | 'soft'
  | 'fuel'
  | 'crack'
  | 'fizz'
  | 'echo'
