/**
 * @fileoverview Utility for merging multiple control sources
 */

/**
 * Merges multiple control matrices using OR logic.
 * Type-safe approach that ensures all control properties are handled.
 *
 * @param controlSets - One or more control matrices to merge
 * @returns A merged control matrix where each control is true if any source has it true
 */
export function mergeControls<T extends Record<string, boolean>>(
  ...controlSets: T[]
): T {
  if (controlSets.length === 0) {
    throw new Error('mergeControls requires at least one control set')
  }

  const result = { ...controlSets[0] } as T
  const keys = Object.keys(result) as (keyof T)[]

  for (const key of keys) {
    result[key] = controlSets.some(
      controls => controls[key]
    ) as unknown as T[keyof T]
  }

  return result
}
