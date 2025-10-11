/**
 * Modern multi-channel sound service exports
 *
 * Phase 2: Multi-channel mixer with up to 8 simultaneous sounds (all SFX)
 *
 * Provides the same API as the single-channel service but with support
 * for simultaneous sound playback using priority-based channel allocation.
 */

// Main service factory
export { createModernSoundService } from './service'

// Export types (users typically import from @/core/sound/types for SoundService)
export type { MAX_CHANNELS } from './types'
