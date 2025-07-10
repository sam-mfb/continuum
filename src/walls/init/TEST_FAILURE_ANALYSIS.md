# Wall Initialization Test Failure Analysis

This document analyzes each failing test and explains why it failed based on the original C implementation.

## 1. organizeWallsByKind Failures (3 tests)

### Failed Tests:

- creates correct kindPointers for each wall type
- handles empty wall array
- handles walls of only one kind

### Root Cause:

The tests expect `kindPointers` to have empty strings for wall kinds that don't exist, but the implementation returns `undefined`.

### Original C Implementation:

```c
for (kind = L_NORMAL; kind < L_NUMKINDS; kind++)
{
    last = &kindptrs[kind];
    for (line=lines; line->type; line++)
        if (line->kind == kind)
        {
            *last = line;
            last = &line->next;
        }
    *last = NULL;  // Always sets NULL even if no walls of this kind
}
```

### What's Wrong:

The C code always initializes `kindptrs[kind]` to NULL for every kind, even if no walls of that kind exist. The JS implementation only sets kindPointers when walls of that kind are found, leaving others as undefined.

### Proposed Solution:

Initialize all kind pointers to `null`, even for kinds with no walls. This requires updating the type definition to allow `null`.

```typescript
// Update the type in organizeWallsByKind:
const kindPointers: Partial<Record<LineKind, string | null>> = {}

// Initialize all to null, then set actual values:
for (let kind = LINE_KIND.NORMAL; kind < LINE_KIND.NUMKINDS; kind++) {
  kindPointers[kind] = null
}

// Then the existing logic sets actual wall IDs where walls exist

// At the end, cast to the full type:
return {
  organizedWalls,
  kindPointers: kindPointers as Record<LineKind, string | null>
}

// Also update the WallsState type:
export type WallsState = {
  // ...
  kindPointers: Record<LineKind, string | null>
  // ...
}
```

## 2. detectWallJunctions Failures (7 tests)

### Failed Tests:

- finds junctions where wall endpoints are within 3 pixels
- avoids duplicate junctions at same position
- sorts junctions by x-coordinate
- handles walls with identical endpoints
- detects junctions at both start and end points of walls
- handles walls with no junctions

### Root Cause:

The junction detection is creating too many junctions. The deduplication logic uses a 3-pixel threshold box but the implementation isn't correctly preventing duplicates.

### Original C Implementation:

```c
junctions[0].x = 20000;  // Initialize with sentinel
numjunctions = 0;
lastj = junctions;
// ... for each wall endpoint ...
for (j=junctions; j < lastj; j++)
    if (j->x <= x+3 && j->x >= x-3 &&
        j->y <= y+3 && j->y >= y-3)
        break;
if (j == lastj)  // Only add if no junction found within threshold
{
    lastj->x = x;
    lastj->y = y;
    (++lastj)->x = 20000;  // Maintain sentinel at end
    numjunctions++;
}
```

### What's Wrong:

The C code checks if ANY existing junction is within the 6x6 pixel box (±3 pixels). If found, it doesn't add a new junction. The current implementation's threshold check logic is incorrect - it's not properly detecting when junctions are "close enough" to be considered the same. Also, the C code uses 20000 as a sentinel value to mark the end of the junction array, which we're not using.

### Proposed Solution:

Fix the duplicate detection to properly check if a junction already exists within the 6x6 pixel box. The conditional should be after the loop, matching the C pattern. While we don't need the 20000 sentinel in JavaScript (we use array.length), we should maintain the same deduplication logic:

```typescript
const RANGE = 3 // ±3 pixels creates a 6x6 box
let found = false
for (const junction of junctions) {
  if (Math.abs(junction.x - x) <= RANGE && Math.abs(junction.y - y) <= RANGE) {
    found = true
    break
  }
}
if (!found) {
  junctions.push({ x, y })
}
```

Note: The C code's use of 20000 is for array bounds management which JavaScript handles automatically.

## 3. findCloseWallPairs Failures (4 tests)

### Failed Tests:

- finds wall pairs within 3 pixel threshold
- checks both endpoints of each wall
- avoids duplicate pairs
- correctly measures endpoint distances

### Root Cause:

The function is finding duplicate pairs (e.g., [wall1, wall2] and [wall2, wall1]) and the distance calculation is off. Most critically, it's not returning the endpoint indices that the C code passes to `one_close`.

### Original C Implementation:

```c
for (line=lines; line->type; line++)
{
    while (first->endx < line->startx - 3)
        first++;
    for (i=0; i<2; i++)
    {
        x1 = (i ? line->endx : line->startx);
        y1 = (i ? line->endy : line->starty);
        for (line2=first; line2->startx < x1 + 3; line2++)
            for (j=0; j<2; j++)
            {
                x2 = (j ? line2->endx : line2->startx) - 3;
                y2 = (j ? line2->endy : line2->starty) - 3;
                if (x1 > x2 && y1 > y2 &&
                        x1 < x2 + 6 && y1 < y2 + 6)
                    one_close(line, line2, i, j);
            }
    }
}
```

### What's Wrong:

1. The C code naturally avoids some duplicates by its nested loop structure (line2 starts from 'first')
2. The C code offsets x2/y2 by -3 then checks if x1/y1 is within a 6x6 box, which is different from checking if points are within 3 pixels of each other
3. **CRITICAL**: The implementation doesn't pass the endpoint indices to oneClose, but the C code does

### Proposed Solution:

Return endpoint indices with each pair and implement the same offset-box logic as the C code:

```typescript
// Return type should include endpoint indices
export function findCloseWallPairs(
  walls: LineRec[]
): Array<[LineRec, LineRec, number, number]> {
  // ...

  // Adjust the check to match C logic:
  const x2 = endpoint2 ? wall2.endx : wall2.startx
  const y2 = endpoint2 ? wall2.endy : wall2.starty

  // C code offsets by -3 then checks 6x6 box
  if (
    x1 > x2 - THRESHOLD &&
    y1 > y2 - THRESHOLD &&
    x1 < x2 + THRESHOLD &&
    y1 < y2 + THRESHOLD
  ) {
    // Store endpoint indices with the pair for oneClose
    pairs.push([wall1, wall2, endpoint1, endpoint2])
  }
}

// And processCloseWalls must pass all 4 parameters:
const result = oneCloseFn(wall1, wall2, endpoint1, endpoint2)
```

Note: The tests using dependency injection will need to update their mock function signatures to accept 4 parameters.

## 4. updateWallOptimization Failures (3 tests)

### Failed Tests:

- applies h1/h2 updates to correct walls by ID
- preserves walls without updates
- handles empty updates array

### Root Cause:

The function is setting initial h1/h2 values when it should only apply updates passed to it.

### Original C Implementation:

```c
// This happens in close_whites(), not in a separate function:
for (line=lines; line->type; line++)
{
    line->h1 = simpleh1[line->newtype];
    line->h2 = line->length + simpleh2[line->newtype];
}
```

### What's Wrong:

The test expects `updateWallOptimization` to ONLY apply the updates passed in the `updates` parameter. However, the implementation is also setting initial h1/h2 values based on wall type. This initialization should happen elsewhere.

### Proposed Solution:

Create a separate pure function for initial h1/h2 setting and remove this logic from `updateWallOptimization`:

```typescript
/**
 * Sets initial h1/h2 optimization values on walls based on their type.
 * These values indicate safe regions for combined white+black drawing.
 *
 * @see Junctions.c:297-300 - Initial h1/h2 assignment in close_whites()
 */
export function setInitialOptimization(walls: LineRec[]): LineRec[] {
  return walls.map(wall => ({
    ...wall,
    h1: simpleh1[wall.newtype] ?? 0,
    h2: wall.endx - wall.startx + (simpleh2[wall.newtype] ?? 0) // length + adjustment
  }))
}

// updateWallOptimization should only apply updates:
export function updateWallOptimization(
  walls: LineRec[],
  updates: Array<{ wallId: string; h1?: number; h2?: number }>
): LineRec[] {
  // Just copy walls and apply updates, no initial values
  const wallMap = new Map(walls.map(w => [w.id, { ...w }]))

  for (const update of updates) {
    const wall = wallMap.get(update.wallId)
    if (wall) {
      if (update.h1 !== undefined) wall.h1 = update.h1
      if (update.h2 !== undefined) wall.h2 = update.h2
    }
  }

  return Array.from(wallMap.values())
}

// Update the orchestrator:
export function closeWhites(walls: LineRec[]): {
  whites: WhiteRec[]
  updatedWalls: LineRec[]
} {
  // Step 1: Set initial h1/h2 optimization values
  const wallsWithInitialOpt = setInitialOptimization(walls)

  // Step 2: Find pairs of walls that are close to each other
  const wallPairs = findCloseWallPairs(wallsWithInitialOpt)

  // Step 3: Process each close wall pair to generate patches
  const { patches, wallUpdates } = processCloseWalls(wallPairs, oneClose)

  // Step 4: Apply any additional h1/h2 updates from close processing
  const updatedWalls = updateWallOptimization(wallsWithInitialOpt, wallUpdates)

  return { whites: patches, updatedWalls }
}
```

## 5. mergeOverlappingWhites Failures (2 tests)

### Failed Tests:

- handles consecutive overlapping whites
- removes merged whites from result

### Root Cause:

The merge logic isn't properly handling consecutive merges and removal.

### Original C Implementation:

```c
for (wh=whites; wh->x < 20000; wh++)
    if (wh->x == (wh+1)->x && wh->y == (wh+1)->y &&
        wh->ht == 6 && (wh+1)->ht == 6)
    {
        newdata = whitestorage + whitesused;
        whitesused += 6;
        for (i=0; i<6; i++)
            newdata[i] = wh->data[i] & (wh+1)->data[i];
        wh->data = newdata;
        for (movewh = wh+1; movewh->x < 20000; movewh++)
            *movewh = movewh[1];  // Shift all following whites left
        numwhites--;
    }
```

### What's Wrong:

1. The C code modifies the array in-place, shifting elements left after a merge
2. It only merges adjacent whites in the array (wh and wh+1)
3. The implementation needs to handle the case where multiple consecutive whites merge into one

### Proposed Solution:

Use a deep copy approach that more faithfully mimics the C code's in-place modification:

```typescript
function mergeOverlappingWhites(whites: WhiteRec[]): WhiteRec[] {
  const result = whites.map(w => ({ ...w, data: [...w.data] })) // deep copy
  let i = 0
  while (i < result.length - 1) {
    if (
      result[i].x === result[i + 1].x &&
      result[i].y === result[i + 1].y &&
      result[i].ht === 6 &&
      result[i + 1].ht === 6
    ) {
      // Merge data by AND-ing
      for (let j = 0; j < 6; j++) {
        result[i].data[j] = result[i].data[j] & result[i + 1].data[j]
      }
      // Shift array left (remove the merged element)
      result.splice(i + 1, 1)
      // Don't increment i to check for multiple consecutive merges
    } else {
      i++
    }
  }
  return result
}
```

## 6. oneClose Failures (6 tests)

### Failed Tests:

- generates correct patches for north-north junctions
- generates correct patches for north-northeast junctions
- generates correct patches for northeast-northeast junctions
- generates correct patches for east-east junctions
- calculates h1/h2 updates for optimization
- handles walls at different endpoints (start vs end)

### Root Cause:

The function IS implemented, but it's being called incorrectly. The critical issue is that `closeWhites` and `processCloseWalls` are not passing the endpoint indices to `oneClose`.

### Original C Implementation:

```c
// In close_whites(), the C code calls:
one_close(line, line2, i, j);  // 4 parameters: walls + which endpoints are close
```

### What's Wrong:

1. **The call chain is broken**:

   - `findCloseWallPairs` finds which endpoints are close but doesn't return them
   - `processCloseWalls` calls `oneClose` with only 2 parameters instead of 4
   - `oneClose` tries to figure out which endpoints are close internally, processing ALL close pairs instead of just one

2. **This causes the tests to fail because**:
   - The C code processes one specific endpoint pair per call
   - Our code tries to process all endpoint pairs in one call
   - The test expectations are based on single endpoint pair processing

### Proposed Solution:

Fix the entire call chain to pass endpoint indices:

```typescript
// 1. Update oneClose signature to accept endpoint indices
export function oneClose(
  wall1: LineRec,
  wall2: LineRec,
  endpoint1: number, // 0 for start, 1 for end
  endpoint2: number  // 0 for start, 1 for end
): {
  patches: WhiteRec[]
  wall1Updates: { h1?: number; h2?: number }
  wall2Updates: { h1?: number; h2?: number }
} {
  // Remove the internal endpoint detection loop
  // Process only the specified endpoint pair

  // Calculate directions from newtype and endpoints
  let dir1 = 9 - wall1.newtype
  if (endpoint1) dir1 = (dir1 + 8) & 15

  let dir2 = 9 - wall2.newtype
  if (endpoint2) dir2 = (dir2 + 8) & 15

  // Rest of the switch logic...
}

// 2. Update processCloseWalls to pass endpoint indices
export function processCloseWalls(
  wallPairs: Array<[LineRec, LineRec, number, number]>,
  oneCloseFn: (wall1: LineRec, wall2: LineRec, ep1: number, ep2: number) => {...}
) {
  // ...
  const result = oneCloseFn(wall1, wall2, endpoint1, endpoint2)
}
```

## 7. whiteHashMerge Failures (2 tests)

### Failed Tests:

- finds whites within tolerance of junctions
- skips whites too close to world edges

### Root Cause:

The junction matching logic and edge detection are incorrect.

### Original C Implementation:

```c
for (wh=whites; wh->x < worldwidth - 8; wh++)
    if (wh->ht == 6 && no_close_wh(wh) && wh->x > 8)
    {
        while (j > junctions && j->x >= wh->x)
            j--;
        while (j->x <= wh->x && j->y != wh->y)
            j++;
        if (j->x == wh->x && j->y == wh->y)
        {
            // Apply hash pattern...
        }
    }
```

### What's Wrong:

1. The C code looks for EXACT matches (j->x == wh->x && j->y == wh->y), not within tolerance
2. The edge check is `wh->x < worldwidth - 8` and `wh->x > 8`, not a tolerance-based check
3. The junction search algorithm assumes both arrays are sorted by x

### Proposed Solution:

1. Change to exact position matching instead of tolerance
2. Fix the edge detection to match C code

```typescript
// In whiteHashMerge:
const safeWhites = whites.filter(
  w => w.x > 8 && w.x < worldWidth - 8 && w.ht === 6
)

// For each white, find exact junction match
for (const white of safeWhites) {
  const junctionIndex = junctions.findIndex(
    j => j.x === white.x && j.y === white.y
  )

  if (junctionIndex !== -1) {
    // Apply hash pattern
    // Remove the junction from the array
    junctions.splice(junctionIndex, 1)
  }
}
```

## Summary

Most failures fall into these categories:

1. **Initialization Logic**: Functions doing too much (like updateWallOptimization setting initial values)
2. **Exact vs Threshold Matching**: Some functions use exact position matching while tests expect threshold-based matching
3. **Array Manipulation**: The C code modifies arrays in-place, which needs careful translation to immutable JS
4. **Incorrect Call Chain**: oneClose is implemented but called with wrong parameters
5. **Subtle Algorithm Differences**: The close wall detection uses a specific offset+box check, not simple distance
