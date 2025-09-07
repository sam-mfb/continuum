# Analysis of World-Wrapping Logic Discrepancies

This document outlines the specific discrepancies between the original C code and the TypeScript port that cause bunkers to disappear and wall collisions to fail when the player's viewport wraps around the world map.

The root cause is two distinct bugs in the culling logic, where the TypeScript implementation fails to correctly replicate the original game's world-wrapping strategy.

---

## Discrepancy 1: Bunker Culling (`doBunks`)

The TypeScript implementation is missing a crucial second rendering pass that the original game used to handle wrapped bunker drawing.

### Original C Implementation (`Bunkers.c`)

The original code uses a controller function that calls a drawing function twice when the viewport is near the world's edge.

```c
do_bunkers()
{
	// ... (bunker animation logic) ...
	
    // Call 1: Draw for the primary screen position
	do_bunks(screenx, screeny);

    // Call 2: If near the edge, draw AGAIN for the wrapped position
	if (on_right_side)
		do_bunks(screenx-worldwidth, screeny);
}

// Helper drawing function
do_bunks(scrnx, scrny)
{
	left = scrnx - 48;
	right = scrnx + SCRWTH + 48;
	for (bp=bunkers; bp->rot >= 0; bp++)
		if (bp->alive && bp->x > left && bp->x < right)
        {
            // ... draw bunker ...
        }
}
```

This two-call strategy is simple and effective. The second call, with an offset `screenx`, handles drawing any bunkers from the far-left of the map that should be visible on the right side of the wrapped viewport.

### TypeScript Discrepancy (`doBunks`)

The TypeScript port only implemented the logic of the helper drawing function. It is missing the controller logic that makes the second call.

```typescript
// src/core/planet/render/bunker.ts
export function doBunks(...) {
  return screen => {
    const left = scrnx - 48
    const right = scrnx + SCRWTH + 48
    for (const bp of bunkrec) {
      if (bp->alive && bp.x > left && bp.x < right) {
        // ... draw bunker ...
      }
    }
    // NO SECOND CALL FOR WRAPPING
    return newScreen
  }
}
```

**Result:** Because the second call is missing, bunkers that are on the other side of the wrap boundary are never checked and are therefore never drawn, causing them to "disappear."

---

## Discrepancy 2: Wall Collision Culling (`blackTerrain`)

The TypeScript implementation of the second pass for drawing collidable wall surfaces contains a flawed loop termination condition that is not present in the original.

### Original C Implementation (`Terrain.c`)

The original code uses a `for` loop where the continuation condition correctly handles the wrapped coordinates.

```c
// Second pass for wrapping
right -= worldwidth;
for(p = kindptrs[thekind]; p && p->startx < right; p = p->next)
    if (/* visibility check */)
        BLACK_LINE_Q(p, screenx-worldwidth, screeny);
```

The loop correctly iterates through all lines, and the `p->startx < right` condition ensures it only stops after checking all potentially visible wrapped lines.

### TypeScript Discrepancy (`blackTerrain`)

The TypeScript port uses a `while` loop but adds an incorrect `break` condition that prematurely terminates the loop.

```typescript
// src/core/walls/render/blackTerrain.ts
const wrappedRight = right - worldwidth
let lineId: string | null = firstLineId

while (lineId !== null) {
  const line: LineRec | undefined = organizedWalls[lineId]
  if (!line) break
  
  // THIS IS THE BUG:
  if (line.startx >= wrappedRight) break // This terminates the whole loop

  if (/* visibility check */) {
      // ... draw wrapped line ...
  }
  lineId = line.nextId
}
```

**Result:** When the viewport wraps, `wrappedRight` becomes a negative number. The very first line in the level data typically has a small positive `startx`. The condition `line.startx >= wrappedRight` (e.g., `100 >= -938`) evaluates to `true`, and the `break` statement is executed immediately. This prevents the second pass from drawing *any* of the collidable wall surfaces, causing collision detection to fail.
