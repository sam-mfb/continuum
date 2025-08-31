# Discrepancy in Bunker Array Iteration Logic

## Summary
There is a critical discrepancy between the original C implementation and the current TypeScript code in how the list of bunkers is iterated over during the ship's death sequence. This is the likely cause of inconsistent bunker destruction when the ship crashes.

The original C code stops iterating through the bunker array when it encounters a bunker with a negative `rot` value, which acts as a sentinel value to mark the end of the active bunker list. The TypeScript implementation iterates through the entire array, regardless of the `rot` value.

## Original C Implementation (`kill_ship` in `Play.c`)
The C code uses a `for` loop that explicitly checks `bp->rot >= 0` as its continuation condition. This ensures that the loop only processes active bunkers and terminates as soon as it finds the first inactive or "terminator" bunker record.

```c
kill_ship()
/* destroy the ship and do all necessary explosions, etc. */
{
	register bunkrec *bp;
	
	dead_count = DEAD_TIME;
	flaming = thrusting = refueling = shielding = FALSE;
	for(bp=bunkers; bp->rot >= 0; bp++) // <-- Loop terminates on rot < 0
		if (bp->alive &&
			xyindist(bp->x - globalx, bp->y - globaly, SKILLBRADIUS) &&
			(legal_angle(bp->rot, bp->x, bp->y, globalx, globaly) ||
									bp->kind >= BUNKROTKINDS) )
		{
			kill_bunk(bp);
			break; // <-- Only kills one bunker
		}
	start_death();
}
```

## Current TypeScript Implementation (`shipMoveBitmap.ts`)
The TypeScript code uses a standard `for` loop that iterates from the beginning to the end of the `bunkers` array based on its `length`. It does not check for a negative `rot` value as a termination condition.

```typescript
// (b) Death blast - destroy ONE nearby bunker (Play.c:338-346)
// Only kills bunkers in field of view for directional types
const bunkers = store.getState().planet.bunkers
const BUNKROTKINDS = 2 // Kinds 0-1 are directional, 2+ are omnidirectional

for (let index = 0; index < bunkers.length; index++) { // <-- Loop iterates through the entire array
  const bunker = bunkers[index]!
  if (
    bunker.alive &&
    xyindist(bunker.x - globalx, bunker.y - globaly, SKILLBRADIUS) &&
    (bunker.kind >= BUNKROTKINDS || 
     legalAngle(bunker.rot, bunker.x, bunker.y, globalx, globaly))
  ) {
    store.dispatch(killBunker({ index }))
    // ...
    break // Correctly breaks after finding one
  }
}
```

## The Problem
The planet data loaded from `release_galaxy.bin` contains bunker records that are not used in a given level. These records are "terminated" by having a `rot` value of -1.

By iterating over the entire array, the TypeScript code fails to respect this sentinel value. This can lead to several issues:
1.  **Incorrect Behavior:** The loop may process inactive or invalid bunker data that should have been ignored.
2.  **Performance:** It needlessly iterates over empty slots at the end of the array.
3.  **Deviation from Original Logic:** It is not a faithful reproduction of the original game's logic, which can lead to subtle and hard-to-diagnose bugs like the one observed.

## Recommended Fix
The TypeScript loop should be modified to replicate the original C code's termination logic by adding a check for `bunker.rot < 0`.

```typescript
// Recommended Change
for (let index = 0; index < bunkers.length; index++) {
  const bunker = bunkers[index]!
  
  // Add this check to match original logic
  if (bunker.rot < 0) {
    break;
  }

  if (
    bunker.alive &&
    // ... rest of the conditions
  ) {
    // ...
    break;
  }
}
```
