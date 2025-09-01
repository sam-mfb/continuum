# Discrepancy Report: Bunker Collision Logic

This document outlines key logical discrepancies between our modern TypeScript implementation and the original game's behavior that affect shot collision detection.

## ~~Issue: Strict Inequality in Bunker Collision Bounding Box~~ (Secondary Issue)

The primary discrepancy lay in the y-axis bounding box check within the bunker collision detection routine. Our implementation used a strict inequality (`<`, `>`), whereas the original game's logic was consistently inclusive (`<=`, `>=`), especially in collision detection routines.

This caused a bug where a bunker was ignored if its center `y` coordinate fell exactly on the top or bottom edge of the shot's bounding box. While this was a valid discrepancy, fixing it did not resolve the core issue, indicating it was a secondary factor.

---

## Issue: Stale Pixel Coordinates in New Shots (Root Cause)

A critical discrepancy exists in how a new shot's position is handled immediately after creation. Our implementation fails to synchronize the pixel coordinates (`x`, `y`) from the high-precision sub-pixel coordinates (`x8`, `y8`), leading to the use of stale data in subsequent collision checks.

This is the root cause of shots missing directional bunkers at their edges, as the trajectory calculation for the `legalAngle` check becomes incorrect.

### How the Discrepancy Occurs

1.  **Shot Creation (`initShipshot`):** When a new shot is fired, we reuse an old `ShotRec` object. We correctly update its sub-pixel position (`x8`, `y8`) but the pixel coordinates (`x`, `y`) remain unchanged from the shot's *previous* life.

2.  **Original Game's Synchronization:** The original C code called `get_life` immediately after creating a shot. The first action within `get_life` was to synchronize the pixel coordinates from the sub-pixel data, ensuring all subsequent calculations used the correct, current position.

    *   **Code Citation: Original Game (`orig/Sources/Terrain.c`, line 151-153)**
        ```c
        get_life(sp, ignoreline)
        register shotrec *sp;
        ...
        {
            ...
            sp->x = sp->x8 >> 3;  /* Synchronization of pixel coordinates */
            sp->y = sp->y8 >> 3;
            ...
        }
        ```

3.  **Modern Implementation's Omission:** Our `getLife` function calculates the correct pixel coordinates but stores them in local variables, never updating the `shot` object itself.

    *   **Code Citation: Modern Implementation (`src/shots/getLife.ts`, line 140)**
        ```typescript
        export function getLife(shot: ShotRec, ...): GetLifeResult {
          ...
          const x = shot.x8 >> 3; // `shot.x` is NOT updated
          const y = shot.y8 >> 3; // `shot.y` is NOT updated
          ...
        }
        ```

### Impact on Collision Detection

The stale `shot.x` and `shot.y` values are used later in `checkBunkerCollision` to determine the shot's trajectory for the `legalAngle` check.

*   **Code Citation: Modern Implementation (`src/shots/checkBunkerCollision.ts`, line 80)**
    ```typescript
    const shotPrevX = shot.x - (shot.h >> 3); // `shot.x` is stale
    const shotPrevY = shot.y - (shot.v >> 3); // `shot.y` is stale
    ```

Because the pixel coordinates are from a previous, unrelated shot, the calculated trajectory is wrong. The `legalAngle` function then incorrectly concludes the bunker is being hit from an invalid angle (e.g., from behind), causing the collision to be ignored. This perfectly explains the observed bug with directional bunkers.