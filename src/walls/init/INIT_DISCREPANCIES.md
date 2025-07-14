# `initWalls` Discrepancies

This file documents the discrepancies between the TypeScript implementation of `initWalls` and its helper functions in `initWalls.ts` and the original C code in `Junctions.c`.

## `initWalls` vs. `init_walls`

The C code's `init_walls` function is a single, monolithic function. The TypeScript code is refactored into smaller, more focused functions (`initWalls`, `organizeWallsByKind`, `findFirstWhiteWalls`, `detectWallJunctions`), which is a good architectural change.

### `organizeWallsByKind` vs. `Junctions.c:43-53`

- **Logic:** The logic of iterating through wall kinds and creating linked lists is the same.
- **Implementation:** The C code uses pointers (`linerec *last`), while the TypeScript code uses string IDs (`nextId`) to link walls. This is a necessary and correct adaptation for a JavaScript environment that avoids direct memory manipulation.
- **Discrepancy:** No logical discrepancy. The implementation difference is intentional.

### `findFirstWhiteWalls` vs. `Junctions.c:54-61`

- **Logic:** The logic of creating a linked list of "white" walls (those with `newtype === NEW_TYPE.NNE`) is identical.
- **Implementation:** The C code uses the `nextwh` pointer, while the TypeScript code uses the `nextwhId` property. This is consistent with the other linked list implementations.
- **Discrepancy:** No logical discrepancy.

### `detectWallJunctions` vs. `Junctions.c:63-93`

- **Performance:** The C code uses a `lastj` pointer to optimize junction detection, only scanning the array of junctions up to the last one added. The TypeScript implementation iterates over the entire `junctions` array for each wall endpoint, which is less performant but functionally equivalent for the expected number of walls.
- **Sentinel Values:** The C code adds 18 sentinel junctions at the end of the array without initializing their `y` values. The TypeScript code initializes `y` to `0` for these sentinels, making the behavior more predictable.
- **Data Structures:** The C code uses a fixed-size array for junctions, while TypeScript uses a dynamic array. This is a natural difference between the two languages.
- **Sorting:** Both use an insertion sort to order junctions by their x-coordinate. The implementations are slightly different but achieve the same result.

## Summary

The TypeScript implementation of `initWalls` is a faithful recreation of the original C code's logic. The primary differences are intentional adaptations to modern JavaScript conventions, such as using IDs instead of pointers and breaking down a large function into smaller, more testable units. The minor discrepancies in performance and sentinel value initialization are acceptable and do not change the final outcome of the wall initialization process.

# `initWhites` Discrepancies

This file documents the discrepancies between the TypeScript implementation of `initWhites` and its helper functions in `initWhites.ts` and the original C code in `Junctions.c`.

## `initWhites` vs. `init_whites`

The C code's `init_whites` function is a single, monolithic function. The TypeScript code is refactored into smaller, more focused functions (`initWhites`, `sortWhitesByX`, `mergeOverlappingWhites`, `addSentinelWhites`), which is a good architectural change.

### `sortWhitesByX` vs. `Junctions.c:212-222`

- **Logic:** The logic of sorting whites by x-coordinate and then y-coordinate is identical.
- **Implementation:** Both use an insertion sort. The TypeScript implementation is a standard and correct adaptation of the C code's algorithm.
- **Discrepancy:** No logical discrepancy.

### `mergeOverlappingWhites` vs. `Junctions.c:227-240`

- **Memory Management:** The C code allocates new memory for the merged white piece (`whitestorage`) and then shifts the array elements to remove the redundant white. The TypeScript code modifies the `data` of the first white piece in-place and then uses `splice` to remove the second one. This is a more idiomatic and memory-efficient approach in JavaScript.
- **Logic:** The core logic of checking for overlapping whites and merging their data with a bitwise AND operation is identical.
- **Discrepancy:** The difference in memory management is an intentional, language-appropriate adaptation.

### `addSentinelWhites` vs. `Junctions.c:224-225`

- **Order of Operations:** This is the most significant discrepancy. The C code adds the 18 sentinel values *before* the merge loop. The merge loop relies on these sentinels to terminate correctly. The TypeScript implementation in `initWhites.ts` adds the sentinels *after* the merge operation. While the TypeScript `while` loop in `mergeOverlappingWhites` has a standard bounds check (`i < result.length - 1`), this is a deviation from the original program flow. It is acceptable because the outcome is the same, but it's a notable difference in implementation.
- **Discrepancy:** The order of sentinel addition is reversed compared to the C code.

## Summary

The TypeScript implementation of `initWhites` correctly reproduces the functionality of the C original. The refactoring into smaller functions improves readability and testability. The key discrepancy is the timing of when sentinel values are added, but this does not negatively impact the final result due to safer loop conditions in JavaScript.

# `normWhites` Discrepancies

This file documents the discrepancies between the TypeScript implementation of `normWhites` and its helper functions in `normWhites.ts` and the original C code in `Junctions.c`.

## `normWhites` vs. `norm_whites`

- **Logic:** The logic for generating standard white pieces for wall endpoints and adding special "glitch-fixing" pieces is identical to the C code.
- **Implementation:** The C code uses a global `whites` array and a counter `numwhites`. The TypeScript implementation builds a local array and returns it, which is a better practice.
- **Discrepancy:** No logical discrepancy.

### `addWhiteWithSentinel` vs. `add_white`

- **Sentinel Handling:** The C code's `add_white` function increments a pointer and then writes a sentinel value (`x = 20000`) to the *next* record. The TypeScript `addWhiteWithSentinel` function cleverly mimics this by pushing a sentinel object to the array after adding a real white.
- **Final Sentinel:** The C code leaves a dangling sentinel after the last call, which is eventually overwritten. The TypeScript `normWhites` function explicitly removes this final sentinel with `slice`, making the cleanup more deliberate.
- **Discrepancy:** The behavior is functionally identical, but the TypeScript implementation is more explicit about its memory management, which is a positive difference.

## Summary

The TypeScript implementation of `normWhites` is a very faithful and well-documented port of the original C code. The differences in implementation are due to language differences (pointers vs. array methods) and result in cleaner, more readable code without altering the core logic.

# `closeWhites` Discrepancies

This file documents the discrepancies between the TypeScript implementation of `closeWhites` and its helper functions in `closeWhites.ts` and the original C code in `Junctions.c`.

## `closeWhites` vs. `close_whites`

The C code's `close_whites` function is a single, monolithic function. The TypeScript code is refactored into smaller, more focused functions (`closeWhites`, `setInitialOptimization`, `findCloseWallPairs`, `processCloseWalls`), which is a good architectural change.

### `setInitialOptimization` vs. `Junctions.c:297-300`

- **Logic:** The logic of setting the initial `h1` and `h2` values on each wall is identical.
- **Implementation:** The C code modifies the `linerec` structs directly. The TypeScript code creates new wall objects with the added properties, following immutable practices.
- **Discrepancy:** No logical discrepancy.

### `findCloseWallPairs` vs. `Junctions.c:302-321`

- **Logic:** The algorithm for finding close wall pairs is identical. It correctly implements the C code's optimization of using a sliding `first` pointer (as `firstIdx`) to avoid re-scanning the entire array.
- **Discrepancy:** No logical discrepancy.

### `processCloseWalls` vs. `Junctions.c:318`

- **State Management:** This is the most significant difference. The C code calls `one_close` which operates on global variables and directly modifies the `linerec` structs via pointers. The TypeScript `processCloseWalls` function instead passes the list of wall pairs to the `oneClose` function. It then takes the returned `wallUpdates` and applies them immutably, creating new wall objects for each update.
- **Discrepancy:** This is a well-executed and necessary adaptation to functional programming principles. It achieves the same result as the C code's stateful approach but in a safer, more predictable manner.

## Summary

The TypeScript implementation of `closeWhites` is a faithful and well-engineered port of the original. The logic is preserved, and the changes made are to adapt the imperative, stateful C code into a more functional, immutable TypeScript style.

# `oneClose` Discrepancies

This file documents the discrepancies between the TypeScript implementation of `oneClose` in `oneClose.ts` and the original C code in `Junctions.c`.

## `oneClose` vs. `one_close`

- **Logic:** The core logic, including the calculation of `dir1` and `dir2`, and the entire multi-level `switch` statement, is identical. The constants and numerical calculations are a direct and faithful port. The intentional fall-through from `case 10` to `case 11` is also correctly preserved with a comment.
- **State Management:** The C code operates on global variables (`whites`, `numwhites`) and modifies `linerec` structs directly via pointers. The TypeScript function is pure: it takes the current `whites` array as an argument and returns an object containing the `newWhites` and any `wallUpdates`. This is a major and positive architectural difference.
- **Helper Functions:** The C code calls `add_white`, `replace_white`, and `replace_white_2` which are defined elsewhere and operate on global state. The TypeScript code implements local, pure versions of these functions (`addWhite`, `replaceWhite`, `replaceWhite2`) that operate on the `currentWhites` array, which is internal to the function. The logic of these helpers correctly mimics the C originals.
- **Discrepancy:** The fundamental logic is identical. The only differences are in the state management strategy, where the TypeScript version uses a functional, immutable approach compared to the C code's global, mutable approach. This is an intentional and beneficial adaptation.

## Summary

The TypeScript implementation of `oneClose` is an exceptionally faithful and well-crafted port of a highly complex C function. The transformation from a stateful, imperative style to a pure, functional style has been done correctly and is the only source of discrepancy.
