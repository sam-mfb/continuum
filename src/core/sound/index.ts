/**
 * Sound module exports
 * AudioWorklet-based sound service (Phase 1)
 */

// Export the sound service
export { createSoundService, type SoundService } from './service'

// Export constants and types from shared
export * from '@/core/sound-shared'

// Export sound types (for test panel)
export type { GameSoundType } from './types'
