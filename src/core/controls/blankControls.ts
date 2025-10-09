/**
 * @fileoverview Utility for creating blank control matrices
 */

import type { ControlMatrix } from './types'

/**
 * Creates a blank control matrix with all controls set to false.
 * Optionally allows specific controls to be overridden.
 *
 * @param source - A source control matrix to use as a template
 * @param overrides - Optional partial control matrix to override specific controls
 * @returns A complete control matrix with all controls false except overrides
 */
export function blankControls(
  source: ControlMatrix,
  overrides?: Partial<ControlMatrix>
): ControlMatrix {
  const blank = {} as ControlMatrix
  const keys = Object.keys(source) as (keyof ControlMatrix)[]

  // Set all controls to false
  for (const key of keys) {
    blank[key] = overrides?.[key] ?? false
  }

  return blank
}
