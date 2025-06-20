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

/**
 * The main sound engine interface
 * Phase 1: Minimal shell implementation
 */
export type SoundEngine = {
  audioContext: AudioContext // Web Audio API context
  masterGain: GainNode // Master volume control
  setVolume: (volume: number) => void // Set master volume
  start: () => void // Start method (shell)
  stop: () => void // Stop method (shell)
}
