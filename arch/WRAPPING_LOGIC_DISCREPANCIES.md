# Analysis of World-Wrapping Logic Discrepancies

This document outlines the specific discrepancies between the original C code and the TypeScript port that cause bunkers to disappear and wall collisions to fail when the player's viewport wraps around the world map.

---

## Discrepancy 1: Bunker Culling (`doBunks`) - RESOLVED

The TypeScript implementation was missing a crucial second rendering pass that the original game used to handle wrapped bunker drawing.

**Update:** This issue has been resolved by adding the second rendering pass for bunkers, and they now draw correctly.

---

## Discrepancy 2: Wall Collision Culling (`blackTerrain`)

The issue is that bounce walls lose their collision when the viewport is wrapped. The walls are drawn correctly visually, but the ship passes through them. This indicates that the function responsible for drawing the *invisible collision surfaces* is failing, even though the visual rendering is working.

The function `blackTerrain` is used for this collision rendering. The discrepancy lies in how the second, world-wrapping pass of this function is implemented.

### Original C Implementation (`Terrain.c`, lines 77-82)

The original code uses a `for` loop for its second pass. The loop's continuation condition correctly handles the wrapped coordinates.

```c
// `right` has been updated to a wrapped coordinate (e.g., a negative number)
// The loop starts from the beginning of the wall list (`p = kindptrs[thekind]`)
// It continues as long as the wall's start coordinate is less than the wrapped boundary
for(p = kindptrs[thekind]; p && p->startx < right; p = p->next)
    if (/* visibility check */)
        BLACK_LINE_Q(p, screenx-worldwidth, screeny);
```

The key is the condition `p->startx < right`. When the screen is wrapped, `right` is a negative number (e.g., `-938`). The loop correctly processes all walls with negative coordinates, but stops as soon as it encounters a wall with a positive coordinate (e.g., `100`), because `100 < -938` is false.

### TypeScript Discrepancy (`blackTerrain.ts`, lines 77-88)

The TypeScript port attempts to replicate this logic with a `while` loop and an `if...break` statement.

```typescript
// `wrappedRight` is the equivalent of the C code's updated `right`
const wrappedRight = right - worldwidth
let lineId: string | null = firstLineId

while (lineId !== null) {
  const line: LineRec | undefined = organizedWalls[lineId]
  if (!line) break
  
  // THIS IS THE BUG:
  // This condition prematurely terminates the loop.
  if (line.startx >= wrappedRight) break 

  if (/* visibility check */) {
      // ... draw wrapped line ...
  }
  lineId = line.nextId
}
```

While `line.startx >= wrappedRight` is logically the inverse of `p->startx < right`, this implementation is failing in practice. When the screen wraps, `wrappedRight` becomes a negative number. The loop starts from the beginning of the wall list, which typically contains walls with small, positive `startx` coordinates. The condition `line.startx >= wrappedRight` (e.g., `100 >= -938`) evaluates to `true` on the very first wall, causing the `break` statement to execute immediately.

**Result:** The second pass, which is supposed to draw the collision surfaces for the wrapped part of the screen, does nothing. This is why you can see the walls (drawn by a different, correct function) but pass through them (because this function failed to draw their collision surfaces).

### Proposed Fix

The fix is to restructure the second pass to more faithfully match the logic and intent of the original C code's `for` loop. The loop should iterate through the walls from the beginning and only draw the ones that meet the criteria, without breaking prematurely.

```typescript
// in src/core/walls/render/blackTerrain.ts

// ... (end of the first pass) ...

// World wrapping - second pass with adjusted coordinates
// This pass is to draw the far-left side of the world when the
// viewport is on the far-right.
const wrappedRight = viewport.r - worldwidth
const wrappedScrx = viewport.x - worldwidth

// Re-initialize lineId to the start of the list for the second pass,
// matching the `p = kindptrs[thekind]` initialization in the C `for` loop.
let lineId: string | null = firstLineId

while (lineId !== null) {
  const line: LineRec | undefined = organizedWalls[lineId]
  if (!line) break

  // This is the continuation condition from the C `for` loop: `p->startx < right`.
  // If a line's start is beyond the wrapped right boundary, we can stop.
  if (line.startx >= wrappedRight) {
    break
  }

  // This is the visibility check from the C `if` statement.
  if (
    (line.starty >= top || line.endy >= top) &&
    (line.starty < bot || line.endy < bot)
  ) {
    // This corresponds to the `BLACK_LINE_Q` macro call.
    const drawFunc = blackRoutines[line.newtype]
    if (drawFunc) {
      newScreen = drawFunc({
        line,
        scrx: wrappedScrx, // Use the wrapped screen coordinate
        scry: viewport.y
      })(newScreen)
    }
  }

  lineId = line.nextId
}

return newScreen
```

This revised structure correctly separates the loop's continuation condition (`line.startx < wrappedRight`) from the per-line visibility check, exactly as the original C code does. This will ensure the collision surfaces for wrapped walls are drawn correctly.