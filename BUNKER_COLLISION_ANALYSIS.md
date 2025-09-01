# Bunker Collision Implementation Analysis

This document outlines the discrepancies found between the new TypeScript implementation of bunker collision detection (`src/shots/checkBunkerCollision.ts`) and the original C code (`orig/Sources/Play.c`).

## 1. Bounding Box Check Logic

The most significant difference lies in how bunkers are checked against the shot's bounding box. This is the likely cause of observed collision inconsistencies.

*   **Original C Code (`Play.c:767-770`):**
    The C code uses a two-step loop process. The first loop advances a pointer to the first bunker whose x-coordinate is not less than the shot's left boundary. The second loop then iterates from that bunker, checking for collisions, and stops when a bunker's x-coordinate is no longer less than the shot's right boundary.

    ```c
    // Play.c:767-769
    for (bp=bunkers; bp->x < left; bp++)
        ;
    for (; bp->x < right; bp++)
        // ... collision checks
    ```

*   **TypeScript Code (`checkBunkerCollision.ts:31-41`):**
    The TypeScript implementation uses a single `for` loop. It iterates through all bunkers, explicitly skipping those to the left of the boundary (`continue`) and breaking the loop entirely when it encounters a bunker to the right of the boundary (`break`).

    ```typescript
    // checkBunkerCollision.ts:31-41
    for (let index = 0; index < bunkers.length; index++) {
      // ...
      if (bunker.x >= right) {
        break; // Early exit
      }
      if (bunker.x < left) {
        continue; // Skip
      }
      // ...
    }
    ```

### Discrepancy Analysis

The TypeScript code represents a more modern and arguably more correct implementation of the intended optimization (efficiently checking a sorted list). However, the original C code's logic is subtly different. The second loop condition `bp->x < right` checks if the bunker's *center* is to the left of the shot's right boundary. A more accurate check would account for the bunker's radius.

Because the TypeScript implementation is a logical reinterpretation rather than a direct line-for-line port of the C code's looping structure, it behaves differently. This can lead to missed collisions for bunkers located near the edges of the shot's bounding box where the original game might have registered a hit due to its specific implementation quirk.

## 2. `xyindistance` Implementation

This function checks if a point is within a given circular distance.

*   **Original C Code (`Play.c:1215-1233`):**
    The original code uses 68k assembly to perform the calculation `x*x + y*y <= dist*dist`. The `bgt.s` (branch if greater than) instruction effectively results in an inclusive less-than-or-equal-to comparison.

*   **TypeScript Code (`xyindistance.ts`):**
    The TypeScript code faithfully emulates the original assembly logic, resulting in the same `x*x + y*y <= dist*dist` check.

### Discrepancy Analysis

There is **no functional discrepancy** in this function. The TypeScript implementation is a correct and precise emulation of the original's behavior.

## 3. `legalAngle` Implementation

This function checks if a shot is coming from a valid angle to damage a directional bunker.

*   **Original C Code (`Play.c:898-924`):**
    The C code relies on a proprietary Macintosh Toolbox function, `PtToAngle`, to determine the angle between the bunker and the shot. It then normalizes this angle to check if it falls within the bunker's 180-degree forward-facing arc.

*   **TypeScript Code (`legalAngle.ts`):**
    The TypeScript code uses the standard `Math.atan2` function to calculate the angle, converts it to degrees, and then performs a similar normalization and arc-checking logic.

### Discrepancy Analysis

While the high-level logic is the same, the underlying mathematical functions (`PtToAngle` vs. `Math.atan2`) are different. This can introduce minor floating-point precision differences. For shots that are exactly on the edge of the legal angle threshold, these small differences could potentially lead to a different outcome (hit or no-hit) compared to the original game.
