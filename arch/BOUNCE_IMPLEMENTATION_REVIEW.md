# Bounce Implementation Review and Recommendation

This document outlines the analysis of the ship's bounce physics implementation in the TypeScript port compared to the original C code, specifically focusing on `src/core/ship/physics/checkForBounce.ts` and the corresponding logic in `src/core/ship/shipSlice.ts`.

## Summary

The modern TypeScript implementation correctly separates the concerns of collision detection and state mutation, which is a good architectural practice.

-   **Physics Calculation (`shipSlice.ts`):** The core physics logic within the `bounceShip` reducer is a **high-fidelity and accurate port** of the original C code. It faithfully reproduces the dot-product-based calculations, thresholds, and scaling factors, ensuring the "feel" of a bounce is authentic.
-   **Collision Detection (`checkForBounce.ts`):** The overall strategy for detecting a bounce collision is robust. It correctly identifies that a bounce should only occur from a *new* collision with a bounce wall, and it properly erases the ship post-bounce to prevent immediate fatal collisions.

However, there is one significant discrepancy in the collision detection logic that leads to incorrect gameplay behavior.

## Significant Discrepancy: Finding the Closest Wall

The most critical issue lies within the `findClosestBounceWall` function in `checkForBounce.ts`.

### The Problem

-   **Original C Code:** The game used a proper geometric function (`pt2line`) to calculate the true perpendicular distance from the ship's center to each potential bounce wall (line segment). This correctly identifies the closest wall, regardless of its length or the ship's position along it.
-   **Current TS Implementation:** The code simplifies this by calculating the distance from the ship to the **midpoint** of each wall segment.

This simplification is incorrect and leads to erroneous behavior. For example, consider a scenario where the ship hits the very end of a long wall segment. The midpoint of this long wall could be very far away. A nearby shorter wall, which the ship is not colliding with, could have a closer midpoint. The current algorithm would incorrectly select the shorter wall to calculate the bounce normal from, resulting in a bounce in a completely wrong and unpredictable direction.

### Recommendation

To ensure the gameplay is consistent with the original and that the physics behave predictably, the `findClosestBounceWall` function must be updated.

**Replace the midpoint distance calculation with a proper point-to-line-segment distance algorithm.**

This will involve calculating the perpendicular distance from the ship's global coordinates (`globalx`, `globaly`) to each line segment defined by `(line.startx, line.starty)` and `(line.endx, line.endy)`. This will guarantee that the bounce physics are applied based on the correct wall that the ship is actually colliding with.
