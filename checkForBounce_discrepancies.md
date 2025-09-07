# checkForBounce Implementation Discrepancies

Comparison between TypeScript implementation (`src/core/ship/physics/checkForBounce.ts`) and original C code (`orig/Sources/Play.c`)

## Major Discrepancies

### 1. Pre-existing Collision Check (CRITICAL DIFFERENCE)
The TypeScript implementation has an additional check that's NOT in the original:
```typescript
// Step 1: Check if there's already a collision before adding bounce walls
const preExistingCollision = checkFigure(screen, {...})
// ...
// Step 4: Only bounce if the collision is NEW (caused by bounce walls, not ghost walls)
const collision = !preExistingCollision && collisionAfterBounce
```
The original C code doesn't have this logic - it simply checks for collision after rendering bounce walls and bounces if there's any collision.

### 2. Global Position Calculation Timing
- **Original**: Calculates `globalx/globaly` INSIDE `bounce_ship()` (lines 302-303)
- **TypeScript**: Calculates them at the beginning of `checkForBounce()` (lines 50-51)

This could be significant because the ship's position might have changed between these points in execution.

### 3. Distance Calculation Method
- **Original**: Uses `pt2line()` function to calculate actual distance from ship to line (line 306)
- **TypeScript**: Uses simplified distance to line midpoint (lines 159-170)

This is a significant algorithmic difference that could affect which wall is selected as "closest".

### 4. Bounce Physics Implementation
- **Original**: Directly modifies `dx/dy` velocities in `bounce_ship()` with complex dot product calculations (lines 314-327)
- **TypeScript**: Just dispatches a `ship/bounceShip` action with the norm value

The actual physics calculation is presumably in the reducer, but this represents a different separation of concerns.

### 5. Norm Calculation
- **Original**: Passes `unbouncex/unbouncey` to `getstrafedir()` (line 313)
- **TypeScript**: The `getStradeDir()` function uses `targetX/targetY` parameters but seems to implement different logic

### 6. getStradeDir() Implementation Issues
The TypeScript version appears to have several problems:
- Line 196: Checks `line.type === 1` for vertical walls, but the slope tables suggest more complex handling
- Lines 200-201: References `LINE_KIND.BOUNCE` but the original checks this differently
- The bounce direction table indexing logic looks oversimplified

## Minor Discrepancies

### 7. Ship Erasure Timing
Both versions erase the ship after bounce detection, but the TypeScript version returns the screen with erased ship while the original doesn't return anything.

### 8. Unbounce Position Update
- **Original**: Updates `unbouncex/unbouncey` directly when no bounce (lines 284-285)
- **TypeScript**: Dispatches a `ship/noBounce` action (lines 120-126)

## Significance Assessment

**Most Critical**: The pre-existing collision check (#1) fundamentally changes the bounce detection logic. This could cause the ship to not bounce when it should (if there's already a ghost wall collision).

**High Impact**: The distance calculation (#3) and norm calculation (#5, #6) differences could cause incorrect bounce directions.

**Medium Impact**: The global position timing (#2) could cause subtle physics bugs.

**Low Impact**: The architectural differences (#4, #7, #8) are mostly organizational and shouldn't affect behavior if the reducers are implemented correctly.

## Conclusion

The implementation appears to have deviated significantly from the original, particularly in collision detection logic and geometric calculations. These differences could lead to incorrect bounce behavior compared to the original game.