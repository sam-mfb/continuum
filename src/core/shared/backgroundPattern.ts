import type { Alignment } from './alignment'
import { BACKGROUND_PATTERNS } from '@core/screen/constants'

// Re-export from screen constants for convenience
export { BACKGROUND_PATTERNS }

/**
 * Get the appropriate background pattern for a given alignment.
 *
 * @param alignment The alignment value (0 or 1)
 * @returns The 32-bit background pattern (0xaaaaaaaa or 0x55555555)
 */
export function getBackgroundPattern(alignment: Alignment): number {
  const [pattern0, pattern1] = BACKGROUND_PATTERNS
  return alignment === 0 ? pattern0 : pattern1
}
