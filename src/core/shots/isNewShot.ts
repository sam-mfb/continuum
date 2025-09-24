import type { ShotRec } from './types'

export type NewShotResult = {
  numShots: number
  newShots: ShotRec[]
}

/**
 * Detects if a new shot has been created by comparing previous and current shot arrays.
 *
 * A "new shot" is defined as a slot that previously had lifecount === 0 being replaced
 * with different shot data. The new shot might still have lifecount === 0 (if it died
 * immediately on spawn due to wall collision), but other properties will have changed.
 *
 * @param prevState - Previous array of shots
 * @param currentState - Current array of shots
 * @returns Object with numShots (count of new shots) and newShots (array of the new shot records)
 */
export function isNewShot(
  prevState: ShotRec[],
  currentState: ShotRec[]
): NewShotResult {
  const newShots: ShotRec[] = []

  // Arrays must be same length for valid comparison
  if (prevState.length !== currentState.length) {
    return { numShots: 0, newShots }
  }

  for (let i = 0; i < prevState.length; i++) {
    const prev = prevState[i]
    const curr = currentState[i]

    if (!prev || !curr) {
      continue
    }

    // Check if a dead slot was replaced with new shot data
    if (prev.lifecount === 0) {
      // Compare key properties that would change with a new shot
      // Even if the new shot dies immediately (lifecount=0), its origin,
      // position, and velocity will be different from the old dead shot
      const hasChanged =
        prev.x !== curr.x ||
        prev.y !== curr.y ||
        prev.x8 !== curr.x8 ||
        prev.y8 !== curr.y8 ||
        prev.h !== curr.h ||
        prev.v !== curr.v ||
        prev.origin.x !== curr.origin.x ||
        prev.origin.y !== curr.origin.y ||
        prev.strafedir !== curr.strafedir ||
        prev.btime !== curr.btime

      if (hasChanged) {
        newShots.push(curr)
      }
    }
  }

  return {
    numShots: newShots.length,
    newShots
  }
}
