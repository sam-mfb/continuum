/**
 * Sound module exports
 * AudioWorklet-based sound service (Phase 1)
 */

// Export the sound service factory
export { createSoundService } from './service'

// Export types
export type { SoundService, GameSoundType } from './types'

// Export constants and types from shared
export * from '@/core/sound-shared'
