/**
 * @fileoverview Utility for creating blank control matrices
 */

/**
 * Creates a blank control matrix with all controls set to false.
 * Optionally allows specific controls to be overridden.
 *
 * @param source - A source control matrix to use as a template
 * @param overrides - Optional partial control matrix to override specific controls
 * @returns A complete control matrix with all controls false except overrides
 */
export function blankControls<T extends Record<string, boolean>>(
  source: T,
  overrides?: Partial<T>
): T {
  const blank = {} as T
  const keys = Object.keys(source) as (keyof T)[]

  // Set all controls to false
  for (const key of keys) {
    blank[key] = (overrides?.[key] ?? false) as T[keyof T]
  }

  return blank
}
