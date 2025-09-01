# Discrepancy Report: Bunker Collision Bounding Box

This document outlines a key logical discrepancy between our modern TypeScript implementation and the original game's behavior, which is the likely cause of shots failing to register on the edges of bunkers.

## Issue: Strict Inequality in Bunker Collision Bounding Box

The primary discrepancy lies in the y-axis bounding box check within the bunker collision detection routine. Our implementation uses a strict inequality (`<`, `>`), whereas the original game's logic was consistently inclusive (`<=`, `>=`), especially in collision detection routines.

This causes a bug where a bunker is ignored if its center `y` coordinate falls exactly on the top or bottom edge of the shot's bounding box.

### Code Citation: Modern Implementation

The issue is in `src/shots/checkBunkerCollision.ts`. The comment correctly cites the original line, but the logic was implemented with strict inequality, which is incorrect.

```typescript
// File: src/shots/checkBunkerCollision.ts, line 70

// Y-axis bounding box check (Play.c:770)
// Original: bp->y < bot && bp->y > top
// Include bunkers where y is between top and bot (exclusive)
if (!(bunker.y > top && bunker.y < bot)) {
  index++
  continue
}
```

The expression `!(bunker.y > top && bunker.y < bot)` evaluates to `bunker.y <= top || bunker.y >= bot`, which incorrectly excludes bunkers exactly on the boundary.

### Analysis of Original Game Logic

The original game's collision detection philosophy, seen in routines like `xyindist`, consistently included boundaries. For example, the bounding box checks in `xyindist` (from `orig/Sources/Play.c:1188-1196`) used assembly instructions (`blt.s`, `bgt.s`) that effectively created an inclusive check (`<=`, `>=`).

A C-style implementation that correctly reflects the original's inclusive behavior would be:

```c
/* Conceptual C code based on original game behavior */

if (bp->y < top || bp->y > bot) {
    /* This check is incorrect and misses boundaries */
    continue; 
}

if (bp->y <= top || bp->y >= bot) {
    /* This check is correct and includes boundaries */
    continue;
}
```

Our implementation's use of strict inequality is inconsistent with the original's established pattern of inclusive boundary checks and is the source of the collision detection failure at the edges of bunkers. To align with the original game, the check should be made inclusive.
