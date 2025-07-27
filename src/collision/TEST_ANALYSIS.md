# `checkFigure` Test Suite Analysis

This document outlines corrections and improvements for the `checkFigure.test.ts` test suite.

## Summary

The test suite is strong, especially in covering basic collisions and the core background-masking logic. However, the overflow tests are based on a misunderstanding of the check region, and a key piece of logic—the per-row rotation of the background mask—is missing.

## 1. Flawed Overflow Tests

The current overflow tests (9, 10, 11) incorrectly assume the 48-pixel check region starts at the sprite's `x` coordinate. The original code starts the check from the 16-bit **word boundary** that `x` falls into.

- **Test 10 (`No overflow collision beyond 48 pixels`) is incorrect.**
  - **Current:** `x=17`, screen pixel at `x=48`, expects `false`.
  - **Problem:** The check region for `x=17` starts at the word boundary `x=16` and covers pixels `[16, 64)`. The pixel at `x=48` is *inside* this region.
  - **Correction:** The test should expect `true`. To test for no collision, the screen pixel should be placed at `x=64` or greater.

- **Test 11 (`Partial overflow`) is incorrect.**
  - **Current:** Mask at `x=25`, screen pixel at `x=40`, expects `true`.
  - **Problem:** The mask's pixels at `x=25` occupy screen coordinates `[25, 56]`. The pixel at `x=40` is within this range, but the test comment implies an overflow is being tested, which isn't quite right. A clearer test would be to position the mask at `x=24` so its pixels occupy `[24, 55]`, which still collides with `x=40`. The current test is technically correct but the description is misleading. A better test for "no collision" would be to place the pixel at `x=23`.

## 2. Missing Coverage: Background Mask Rotation

The original assembly code contains `ror.l #1, back` in its main loop. This instruction means the background-ignoring mask **shifts by one pixel for each row of the sprite**. This is a subtle but critical piece of behavior that is not currently tested.

The existing tests (5 and 6) correctly verify that the background is ignored for single-line sprites. However, they do not verify the correct behavior for multi-line sprites where the masking pattern changes for each line.

### Why This Is a Behavioral Test, Not an Implementation Test

We are not testing the `ror` instruction itself, but its **observable effect** on collision detection for multi-line sprites. A bug where the implementation fails to rotate the mask for subsequent rows would still pass the existing single-line tests but would fail to detect valid collisions for any sprite taller than one pixel.

### Example Scenario Not Covered

Consider a 2-pixel-tall sprite being drawn at `(x:0, y:0)`:
- **For its first row (at screen y=0):** The background mask is `0x55555555` (`0101...`). It correctly ignores screen pixels at even positions (`x=0, 2, 4...`).
- **For its second row (at screen y=1):** A correct implementation rotates the mask to `0x2AAAAAAA` (`00101010...`). It now ignores screen pixels at `x=2, 4, 6...`. Crucially, it **no longer ignores the pixel at x=0**.

A buggy implementation might incorrectly reuse the original `0x55555555` mask for the second row and fail to detect a collision at `(x:0, y:1)`.

### Recommendation

Add a new test case to verify this multi-line behavior:

1.  Use a two-row mask (e.g., `[0xFFFFFFFF, 0xFFFFFFFF]`).
2.  Set up the screen with the standard dithered background pattern.
3.  Place a single object pixel on the screen at `(x:0, y:1)`.
4.  Call `checkFigure` for the 2-row mask at position `(x:0, y:0)`.
5.  **Assert `true`**. The collision should be detected on the second row of the mask, proving that the background-masking pattern was correctly updated for that row.
