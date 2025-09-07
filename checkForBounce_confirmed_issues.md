# Confirmed Issues in checkForBounce Implementation

After analysis and review, the following are confirmed legitimate discrepancies between the TypeScript implementation (`src/core/ship/physics/checkForBounce.ts`) and the original C code (`orig/Sources/Play.c`) that require fixing:

## 1. Distance Calculation Method (CRITICAL)

**Issue**: The TypeScript implementation uses an incorrect simplified distance calculation.

- **Original (Play.c:306)**: Uses `pt2line()` function to calculate the actual perpendicular distance from ship to each line segment
- **Current TS (lines 159-170)**: Calculates distance to the midpoint of each wall segment

**Impact**: This can cause the wrong wall to be selected for bounce calculations. For example, if the ship hits the end of a long wall, a nearby shorter wall with a closer midpoint could be incorrectly selected, resulting in bounces in completely wrong directions.

**Fix Required**: Implement proper point-to-line-segment distance calculation.

## 2. getStradeDir() Implementation Issues

**Issue**: The TypeScript implementation of `getStradeDir()` has several problems compared to the original `getstrafedir()` in `Terrain.c:242-263`:

### 2a. Incorrect Vertical Wall Handling
- **Line 196**: Uses `line.type === 1` for vertical walls, but doesn't properly handle all cases
- **Lines 200-201**: Incorrectly checks `line.kind === LINE_KIND.BOUNCE` when this should be handled differently

### 2b. Simplified Slope Calculations  
- The slope table implementation (lines 212-217) appears oversimplified compared to the original's handling of different line types

### 2c. Bounce Direction Table Indexing
- The table index calculation and bounds checking (lines 228-235) doesn't match the complexity of the original implementation

**Impact**: Incorrect bounce normal calculations, leading to wrong bounce directions.

**Fix Required**: Accurately port the `getstrafedir()` logic from `Terrain.c`.

## 3. Missing pt2line Function

**Issue**: The original uses a `pt2line()` function (referenced at Play.c:298) which calculates the actual distance from a point to a line segment. This function is not implemented in the TypeScript port.

**Impact**: Without this function, proper wall selection cannot be implemented.

**Fix Required**: Implement the `pt2line()` function or equivalent point-to-line-segment distance calculation.

## Summary

These issues primarily affect the accuracy of bounce physics:
- Issue #1 causes the wrong wall to be selected for bouncing
- Issue #2 causes incorrect bounce directions even when the right wall is selected  
- Issue #3 is a prerequisite for fixing Issue #1

All three issues need to be addressed to achieve accurate bounce behavior matching the original game.