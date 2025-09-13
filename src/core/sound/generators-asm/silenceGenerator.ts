/**
 * Silence Generator
 *
 * Simple generator that outputs silence (center value)
 * Used when no sound is playing
 */

import type { SampleGenerator } from '../sampleGenerator'
import { CHUNK_SIZE, CENTER_VALUE } from '../sampleGenerator'

export const createSilenceGenerator = (): SampleGenerator => {
  const generateChunk = (): Uint8Array => {
    const output = new Uint8Array(CHUNK_SIZE)
    output.fill(CENTER_VALUE)
    return output
  }

  const reset = (): void => {
    // No state to reset
  }

  const hasEnded = (): boolean => {
    // Silence never ends, it's continuous
    return false
  }

  const start = (): void => {
    // Nothing to start
  }

  const stop = (): void => {
    // Nothing to stop
  }

  return {
    generateChunk,
    reset,
    hasEnded,
    start,
    stop
  } as SampleGenerator & { start: () => void; stop: () => void }
}
